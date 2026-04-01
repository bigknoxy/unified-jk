import { describe, it, expect } from 'vitest';
import { WorkflowTracker } from './workflow-tracker';

describe('WorkflowTracker', () => {
  it('workflow 4: correlates spans by workflowId across apps', () => {
    const tracker = new WorkflowTracker();
    const workflowId = 'wf-test-001';

    tracker.recordSpan({
      workflowId,
      appId: 'sample-app',
      action: 'documents.opened',
      resource: 'doc-1'
    });

    tracker.recordSpan({
      workflowId,
      appId: 'user-manager',
      action: 'review.approved',
      resource: 'user-77'
    });

    const workflow = tracker.getWorkflow(workflowId);
    expect(workflow).toBeTruthy();
    expect(workflow?.spans).toHaveLength(2);
    expect(workflow?.spans[0].appId).toBe('sample-app');
    expect(workflow?.spans[1].appId).toBe('user-manager');
    expect(workflow?.status).toBe('completed');
  });

  it('workflow 5: notifies listeners for each recorded span', () => {
    const tracker = new WorkflowTracker();
    const workflowId = 'wf-test-002';
    const notifications: number[] = [];

    const unsubscribe = tracker.onChange((workflow) => {
      notifications.push(workflow.spans.length);
    });

    tracker.recordSpan({
      workflowId,
      appId: 'sample-app',
      action: 'workflow.started'
    });

    tracker.recordSpan({
      workflowId,
      appId: 'dashboard',
      action: 'workflow.completed'
    });

    unsubscribe();

    expect(notifications).toEqual([1, 2]);
  });
});
