# GitHub App Setup Guide

This guide walks you through creating and configuring a GitHub App for AES.

---

## 1. Create the GitHub App

1. Go to **GitHub** → **Settings** → **Developer settings** → **GitHub Apps**
2. Click **New GitHub App**
3. Fill in:
   - **App name**: `AES - <your-org>` (must be unique across GitHub)
   - **Homepage URL**: `https://<DOMAIN>`
   - **Webhook URL**: `https://<DOMAIN>/webhooks/github`
   - **Webhook secret**: Generate with `openssl rand -hex 32` — save this value

---

## 2. Set Repository Permissions

Under **Permissions & events → Repository permissions**:

| Permission | Access |
|-----------|--------|
| Contents | Read & write |
| Pull requests | Read & write |
| Issues | Read & write |
| Commit statuses | Read & write |
| Metadata | Read-only (required) |

---

## 3. Set Organization Permissions

Under **Permissions & events → Organization permissions**:

| Permission | Access |
|-----------|--------|
| Members | Read-only |

---

## 4. Subscribe to Events

Under **Subscribe to events**, check:

- `pull_request`
- `pull_request_review`
- `issue_comment`
- `push`

---

## 5. Generate Private Key

1. Scroll to **Private keys** section
2. Click **Generate a private key**
3. A `.pem` file will be downloaded — **keep this secure**

---

## 6. Install the App

1. After creating the app, go to **Install App** in the left sidebar
2. Click **Install** next to your organization or personal account
3. Select the repositories you want AES to access
4. Click **Install**

Note the **Installation ID** from the URL: `https://github.com/settings/installations/<INSTALLATION_ID>`

---

## 7. Configure AES Project Settings

In the AES UI, navigate to your project → **Settings** → **GitHub Integration**:

| Field | Value |
|-------|-------|
| GitHub App ID | Found on the app's General page |
| GitHub App Private Key | Contents of the `.pem` file |
| GitHub Installation ID | From step 6 |
| GitHub Webhook Secret | The value from step 1 |
| Repository Owner | GitHub org or username |
| Repository Name | The target repository |

---

## Troubleshooting

- **Webhook not firing**: Verify the URL is `https://<DOMAIN>/webhooks/github` and the secret matches
- **401 Unauthorized**: The private key or App ID may be wrong
- **404 on installation**: Check the Installation ID is for the correct organization

---

## Security Notes

- The private key is stored AES-256 encrypted in MongoDB
- Never commit the `.pem` file to source control
- Rotate the webhook secret periodically via GitHub App settings
