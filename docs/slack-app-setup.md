# Slack App Setup Guide

This guide walks you through creating and configuring a Slack App for AES agent messaging.

---

## 1. Create the Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. App Name: `AES Agents`
4. Pick workspace: select your target Slack workspace
5. Click **Create App**

---

## 2. Configure Bot Token Scopes

Go to **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**, add:

| Scope | Purpose |
|-------|---------|
| `channels:manage` | Create project Slack channels |
| `chat:write` | Post messages |
| `chat:write.customize` | **REQUIRED** — Agent username/icon impersonation |
| `users:read` | Look up user IDs |
| `users:read.email` | Look up users by email |
| `groups:write` | Create private channels (if needed) |

> **Important**: `chat:write.customize` is mandatory for agent impersonation. Without it, all messages will appear from the generic bot account instead of the individual agent names and avatars.

---

## 3. Enable Event Subscriptions

1. Go to **Event Subscriptions** → Toggle **Enable Events** on
2. **Request URL**: `https://<DOMAIN>/webhooks/slack`
   - Wait for the URL to be verified (AES will respond to the challenge)
3. Under **Subscribe to bot events**, add:
   - `message.channels` — receive messages in channels the bot is in
   - `app_mention` — receive direct @mentions

---

## 4. Install the App

1. Go to **OAuth & Permissions** → click **Install to Workspace**
2. Review permissions and click **Allow**
3. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

---

## 5. Configure AES Project Settings

In the AES UI, navigate to your project → **Settings** → **Slack Integration**:

| Field | Value |
|-------|-------|
| Slack Bot Token | The `xoxb-...` token from step 4 |

Optionally, add **Global Invite Users** (Slack user IDs) in **AES Global Settings** → they will be invited to every new project channel automatically.

---

## 6. Find Slack User IDs (for inviteUsers)

To get a user's Slack ID:
1. Click on the user's name in Slack
2. Click **View full profile** → **More** (three dots)
3. Click **Copy member ID**

User IDs look like: `U01ABC123`

---

## Troubleshooting

- **Messages not posting**: Verify the bot is invited to the channel (`/invite @AES Agents`)
- **Agent names not showing**: Confirm `chat:write.customize` scope is granted
- **Webhook not receiving events**: Verify the Request URL and that the Slack app is installed
- **Channel creation failing**: Confirm `channels:manage` scope is present

---

## Security Notes

- The Bot User OAuth Token is stored AES-256 encrypted in MongoDB
- Never share the token publicly or commit it to source control
- Rotate the token via Slack's **OAuth & Permissions** page if compromised
