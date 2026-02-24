# Documentation Agent Guide — docs/

You are working on the **user-facing documentation** for the AES system.

## Purpose
This folder contains guides that end users and operators read when configuring external services that AES depends on.

## Files in This Folder

```
docs/
├── AGENTS.md              ← This file
├── github-app-setup.md    ← Step-by-step GitHub App creation and configuration guide
└── slack-app-setup.md     ← Step-by-step Slack App creation and configuration guide
```

## Writing Standards

- Use numbered steps for sequential procedures
- Include all required permissions/scopes explicitly — operators must not guess
- Use code blocks for values that must be copy-pasted (URLs, commands)
- Use `{PLACEHOLDER}` format for values the user must substitute
- Include a "Where to put this value in AES" section for every credential
- Never include real credentials or secrets in documentation

## github-app-setup.md Must Cover

1. Navigate to GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App
2. App name, description, homepage URL
3. Required permissions:
   - Repository: Contents (R/W), Pull Requests (R/W), Issues (R/W), Commit Statuses (R/W)
   - Organization: Members (Read)
4. Subscribe to webhook events: `pull_request`, `issue_comment`, `push`, `pull_request_review`
5. Webhook URL: `https://{DOMAIN}/webhooks/github`
6. Webhook Secret: `openssl rand -hex 32`
7. Generate and download the private key (.pem file)
8. Install the app on the target repository
9. Where to enter values in AES project settings

## slack-app-setup.md Must Cover

1. Create app at api.slack.com → Create New App → From scratch
2. Required bot token scopes:
   - `channels:manage` — create channels
   - `chat:write` — post messages
   - `chat:write.customize` — **REQUIRED for agent username/avatar impersonation**
   - `users:read` — look up user IDs
   - `users:read.email` — look up by email
3. Event Subscriptions URL: `https://{DOMAIN}/webhooks/slack`
4. Subscribe to bot events: `message.channels`, `app_mention`
5. Install to workspace, copy Bot User OAuth Token
6. Where to enter values in AES project settings

## Story Reference
- Story 0000022 creates these documentation files as part of deployment artifacts
