# **Technical Requirements Document (TRD): Agentic Engineering System (AES)**

## **1\. Executive Summary**

The **AES** is an autonomous, event-driven software development environment using specialized AI agents to transform requirements into code via a reactive, process-based architecture.

* **Branding Configuration:** The system must utilize a global environment variable APP\_NAME (e.g., in .env and NestJS ConfigService). This variable must propagate to the installer script, the Web UI (browser title, headers), and Slack/GitHub integration messages to allow for easy rebranding.  
* This document makes suggestions of UI routes or data models, but they need to be properly defined when this document is analyzed to make the implementation  
* All the implementation needs to be tested with unit tests to ensure it works as expected

## **2\. System Architecture & Lifecycle**

### **2.1 Core Kernel: ZeroClaw (Rust)**

* **Role:** High-performance, low-latency execution engine for agent rimes, written in Rust for memory safety and speed.  
* **Backend Interaction & Orchestration:**  
  * **Process Spawning:** The Backend (NestJS/Node.js) manages the lifecycle of agents using the child\_process.spawn() method. Each agent is executed as a standalone binary with specific CLI flags: \--soul \<path\>, \--identity \<path\>, and \--config \<path\>.  
  * **Signal-Based Activation (The "Poke"):** To avoid high CPU polling, the backend keeps ZeroClaw in a "Sleep-on-Idle" state. When a new event (Slack message, GitHub webhook) is routed to an agent, the Backend sends a **Unix Signal (SIGUSR1)** to the process PID. This triggers the ZeroClaw kernel to wake up, ingest new input, and execute the next reasoning step.  
  * **Standard I/O Streams:**  
    * **Stdin:** Used by the backend to inject real-time system messages or user-pings directly into the agent's current thought stream.  
    * **Stdout/Stderr:** The backend captures these streams. Every line emitted is tagged with a runId and ticketId by the NestJS log-aggregator before being broadcast to the UI.  
  * **Environment Injection:** Sensitive API keys (OpenAI, Anthropic) and project-specific identifiers are injected via environment variables (AES\_PROJECT\_ID, AES\_STORY\_ID, AES\_RUN\_ID) at spawn-time, ensuring ZeroClaw remains stateless regarding credentials.  
  * **Session Persistence:** ZeroClaw maintains a local session.jsonl. The Backend ensures that even if a process is killed to save VPS RAM, the next spawn uses the same \--session path to restore the agent's short-term memory instantly.  
* **State Management:** Agents remain in a low-power idle state (suspended) until a signal is received, allowing dozens of agents to "live" on a single VPS.  
* **Action Tracking:** Every tool call and LLM response is logged to a local transcript.jsonl at the kernel level for auditability and session recovery.  
* **Normalization Engine:** ZeroClaw automatically normalizes AIEOS JSON payloads into optimized system prompts.

### **2.2 Agent Instancing & Snapshots**

* **Snapshot Logic:** When a Template is assigned to a Project, the Backend creates a **unique snapshot** of the Template's definition (Soul, AIEOS Identity, Skills) in the agents collection.  
* **Editing:** Users can edit an instance's Soul or AIEOS configuration directly without affecting the global template.  
* **Sync:** Changes to global templates do not propagate to instances unless manually triggered.

## **3\. Data Models (Suggested \- Subject to Agent Analysis)**

### **3.1 Project Schema (Suggested)**

{  
  "\_id": "ObjectId",  
  "name": "Project Name",  
  "slug": "web-app",  
  "brandColor": "\#3b82f6",  
  "status": "active | archived",  
  "roles": {  
    "librarian": "AgentInstanceID", // Singleton  
    "architect": "AgentInstanceID", // Singleton  
    "pm": "AgentInstanceID",        // Singleton  
    "developer": \["AgentInstanceID"\], // Multi-instance  
    "reviewer": \["AgentInstanceID"\],  // Multi-instance (Mandatory)  
    "optional": \["AgentInstanceID"\]  
  },  
  "config": {  
    "slackToken": "EncryptedString",  
    "repoUrl": "\[https://github.com/org/repo\](https://github.com/org/repo)",  
    "githubApp": {  
      "appId": "String",  
      "privateKey": "EncryptedString",  
      "installationId": "String",  
      "webhookSecret": "EncryptedString"  
    },  
    "inviteUsers": \["U123"\],  
    "llmKeys": {   
      "openai": "EncryptedString",   
      "anthropic": "EncryptedString",  
      "google": "EncryptedString",  
      "ollama\_endpoint": "http://localhost:11434"  
    }  
  }  
}

