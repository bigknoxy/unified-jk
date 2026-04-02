/**
 * Workflow Tracker Service
 * Correlates events across apps using workflowId for cross-app workflow visualization
 */

export interface WorkflowSpan {
  id: string;
  workflowId: string;
  appId: string;
  action: string;
  resource?: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'complete' | 'error';
  metadata?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  title: string;
  startedAt: string;
  completedAt?: string;
  spans: WorkflowSpan[];
  status: 'active' | 'completed' | 'abandoned';
}

const TERMINAL_ACTIONS = new Set([
  'compliance.review.submitted',
  'incident.resolved',
  'onboarding.completed',
  'workflow.completed',
  'review.approved',
  'review.rejected'
]);

export class WorkflowTracker {
  private workflows = new Map<string, Workflow>();
  private activeWorkflowId: string | null = null;
  private listeners: Set<(workflow: Workflow) => void> = new Set();

  startWorkflow(title: string): string {
    const id = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const workflow: Workflow = {
      id,
      title,
      startedAt: new Date().toISOString(),
      spans: [],
      status: 'active'
    };
    this.workflows.set(id, workflow);
    this.activeWorkflowId = id;
    return id;
  }

  setActiveWorkflow(workflowId: string | null): void {
    this.activeWorkflowId = workflowId;
  }

  getActiveWorkflowId(): string | null {
    return this.activeWorkflowId;
  }

  recordSpan(event: {
    workflowId: string;
    appId: string;
    action: string;
    resource?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const workflow = this.workflows.get(event.workflowId);
    if (!workflow) {
      const wf: Workflow = {
        id: event.workflowId,
        title: `Workflow ${event.workflowId}`,
        startedAt: new Date().toISOString(),
        spans: [],
        status: 'active'
      };
      this.workflows.set(event.workflowId, wf);
    }

    const wf = this.workflows.get(event.workflowId)!;
    const span: WorkflowSpan = {
      id: `${event.workflowId}-span-${wf.spans.length}`,
      workflowId: event.workflowId,
      appId: event.appId,
      action: event.action,
      resource: event.resource,
      startTime: Date.now(),
      status: 'complete',
      metadata: event.metadata,
    };

    wf.spans.push(span);

    if (TERMINAL_ACTIONS.has(event.action)) {
      wf.completedAt = new Date().toISOString();
      wf.status = 'completed';
    }

    for (const listener of this.listeners) {
      listener(wf);
    }
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  getActiveWorkflows(): Workflow[] {
    return Array.from(this.workflows.values()).filter(w => w.status === 'active');
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  onChange(listener: (workflow: Workflow) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}
