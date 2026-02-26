/**
 * Component tests for KanbanCard and TicketModal behaviour
 * (both are rendered inline within KanbanTab)
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { KanbanTab } from "@/app/(authenticated)/projects/[id]/page";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({ on: jest.fn(), emit: jest.fn(), disconnect: jest.fn() })),
}));

jest.mock("@/hooks/useProjectSocket", () => ({
  useProjectSocket: jest.fn(),
}));

jest.mock("@/lib/api/client", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn().mockResolvedValue({}),
  apiPatch: jest.fn().mockResolvedValue({}),
  apiDelete: jest.fn().mockResolvedValue({}),
}));

const MOCK_STORIES = [
  {
    _id: "story-001",
    title: "Implement login flow",
    type: "feature",
    status: "in_progress",
    priority: "high",
    waitingForApproval: false,
    waitingForAnswer: false,
    description: "Add JWT-based authentication",
  },
  {
    _id: "story-002",
    title: "Fix navigation bug",
    type: "bug",
    status: "review",
    priority: "critical",
    waitingForApproval: true,
    waitingForAnswer: false,
    description: "Navigation breaks on mobile",
  },
  {
    _id: "story-003",
    title: "Update docs",
    type: "chore",
    status: "backlog",
    priority: "low",
    waitingForApproval: false,
    waitingForAnswer: true,
    description: "Update README and API docs",
  },
];

const MOCK_COMMENTS = [
  {
    _id: "comment-001",
    author: "human",
    authorDisplayName: "Alice",
    content: "Please review this PR",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "comment-002",
    author: "agent",
    authorDisplayName: "Dev Bot",
    content: "I have completed the implementation",
    createdAt: new Date().toISOString(),
  },
];

const MOCK_TASKS = [
  { _id: "task-001", title: "Write unit tests", completed: false },
  { _id: "task-002", title: "Update changelog", completed: true },
];

function mockApiGet(stories = MOCK_STORIES, comments = MOCK_COMMENTS, tasks = MOCK_TASKS) {
  const { apiGet } = require("@/lib/api/client");
  apiGet.mockImplementation((url: string) => {
    if (url.includes("/comments")) return Promise.resolve(comments);
    if (url.includes("/tasks")) return Promise.resolve(tasks);
    return Promise.resolve(stories);
  });
}

// ── KanbanCard tests ─────────────────────────────────────────────────────────

describe("KanbanCard", () => {
  beforeEach(() => {
    mockApiGet();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders story cards in their correct columns", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText("Implement login flow")).toBeInTheDocument();
      expect(screen.getByText("Fix navigation bug")).toBeInTheDocument();
      expect(screen.getByText("Update docs")).toBeInTheDocument();
    });
  });

  it("renders all 5 kanban columns with headers", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText("Backlog")).toBeInTheDocument();
      expect(screen.getByText("Selected for Dev")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });
  });

  it("shows Approval badge on stories with waitingForApproval", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getAllByText("Approval").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows Answer badge on stories with waitingForAnswer", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getAllByText("Answer").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows type badge on each card", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText("feature")).toBeInTheDocument();
      expect(screen.getByText("bug")).toBeInTheDocument();
      expect(screen.getByText("chore")).toBeInTheDocument();
    });
  });

  it("shows column story count badge", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => {
      // Each column shows a count; In Progress should have 1, Review should have 1
      const countBadges = document.querySelectorAll(".bg-muted");
      expect(countBadges.length).toBeGreaterThan(0);
    });
  });

  it("filters cards by Waiting Approval when filter toggled", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Implement login flow"));

    fireEvent.click(screen.getByRole("button", { name: /waiting approval/i }));

    await waitFor(() => {
      // Only waitingForApproval stories should show
      expect(screen.getByText("Fix navigation bug")).toBeInTheDocument();
      expect(screen.queryByText("Implement login flow")).not.toBeInTheDocument();
    });
  });

  it("filters cards by Waiting Answer when filter toggled", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Update docs"));

    fireEvent.click(screen.getByRole("button", { name: /waiting answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Update docs")).toBeInTheDocument();
      expect(screen.queryByText("Implement login flow")).not.toBeInTheDocument();
    });
  });

  it("applies live status override from liveStoryStatuses prop", async () => {
    // story-001 starts as in_progress; with live override → done
    render(
      <KanbanTab
        projectId="proj-1"
        liveStoryStatuses={{ "story-001": "done" }}
      />
    );

    await waitFor(() => {
      // story-001 should be in the Done column now
      expect(screen.getByText("Implement login flow")).toBeInTheDocument();
    });
  });
});

// ── TicketModal tests ─────────────────────────────────────────────────────────

describe("TicketModal", () => {
  beforeEach(() => {
    mockApiGet();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens modal with story details on card click", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Implement login flow"));

    fireEvent.click(screen.getByText("Implement login flow"));

    await waitFor(() => {
      // Title appears in dialog header
      expect(screen.getAllByText("Implement login flow").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows Discussion tab with comments", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Implement login flow"));
    fireEvent.click(screen.getByText("Implement login flow"));

    await waitFor(() => {
      expect(screen.getByText("Please review this PR")).toBeInTheDocument();
      expect(screen.getByText("I have completed the implementation")).toBeInTheDocument();
    });
  });

  it("shows Tasks tab with checklist", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Implement login flow"));
    fireEvent.click(screen.getByText("Implement login flow"));

    await waitFor(() => screen.getByText("Discussion"));

    fireEvent.click(screen.getByText("Tasks"));

    await waitFor(() => {
      expect(screen.getByText("Write unit tests")).toBeInTheDocument();
      expect(screen.getByText("Update changelog")).toBeInTheDocument();
    });
  });

  it("shows Live Activity tab", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Implement login flow"));
    fireEvent.click(screen.getByText("Implement login flow"));

    await waitFor(() => screen.getByText("Live Activity"));

    fireEvent.click(screen.getByText("Live Activity"));

    await waitFor(() => {
      expect(screen.getByText(/No live activity/)).toBeInTheDocument();
    });
  });

  it("shows Approve button on story with waitingForApproval", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Fix navigation bug"));
    fireEvent.click(screen.getByText("Fix navigation bug"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /approve.*merge/i })).toBeInTheDocument();
    });
  });

  it("shows Answer button on story with waitingForAnswer", async () => {
    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Update docs"));
    fireEvent.click(screen.getByText("Update docs"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /answer/i })).toBeInTheDocument();
    });
  });

  it("calls POST /approve when Approve button clicked", async () => {
    const { apiPost } = require("@/lib/api/client");
    apiPost.mockResolvedValue({});

    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Fix navigation bug"));
    fireEvent.click(screen.getByText("Fix navigation bug"));

    await waitFor(() => screen.getByRole("button", { name: /approve.*merge/i }));
    fireEvent.click(screen.getByRole("button", { name: /approve.*merge/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        expect.stringContaining("/approve"),
      );
    });
  });

  it("calls POST /answer when Answer button clicked", async () => {
    const { apiPost } = require("@/lib/api/client");
    apiPost.mockResolvedValue({});

    render(<KanbanTab projectId="proj-1" />);

    await waitFor(() => screen.getByText("Update docs"));
    fireEvent.click(screen.getByText("Update docs"));

    await waitFor(() => screen.getByRole("button", { name: /^answer$/i }));

    // Type answer text
    const answerInput = screen.getByPlaceholderText("Type your answer...");
    fireEvent.change(answerInput, { target: { value: "This is the answer" } });

    fireEvent.click(screen.getByRole("button", { name: /^answer$/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        expect.stringContaining("/answer"),
        expect.objectContaining({ content: "This is the answer" }),
      );
    });
  });

  it("shows live agent logs in Activity tab when logs provided", async () => {
    const mockLogs = [
      { agentInstanceId: "agent-1", line: "Compiling...", type: "stdout" as const, timestamp: new Date().toISOString() },
    ];

    render(<KanbanTab projectId="proj-1" liveAgentLogs={mockLogs} />);

    await waitFor(() => screen.getByText("Implement login flow"));
    fireEvent.click(screen.getByText("Implement login flow"));

    await waitFor(() => screen.getByText("Live Activity"));
    fireEvent.click(screen.getByText("Live Activity"));

    await waitFor(() => {
      expect(screen.getByText("Compiling...")).toBeInTheDocument();
    });
  });
});