### **3.2 Agent Instance (Suggested Snapshot)**

{  
  "\_id": "ObjectId",  
  "projectId": "ObjectId",  
  "templateId": "ObjectId",  
  "displayName": "web-ro-gr-1", // Overridden in Wizard or default from template  
  "identifier": "web-app-dev-1",  
  "tags": \["starwars", "droids", "rust-expert"\], // Filtering metadata  
  "pid": "Number",  
  "soul": "soul.md (Markdown String)",  
  "aieos\_identity": "identity.json (AIEOS v1.1 payload)",  
  "config": {  
    "model": "qwen2.5-coder:1.5b",  
    "provider": "ollama",  
    "skills": "skills.yaml (Tool Definitions)",  
    "canWriteCode": "Boolean", // Logic in Section 20  
    "mcpServers": \[{ "name": "github", "config": {} }\]  
  },  
  "status": "idle | busy | error"  
}

## **4\. Project Initialization & Slack Automation**

### **4.1 Minimum Team & Automated Onboarding Sequence**

Every project **MUST** have a minimum team of five agents assigned to the following mandatory roles during creation:

1. **Librarian**: Knowledge authority and codebase indexer (**Singleton**).  
2. **Architect**: Technical design and TRD authoring (**Singleton**).  
3. **PM (Project Manager)**: Backlog management and task coordination (**Singleton**).  
4. **Developer**: Primary implementation and coding (**Multi-instance**).  
5. **Reviewer**: Code audit and standards verification (**Multi-instance**).

Upon project creation, the backend executes:

1. **Directory Setup:** Creates /artifacts/{projectId} workspace and shared git tree.  
2. **Slack Setup:** Creates \#project-{slug} channel.  
   * *Note: A Slack App configuration guide must be provided to users to ensure proper Bot permissions and Webhook settings.*  
3. **Invitations:** Invites users based on **Project Override** list, falling back to **Global Settings**.  
4. **Agent Activation:** Spawns **ALL** agents assigned to the project (mandatory \+ optional) using their specific instance snapshots.  
5. **Greetings:** Backend sends an INITIALIZE\_GREETING event. Agents post self-intros to Slack using the **Brand Color** as the background for their transparent avatar.

*Note: The **Knowledge Ingestion (Librarian)** is not part of the mandatory automated sequence and is triggered manually by the user post-creation.*

### **4.2 Slack Identity & A2A**

* **Namespacing:** Routing is based on channel\_id \-\> projectId.  
* **Dynamic Avatars:** Backend generates transient URLs merging transparent PNGs with the project brandColor.  
* **Threading:** Agents reply in threads. Multiple agents can participate in one thread, sharing context.  
* **A2A Mirroring:** Internal talk is posted as: \[A2A\] 🏗️ Architect \-\> 💻 Developer: ... (Flagged to prevent loops).

## **5\. UI Management Pages**

### **5.1 Project List (/projects) & Wizard**

* **New Project Wizard:**  
  * **Role Selection:** Step to assign templates to the 5 mandatory roles.  
  * **DisplayName Overrides:** Users can override the displayName from the template.  
  * **Instance Management:** For multi-instance roles (Developer/Reviewer), users can add "+" instances and assign unique names to each.  
  * **Singleton Enforcement:** UI prevents adding more than one Librarian, PM, or Architect.

### **5.2 Project Control Center (/projects/\[id\])**

* **Dashboard:** Real-time analytics and process health. Includes a **"Trigger Knowledge Ingestion"** button.  
* **Agent Management**:  
  * **Grid View**: Displays project agents as a responsive grid of Shadcn Card components.  
  * **Agent Card**: Visualizes Avatar, Display Name, Role, **Tags (badges)**, Status (Idle/Busy), and a short Bio snippet.  
  * **Profile Interaction**: Clicking a card opens a full-screen Modal (LinkedIn-style) with a "View/Edit" toggle.  
* **Backlog View:** Jira-style list view. Stories grouped by Sprint.  
* **Kanban Board**:  
  * Global project view with columns: Backlog, Selected for Dev, In Progress, Review, Done.  
  * **Filters**: Quick-toggle filters for Waiting for Approval and Waiting for Answer.  
  * **Card Indicators**: Visual icons highlighting blockages and **Ticket Type (Feature, Bugfix, Refactor, Task)**.  
  * **Ticket Modal**: Discussion and Live Activity Logs tabs.  
* **Blueprints:** React-Flow workflow designer. Each node provides a context menu to "View Execution History".  
* **Requirements:** Tiptap-based "Confluence" space.  
* **Settings:** Project-level overrides for credentials, API keys, repository connection (GitHub App), and MCP configs.

