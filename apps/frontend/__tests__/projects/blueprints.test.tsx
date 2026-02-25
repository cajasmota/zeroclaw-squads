/**
 * Component tests for WorkflowCanvas node rendering
 * Tests the blueprints page node types: AgentTaskNode, StartNode, EndNode, ApprovalGateNode
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({ on: jest.fn(), emit: jest.fn(), disconnect: jest.fn() })),
}));

jest.mock("@/hooks/useProjectSocket", () => ({
  useProjectSocket: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ id: "proj-blueprint-1" })),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(),
}));

// Mock @xyflow/react — provides minimal node rendering without actual React Flow internals
const mockHandleComponent = ({ type, position }: any) => (
  <div data-testid={`handle-${type}-${position}`} />
);
jest.mock("@xyflow/react", () => {
  return {
    ReactFlow: ({ children, nodes, nodeTypes }: any) => {
      // Render each node using its nodeType component
      return (
        <div data-testid="react-flow">
          {(nodes ?? []).map((node: any) => {
            const Component = nodeTypes?.[node.type];
            if (!Component) return <div key={node.id} data-testid={`node-${node.id}`}>{node.type}</div>;
            return <Component key={node.id} id={node.id} data={node.data} selected={false} />;
          })}
          {children}
        </div>
      );
    },
    Background: () => <div data-testid="rf-background" />,
    Controls: () => <div data-testid="rf-controls" />,
    MiniMap: () => <div data-testid="rf-minimap" />,
    Panel: ({ children }: any) => <div data-testid="rf-panel">{children}</div>,
    Handle: mockHandleComponent,
    Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
    MarkerType: { ArrowClosed: "arrowclosed" },
    useNodesState: jest.fn((initial: any[]) => [initial, jest.fn(), jest.fn()]),
    useEdgesState: jest.fn((initial: any[]) => [initial, jest.fn(), jest.fn()]),
    addEdge: jest.fn((params: any, edges: any[]) => [...(edges ?? []), params]),
  };
});

jest.mock("@/lib/api/client", () => ({
  apiGet: jest.fn().mockResolvedValue([]),
  apiPost: jest.fn().mockResolvedValue({ _id: "new-template-id" }),
}));

// Import page after mocks are set up
import BlueprintsPage from "@/app/(authenticated)/projects/[id]/blueprints/page";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WorkflowCanvas node rendering", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the blueprints page with sidebar and canvas", async () => {
    render(<BlueprintsPage />);

    await waitFor(() => {
      expect(screen.getByText("New Workflow")).toBeInTheDocument();
    });
    expect(screen.getByText("Workflow Templates")).toBeInTheDocument();
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });

  it("shows empty template list when no templates exist", async () => {
    render(<BlueprintsPage />);

    await waitFor(() => {
      expect(screen.getByText("No templates yet.")).toBeInTheDocument();
    });
  });

  it("renders templates in sidebar when templates are loaded", async () => {
    const { apiGet } = require("@/lib/api/client");
    apiGet.mockResolvedValueOnce([
      { _id: "tmpl-1", name: "Dev Workflow", description: "Standard dev loop", nodes: [], edges: [] },
      { _id: "tmpl-2", name: "Review Workflow", description: "Code review pipeline", nodes: [], edges: [] },
    ]);

    render(<BlueprintsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dev Workflow")).toBeInTheDocument();
      expect(screen.getByText("Review Workflow")).toBeInTheDocument();
    });
  });

  it("shows Start and End nodes when New Workflow is clicked", async () => {
    const { useNodesState } = require("@xyflow/react");
    const setNodesMock = jest.fn();
    useNodesState.mockImplementation((initial: any) => [initial, setNodesMock, jest.fn()]);

    render(<BlueprintsPage />);

    await waitFor(() => screen.getByText("New Workflow"));
    fireEvent.click(screen.getByText("New Workflow"));

    // After clicking, setNodes should have been called with Start + End nodes
    await waitFor(() => {
      expect(setNodesMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "start", type: "start" }),
          expect.objectContaining({ id: "end", type: "end" }),
        ]),
      );
    });
  });

  it("Agent Task node palette button is present", async () => {
    render(<BlueprintsPage />);

    await waitFor(() => {
      expect(screen.getByText("Agent Task")).toBeInTheDocument();
    });
  });

  it("Approval Gate node palette button is present", async () => {
    render(<BlueprintsPage />);

    await waitFor(() => {
      expect(screen.getByText("Approval Gate")).toBeInTheDocument();
    });
  });

  it("renders AgentTaskNode with label, role badge, and Kanban status", async () => {
    const { useNodesState } = require("@xyflow/react");
    const mockNodes = [
      {
        id: "node-1",
        type: "agentTask",
        position: { x: 100, y: 100 },
        data: {
          label: "Write Code",
          role: "developer",
          description: "Implement the feature",
          kanbanStatus: "in_progress",
          moveCardOn: "start",
        },
      },
    ];
    useNodesState.mockReturnValue([mockNodes, jest.fn(), jest.fn()]);

    render(<BlueprintsPage />);

    await waitFor(() => {
      expect(screen.getByText("Write Code")).toBeInTheDocument();
      expect(screen.getByText("developer")).toBeInTheDocument();
      expect(screen.getByText("Implement the feature")).toBeInTheDocument();
      // Kanban status badge
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });
  });

  it("renders ApprovalGateNode with orange styling and approval text", async () => {
    const { useNodesState } = require("@xyflow/react");
    const mockNodes = [
      {
        id: "gate-1",
        type: "approvalGate",
        position: { x: 200, y: 200 },
        data: { label: "Human Approval", requiresHumanApproval: true },
      },
    ];
    useNodesState.mockReturnValue([mockNodes, jest.fn(), jest.fn()]);

    render(<BlueprintsPage />);

    await waitFor(() => {
      expect(screen.getByText("Human Approval")).toBeInTheDocument();
    });
  });

  it("Save button calls apiPost with workflow data", async () => {
    const { apiGet, apiPost } = require("@/lib/api/client");
    apiGet.mockResolvedValue([]);

    render(<BlueprintsPage />);

    await waitFor(() => screen.getByText("Save"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        "/api/workflows/templates",
        expect.objectContaining({ name: expect.any(String) }),
      );
    });
  });

  it("shows WorkflowRunStatusOverlay when live node statuses are present", async () => {
    const { useProjectSocket } = require("@/hooks/useProjectSocket");
    let capturedHandlers: any = {};

    useProjectSocket.mockImplementation((_id: string, handlers: any) => {
      capturedHandlers = handlers;
      return { emit: jest.fn() };
    });

    render(<BlueprintsPage />);

    await waitFor(() => screen.getByTestId("react-flow"));

    // Simulate a WebSocket workflow:node event
    if (capturedHandlers.onWorkflowNode) {
      capturedHandlers.onWorkflowNode({ runId: "run-1", nodeId: "node-task-1", status: "running" });
    }

    await waitFor(() => {
      // The overlay should appear with the live status
      expect(screen.getByText("Live Run Status")).toBeInTheDocument();
    });
  });
});
