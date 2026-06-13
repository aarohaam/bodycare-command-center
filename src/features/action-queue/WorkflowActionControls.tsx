import type { WorkflowActionState } from "../../types";
import { ACTION_PRIORITIES, ACTION_STATUSES } from "../../domain/workflow";

interface WorkflowActionControlsProps {
  workflow: WorkflowActionState;
  onChange: (patch: Partial<WorkflowActionState>) => void;
  compact?: boolean;
}

export function WorkflowActionControls({
  workflow,
  onChange,
  compact = false,
}: WorkflowActionControlsProps) {
  return (
    <div className={`workflow-controls ${compact ? "compact" : ""}`}>
      <label className="workflow-field">
        Owner
        <input
          value={workflow.owner}
          placeholder="Name or role"
          onChange={(event) => onChange({ owner: event.target.value })}
        />
      </label>
      <label className="workflow-field">
        Due date
        <input
          type="date"
          value={workflow.dueDate}
          onChange={(event) => onChange({ dueDate: event.target.value })}
        />
      </label>
      <label className="workflow-field">
        Status
        <select
          value={workflow.status}
          onChange={(event) =>
            onChange({ status: event.target.value as WorkflowActionState["status"] })
          }
        >
          {ACTION_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <label className="workflow-field">
        Priority
        <select
          value={workflow.priority}
          onChange={(event) =>
            onChange({ priority: event.target.value as WorkflowActionState["priority"] })
          }
        >
          {ACTION_PRIORITIES.map((priority) => (
            <option key={priority}>{priority}</option>
          ))}
        </select>
      </label>
      <label className="workflow-field wide">
        Next action
        <textarea
          value={workflow.nextAction}
          placeholder="What should happen next?"
          onChange={(event) => onChange({ nextAction: event.target.value })}
        />
      </label>
      <label className="workflow-field wide">
        Challenge response
        <textarea
          value={workflow.challengeResponse}
          placeholder="Merchant/director reason, exception, or missing context"
          onChange={(event) => onChange({ challengeResponse: event.target.value })}
        />
      </label>
    </div>
  );
}
