# Orbit Social

Orbit is a browser-based social app starter with accounts, a shared feed, likes, comments, real-time direct messages, member discovery, reporting, and an optional AI writing helper.

**Version 1.1 uses PostgreSQL for both app data and login sessions.** This avoids relying on a web host's temporary local disk for accounts, posts, messages, and sessions. Your database provider must still retain data and have backups enabled.

This is an early-access MVP, not a finished or independently security-audited social network. Do not open it to the public until the safety and security checklist below has been completed.

## What you need

- Node.js 20 or newer and npm (only if running locally)
- A PostgreSQL database
- A long, private `SESSION_SECRET`

## Deploy with GitHub + Render (no VS Code required)

1. Create a private GitHub repository for the project.
2. Download and extract this ZIP on your computer.
3. On the repository page, choose **Add file → Upload files**, then upload the contents of the `orbit-social` folder (not the outer folder itself). Commit the upload.
4. In Render, create a PostgreSQL database. Choose a plan that fits your budget and check the current price, storage limits, backup options, and expiry policy before confirming. A free web-service plan does not mean the database is free.
5. Copy the database's **internal connection URL** from its dashboard. Keep it private.
6. In Render, create **New → Web Service**, connect your GitHub repository, and set:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
7. In the web service's Environment settings, add:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = the PostgreSQL internal connection URL
   - `SESSION_SECRET` = a randomly generated secret of at least 32 characters
   - `PGSSL` = `false` when using Render's internal database URL; follow your database provider's instructions for other providers
   - `OPENAI_API_KEY` = optional; leave unset to use the basic writing helper
   - `OPENAI_MODEL` = optional, defaults to `gpt-4.1-mini`
8. Deploy. When deployment finishes, open the `onrender.com` address shown in the service dashboard. The server creates its database tables automatically on first startup.
9. Test with two accounts in separate browsers. Confirm that accounts, posts, and messages still exist after a service restart.

**Costs and adult help:** Managed databases may have ongoing charges. Ask a parent or guardian to review the provider, pricing, account ownership, and privacy settings before creating a paid service or inviting other people. Never publish database URLs, passwords, API keys, or session secrets in GitHub.

## Run locally

Create a PostgreSQL database, then copy `.env.example` to `.env` and enter its connection URL and a private session secret. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. Register two test accounts in separate browsers or private windows to test messaging.

## Features included

- Username/password registration and login
- Password hashing with Node's built-in `scrypt`
- PostgreSQL-backed account, post, comment, like, message, report, and session storage
- Feed posts, likes, and comments
- Live direct messages using Socket.IO
- Search for other members
- Report posts or accounts for later moderator review
- Optional AI writing helper; basic local fallback works without an API key
- Responsive desktop and mobile layout
- Basic security headers, request limits, input length limits, and server-side validation

## Important privacy and safety limitations

- Messages are stored in the database and are **not end-to-end encrypted**. Do not use this app for highly sensitive conversations.
- There is currently no email verification, password reset, blocking, muting, moderator dashboard, or report-resolution workflow.
- Reports are stored but are not automatically reviewed. A real service needs trusted, trained moderators and a clear response process.
- There is no independent security audit. Add CSRF protections, stronger abuse prevention, monitoring, automated tests, backups, and a documented incident-response process before public launch.
- Add a privacy notice, terms, community rules, age-appropriate protections, and a way to contact the service operator. Collect as little personal information as possible.
- Do not allow the AI helper to automatically publish content or send messages. Users should review suggestions themselves.

## Project structure

```text
orbit-social/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Next milestones

- Verified email and account recovery
- Account blocking and muting
- Moderation dashboard and report handling
- Profile editing and safe image uploads
- Private groups with invitations
- Push notifications
- Security review and database backup/restore testing