### **5.3 Template Designer (/templates)**

* **Global Agent Library**: Visualized as a Grid of Cards.  
  * **Filterable Search**: Users can filter templates by Role or **Tags** (e.g., "droids").  
* **Agent Detail Modal**:  
  * **Hero Style**: A premium profile view showing avatar, role, **Tags**, and statistics.  
  * **Edit Toggle**: Switch to toggle between "Profile View" and "Edit Mode."  
  * **Identity Builder (AIEOS Builder)**: Visible only in Edit Mode.  
* **JSON Import/Export:** Ability to upload an AIEOS-compatible .json file.  
* **AI-Assisted Creation:** Section to copy a "Persona Interviewer" prompt.

### **5.4 Model & Ollama Administration (/settings/models)**

* **Provider Control:** Enable/Disable cloud providers or Local Ollama.  
* **Ollama UI Manager:** Status, Active Models, and Model Management (Pull/Delete).  
* **Resource Toggle:** Toggle models on/off to free up VPS resources.

## **6\. Workspace & Git Strategy**

* **Per-Agent Isolation:** Every agent instance is assigned its own dedicated workspace subdirectory: /artifacts/{projectId}/workspaces/{agentInstanceId}/.  
* **Dedicated Clones:** Upon activation, each agent performs its own local git clone to its specific directory.  
* **Shared Reference:** Agents reference the project-wide /artifacts/{projectId}/librarian/ index for global knowledge.  
* **Isolation Strategy:** Parallel work is handled via feature/{storyId} branches created within these individual workspaces.  
* **Locking:** Backend manages git.lock within each agent directory.  
* **Github hooks:** if makes sense on the workflow, include them and a guide on how to configure

## **7\. The Librarian MCP (The Knowledge Authority)**

### **7.1 Architecture: Hybrid Orchestration**

The Librarian functions as an orchestrator:

* **Parser Engine:** Treesitter AST parsing (CocoIndex/Drift).  
* **Graph Engine:** Bidirectional call-graph traversal (Code Pathfinder).  
* **Standards Engine:** Synthesizes patterns to author .aes/standards.md.

### **7.2 Communication & Integration**

* **Dockerized Engines:** Deployed as local Docker containers.  
* **Initialization Mode:** Baseline creation triggered on-demand.  
* **Post-Merge Mode:** Automated trigger on PR merge to update the "Shared Truth."

### **7.4 Expanded Capabilities**

* find\_logic, ask\_question, get\_type\_definition, get\_component\_sample, analyze\_impact, check\_convention\_compliance.

## **8\. Development & Review Loop**

### **8.1 Implementation Phase**

* **Contextual Coding:** Developers utilize session.jsonl and Librarian's standards.  
* **Feature Branches:** Work is isolated in feature/{storyId} branches in agent-specific workspaces.  
* **Atomic Commits:** Frequent, small, structured commits.

### **8.2 Automated Review Protocol**

* **Reviewer Activation**: Backend detects pull\_request.opened and signals Reviewer agent instances.  
* **Audit**: Reviewer calls Librarian's check\_convention\_compliance and posts feedback on GitHub.

### **8.3 Iterative Feedback & Signal Injection**

* **Signal Injection**: Backend monitors PR comments and sends **SIGUSR1** to the Developer agent.  
* **Context Injection**: Feedback is injected via stdin.

### **8.4 Post-Approval & Merge**

* **Merge Strategy**: Upon approval, PM agent (or user) triggers a merge.  
* **Knowledge Refresh**: Merge event triggers a mandatory Librarian re-index.

## **9\. Analytics & Execution Archiving**

### **9.1 Data Acquisition**

* **Usage Monitoring**: chokidar watches usage.json for ingestion into MongoDB.  
* **Transcript Archiving**: JSONL transcripts are archived in transcripts collection and cleared from local disk post-execution.

### **9.3 Visualizations**

* **Burn Rate**: Recharts cost-over-time.  
* **Distribution**: Pie charts by Agent Role.

## **10\. Multi-Tenant Security & Deployment**

### **10.1 Data Isolation**

* **Logic Level**: tenantId and projectId filters.  
* **Filesystem Level**: Strict root restriction and process termination on boundary violation.

### **10.2 Network & Access**

* **Reverse Proxy**: Caddy or Nginx for SSL.  
* **Auth**: JWT-based session management integrated with Firebase.

## **11\. AIEOS Identity Normalization & Schema (v1.1)**

