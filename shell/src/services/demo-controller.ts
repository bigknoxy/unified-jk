/**
 * Demo Controller — Manages demo scenario state and role switching
 */

import type { User } from '../types';
import type { DemoScenario } from './demo-scenarios';
import { getScenario, getAllScenarios } from './demo-scenarios';

interface DemoState {
  activeScenario: DemoScenario | null;
  walkthroughStep: number;
  walkthroughActive: boolean;
  originalUser: User | null;
}

export class DemoController {
  private state: DemoState = {
    activeScenario: null,
    walkthroughStep: 0,
    walkthroughActive: false,
    originalUser: null
  };

  private listeners = new Set<(state: DemoState) => void>();

  getActiveScenario(): DemoScenario | null {
    return this.state.activeScenario;
  }

  getAllScenarios(): DemoScenario[] {
    return getAllScenarios();
  }

  activateScenario(scenarioId: string): DemoScenario | null {
    const scenario = getScenario(scenarioId);
    if (!scenario) return null;
    this.state.activeScenario = scenario;
    this.state.walkthroughStep = 0;
    this.state.walkthroughActive = false;
    this.notify();
    return scenario;
  }

  deactivateScenario(): void {
    this.state.activeScenario = null;
    this.state.walkthroughStep = 0;
    this.state.walkthroughActive = false;
    this.notify();
  }

  startWalkthrough(): void {
    this.state.walkthroughActive = true;
    this.state.walkthroughStep = 0;
    this.notify();
  }

  nextStep(): number {
    if (!this.state.activeScenario) return 0;
    const max = this.state.activeScenario.walkthrough.length - 1;
    this.state.walkthroughStep = Math.min(this.state.walkthroughStep + 1, max);
    this.notify();
    return this.state.walkthroughStep;
  }

  prevStep(): number {
    this.state.walkthroughStep = Math.max(this.state.walkthroughStep - 1, 0);
    this.notify();
    return this.state.walkthroughStep;
  }

  getCurrentStep() {
    if (!this.state.activeScenario) return null;
    return this.state.activeScenario.walkthrough[this.state.walkthroughStep] || null;
  }

  getWalkthroughProgress(): { current: number; total: number } {
    const total = this.state.activeScenario?.walkthrough.length || 0;
    return { current: this.state.walkthroughStep + 1, total };
  }

  isWalkthroughActive(): boolean {
    return this.state.walkthroughActive;
  }

  exitWalkthrough(): void {
    this.state.walkthroughActive = false;
    this.notify();
  }

  setOriginalUser(user: User | null): void {
    this.state.originalUser = user;
  }

  getOriginalUser(): User | null {
    return this.state.originalUser;
  }

  onChange(listener: (state: DemoState) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }
}
