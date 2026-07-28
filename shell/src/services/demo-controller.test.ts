import { describe, expect, it } from 'vitest';
import { DemoController } from './demo-controller';

describe('DemoController', () => {
  it('starts walkthrough at first step and tracks progress', () => {
    const controller = new DemoController();
    controller.activateScenario('healthcare');

    controller.startWalkthrough();

    expect(controller.isWalkthroughActive()).toBe(true);
    expect(controller.getWalkthroughProgress()).toEqual({ current: 1, total: 5 });
    expect(controller.getCurrentStep()?.title).toBe('Start as Physician');
  });

  it('clamps next/prev step navigation within valid range', () => {
    const controller = new DemoController();
    controller.activateScenario('finance');
    controller.startWalkthrough();

    for (let i = 0; i < 10; i++) {
      controller.nextStep();
    }

    expect(controller.getWalkthroughProgress()).toEqual({ current: 5, total: 5 });
    expect(controller.getCurrentStep()?.title).toBe('Walkthrough Complete');

    for (let i = 0; i < 10; i++) {
      controller.prevStep();
    }

    expect(controller.getWalkthroughProgress()).toEqual({ current: 1, total: 5 });
    expect(controller.getCurrentStep()?.title).toBe('Start as Trader');
  });

  it('notifies listeners on walkthrough state changes', () => {
    const controller = new DemoController();
    const observedSteps: number[] = [];

    controller.activateScenario('government');
    const stop = controller.onChange((state) => {
      observedSteps.push(state.walkthroughStep);
    });

    controller.startWalkthrough();
    controller.nextStep();
    controller.prevStep();
    stop();

    expect(observedSteps).toEqual([0, 1, 0]);
  });
});