| Section | Field Example | Description |
| :---- | :---- | :---- |
| **identity** | names, bio, origin | **REQUIRED.** Basic bio-data. |
| **psychology** | neural\_matrix, MBTI | **REQUIRED.** Logic vs Creativity weights. |
| **role\_meta** | isSingleton, canWriteCode | **REQUIRED.** System-level flags. |

## **12\. Deployment & Installation Script**

### **12.1 The Unified Setup Script (setup-aes.sh)**

* Installs Docker, Next.js, ZeroClaw, and MongoDB 8.0.  
* Defaults to qwen2.5-coder:1.5b.  
* Generates .env with global APP\_NAME.

## **13\. LLM & API Key Management**

* **Hierarchical Overrides**: Global fallbacks vs. Project-specific isolation.  
* **Encryption**: AES-256 storage in MongoDB.

## **14\. Technology Stack Summary**

| Category | Technology / Tool | Description & Scope |
| :---- | :---- | :---- |
| **Backend** | **NestJS (Node.js)** | Modular control plane managing APIs and ZeroClaw orchestration. |
| **Frontend** | **Next.js (App Router)** | Unified platform for UI and SSR. |
| **Component Lib** | **Shadcn UI** | High-quality components for professional dark/light theme. |
| **Theme Mgmt** | **next-themes** | Theme toggle based on Improving.com brand colors. |
| **Database** | **MongoDB 8.0** | Storage for structured data and Vector knowledge. |
| **Agent Kernel** | **ZeroClaw (Rust)** | High-performance reasoning loop and tool engine. |
| **Local LLM** | **Ollama** | Orchestrates local models for 8GB RAM preservation. |

## **15\. Git Repository Integration**

### **15.1 Configuration Requirements**

* Repository URL and **GitHub App** mandatory provider.  
* *Note: A GitHub App configuration guide must be provided to users for Private Key and Webhook setup.*

### **15.2 Hybrid Git Tooling**

* **GitHub MCP (API Tool)**: Used for remote API actions (PRs, Comments, Issues).  
* **Local Git CLI (System Tool)**: Used for local operations (Clone, Pull, Commit) in agent workspaces.

### **15.4 Real-time Event Triggers (Webhooks)**

System utilizes GitHub Webhooks for event-driven flow:

* **Workflow Resumption**: Comments or labels signal agent via SIGUSR1.  
* **Auto-Review**: PR creation triggers Reviewer node.  
* **Sync**: Main branch pushes trigger Librarian re-index.

## **16\. Workflow Templates & Management**

### **16.1 Global Workflow Library**

* Librarian Ingestion, Product Strategy, Feature Development, Hotfix.

### **16.2 Workflow Runs**

* Every trigger creates a WorkflowRun record for historical execution audit.

### **16.3 Node Configuration & Task Tracking**

* **Automatic Ticket Creation**: Node activation creates a Kanban ticket.  
* **Approval Gates**: "Requires Human Approval" flag pauses workflow.  
* **Live Activity Logs**: Node-level access to StdIO and transcript.jsonl (with historical consultation).

## **17\. Global Backlog & Intelligent PM Strategy**

### **17.1 Unified Backlog Sovereignty**

* **Metadata**: Title, Description, **Type (Feature, Bugfix, Refactor, Task)**, Priority, Status.  
* **Dual-Status**: Tracking both Workflow Node status and Global Kanban stage.

### **17.2 Sprint Management**

* **Ready Trigger**: Marking Sprint as Ready signals PM Agent to begin assignment.

## **18\. Agent-User Interaction & Task Dialogue**

### **18.1 dialogue & Visibility**

* Conversations held on tickets, mirrored to Slack threads.  
* **Activity Logs Tab**: Real-time and historical execution traces.

### **18.2 Clarification Logic**

* waiting\_for\_approval and waiting\_for\_answer flags pause agent execution.

## **19\. Design System & Branding**

### **19.1 Color Palette (Improving.com)**

* Primary: \#004176, Neutral: \#8C8C8C.  
* Global Theme Toggle in top-right navigation.

## **20\. Role Constraints & Permission Logic**

### **20.1 Role Multiplicity**

* **Singletons (Max 1 per Project):** Librarian, Architect, PM.  
* **Multi-Instance (N per Project):** Developer, Reviewer, Tester.  
* **Read Only:** Marks if the role has permission to write into the repository or just read, for example a developer must write the code, but a PM should never write to the repository

### **Some roles have special habilities that write files or create tickets but they don't work on the repository, like Librarian (Knowledge base), Architect (TRD documents), PM (Backlog stories ), Reviewer (Audit/PR Comments).**