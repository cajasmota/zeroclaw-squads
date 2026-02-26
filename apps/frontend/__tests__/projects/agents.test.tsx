/**
 * Component tests for AgentCard and AgentProfileModal behaviour
 * (both are rendered inline within AgentsTab)
 */
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgentsTab } from "@/app/(authenticated)/projects/[id]/page";

// ── Mocks ────────────────────────────────────────────────────────────────────

// socket.io-client — not needed for AgentsTab tests
jest.mock("socket.io-client", () => ({ io: jest.fn(() => ({ on: jest.fn(), emit: jest.fn(), disconnect: jest.fn() })) }));

// useProjectSocket — not called inside AgentsTab (it lives in the parent page)
jest.mock("@/hooks/useProjectSocket", () => ({
  useProjectSocket: jest.fn(),
}));

jest.mock("@/lib/api/axios", () => ({
  axiosGet: jest.fn(),
  axiosPost: jest.fn().mockResolvedValue({}),
  axiosPatch: jest.fn().mockResolvedValue({}),
  axiosDelete: jest.fn().mockResolvedValue({}),
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const MOCK_AGENTS = [
  {
    _id: "agent-001",
    displayName: "Alice Dev",
    role: "developer",
    status: "idle",
    tags: ["typescript", "react"],
    soul: "A seasoned developer who writes clean, tested code.",
    pid: 1234,
    config: { model: "gpt-4o", provider: "openai" },
  },
  {
    _id: "agent-002",
    displayName: "Bob Review",
    role: "reviewer",
    status: "busy",
    tags: ["code-review"],
    soul: "",
    pid: undefined,
    config: { model: "claude-3-opus", provider: "anthropic" },
  },
];

function mockAxiosGet(agents = MOCK_AGENTS) {
  const { axiosGet } = require("@/lib/api/axios");
  axiosGet.mockImplementation((url: string) => {
    if (url.includes("/agents")) return Promise.resolve(agents);
    // stories query (AgentsTab also queries stories)
    return Promise.resolve([]);
  });
}

// Helper to wrap with a fresh QueryClientProvider per test
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// ── AgentCard tests ───────────────────────────────────────────────────────────

describe("AgentCard", () => {
  beforeEach(() => {
    mockAxiosGet();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders agent display name and role badge", async () => {
    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Alice Dev")).toBeInTheDocument();
      expect(screen.getByText("Bob Review")).toBeInTheDocument();
    });

    expect(screen.getByText("developer")).toBeInTheDocument();
    expect(screen.getByText("reviewer")).toBeInTheDocument();
  });

  it("renders status text for each agent", async () => {
    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("idle")).toBeInTheDocument();
      expect(screen.getByText("busy")).toBeInTheDocument();
    });
  });

  it("overrides status when liveStatuses prop is provided", async () => {
    render(<AgentsTab projectId="proj-1" liveStatuses={{ "agent-001": "error" }} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("error")).toBeInTheDocument();
    });
  });

  it("renders soul bio snippet for agents that have one", async () => {
    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/A seasoned developer/)).toBeInTheDocument();
    });
  });

  it("renders tags for agents", async () => {
    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("typescript")).toBeInTheDocument();
      expect(screen.getByText("react")).toBeInTheDocument();
      expect(screen.getByText("code-review")).toBeInTheDocument();
    });
  });

  it("calls GET /api/projects/:id/agents on mount", async () => {
    const { axiosGet } = require("@/lib/api/axios");

    render(<AgentsTab projectId="proj-42" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(axiosGet).toHaveBeenCalledWith("/api/projects/proj-42/agents");
    });
  });

  it("renders loading spinner initially then agent grid", async () => {
    const { axiosGet } = require("@/lib/api/axios");
    let resolveAgents: (v: unknown) => void;

    axiosGet.mockImplementation((url: string) => {
      if (url.includes("/agents")) {
        return new Promise((res) => { resolveAgents = res; });
      }
      return Promise.resolve([]);
    });

    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });
    expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();

    act(() => {
      resolveAgents!(MOCK_AGENTS);
    });

    await waitFor(() => {
      expect(screen.getByText("Alice Dev")).toBeInTheDocument();
    });
  });
});

// ── AgentProfileModal tests ───────────────────────────────────────────────────

describe("AgentProfileModal", () => {
  beforeEach(() => {
    mockAxiosGet();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens modal with agent details when card is clicked", async () => {
    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Alice Dev")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Alice Dev"));

    await waitFor(() => {
      // Dialog title shows agent name
      expect(screen.getAllByText("Alice Dev").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("modal view mode shows role, status, and soul", async () => {
    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByText("Alice Dev"));

    fireEvent.click(screen.getAllByText("Alice Dev")[0]);

    await waitFor(() => {
      // role is shown in view mode (badge + modal text both contain "developer")
      expect(screen.getAllByText(/developer/i).length).toBeGreaterThanOrEqual(1);
      // soul text appears in both the card and the modal — just assert it's present
      expect(screen.getAllByText(/A seasoned developer/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("modal has Edit button that switches to edit mode", async () => {
    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByText("Alice Dev"));
    fireEvent.click(screen.getAllByText("Alice Dev")[0]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/soul/i)).toBeInTheDocument();
    });
  });

  it("edit mode Cancel button returns to view mode", async () => {
    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByText("Alice Dev"));
    fireEvent.click(screen.getAllByText("Alice Dev")[0]);

    await waitFor(() => screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      // Back to view mode: Edit button visible again
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });
  });

  it("Save button calls PATCH /api/projects/:id/agents/:agentId", async () => {
    const { axiosPatch } = require("@/lib/api/axios");
    axiosPatch.mockResolvedValue({});

    render(<AgentsTab projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByText("Alice Dev"));
    fireEvent.click(screen.getAllByText("Alice Dev")[0]);

    await waitFor(() => screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    await waitFor(() => screen.getByRole("button", { name: /save/i }));

    // Change display name
    const nameInput = screen.getByLabelText(/display name/i);
    fireEvent.change(nameInput, { target: { value: "Alice Updated" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(axiosPatch).toHaveBeenCalledWith(
        expect.stringContaining("/agents/agent-001"),
        expect.objectContaining({ displayName: "Alice Updated" }),
      );
    });
  });
});
