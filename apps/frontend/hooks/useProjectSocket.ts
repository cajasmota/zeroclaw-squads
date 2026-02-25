import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface AgentStatusEvent {
  agentInstanceId: string;
  status: string;
}

export interface AgentLogEvent {
  agentInstanceId: string;
  line: string;
  type: "stdout" | "stderr";
  runId?: string;
  timestamp: string;
}

export interface StoryStatusEvent {
  storyId: string;
  status: string;
  workflowNodeStatus?: string;
}

export interface WorkflowNodeEvent {
  runId: string;
  nodeId: string;
  status: string;
}

export interface ApprovalNeededEvent {
  runId: string;
  nodeId: string;
  description: string;
}

interface ProjectSocketHandlers {
  onAgentStatus?: (event: AgentStatusEvent) => void;
  onAgentLog?: (event: AgentLogEvent) => void;
  onStoryStatus?: (event: StoryStatusEvent) => void;
  onWorkflowNode?: (event: WorkflowNodeEvent) => void;
  onApprovalNeeded?: (event: ApprovalNeededEvent) => void;
}

export function useProjectSocket(projectId: string | null, handlers: ProjectSocketHandlers) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!projectId) return;

    const socket = io(typeof window !== "undefined" ? window.location.origin : "", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:project", projectId);
    });

    socket.on("agent:status", (event: AgentStatusEvent) => {
      handlersRef.current.onAgentStatus?.(event);
    });

    socket.on("agent:log", (event: AgentLogEvent) => {
      handlersRef.current.onAgentLog?.(event);
    });

    socket.on("story:status", (event: StoryStatusEvent) => {
      handlersRef.current.onStoryStatus?.(event);
    });

    socket.on("workflow:node", (event: WorkflowNodeEvent) => {
      handlersRef.current.onWorkflowNode?.(event);
    });

    socket.on("approval:needed", (event: ApprovalNeededEvent) => {
      handlersRef.current.onApprovalNeeded?.(event);
    });

    return () => {
      socket.emit("leave:project", projectId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit };
}
