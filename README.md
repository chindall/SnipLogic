<div align="center">

<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#3b82f6"/>
  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.6"/>
  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.6"/>
  <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.3"/>
</svg>

# SnipLogic

**A self-hosted snippet management system built for teams.**
Type a shortcut, press Tab — your snippet expands instantly, anywhere in the browser.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](#)

</div>

---

## What is SnipLogic?

SnipLogic is a **self-hosted TextBlaze alternative** — a full snippet management platform designed for one or small teams. Write your snippets once, use them everywhere: Gmail, Clio, Outlook, Word Online, and any browser-based editor.

Built as a personal homelab project, SnipLogic is a complete multi-tenant SaaS application with a browser extension, a polished web UI, and a full REST API — all containerized and deployable to any Linux machine in minutes.

---

## Features

### 🚀 Browser Extension (Chrome / Edge)
- Type `//shortcut` + **Tab** to instantly expand any snippet
- Works in `<input>`, `<textarea>`, and rich-text editors (Gmail, Clio, Notion, Word Online)
- Snippets cached locally — works even if the server is temporarily unreachable
- Auto-syncs shortcuts and variables every time the popup opens

### 📝 Snippet Management
- Organize snippets into **folders** inside **workspaces**
- Full CRUD — create, edit, delete snippets and folders from the web UI
- Rich text support — snippets store both plain text (`content`) and HTML (`htmlContent`)
- **Import from TextBlaze** — drop in your existing `.json` exports and they migrate instantly

### ✨ Variable Substitution
Embed dynamic values directly in your snippets:

| Token | Output |
|---|---|
| `{{firstname}}` | Craig *(your custom variable)* |
| `{{datelong}}` | Thursday, February 19, 2026 |
| `{{dateshort}}` | 02/19/2026 |
| `{{time}}` | 2:34 PM |
| `{{datetime}}` | February 19, 2026 2:34 PM |
| `{{clipboard}}` | *(pastes your current clipboard)* |
| `{{cursor}}` | *(positions cursor here after expansion)* |

- **Static variables** — stored in the database, scoped to a user or workspace
- **Dynamic variables** — resolved at expansion time (date/time always current, always local timezone)
- **USER scope overrides WORKSPACE** — personalize shared snippets

### 👥 Team Management
- Invite teammates with a temporary password
- Role-based access: **Admin**, **Editor**, **Viewer** — per workspace
- Admin can reset any user's password
- Admin can grant or revoke Global Admin status
- Export any user's personal workspace as JSON

### 🏢 Workspace Management
- Multiple shared workspaces per organization
- Create, rename, export, and delete workspaces from Settings
- Personal workspace per user (private, always writable)
- Admins don't see other users' personal workspaces in the sidebar

### ⚙️ Settings Hub
- **Account tab** — update your name and change your password
- **Variables tab** — manage custom variables (personal + workspace)
- **Team tab** — user management *(admins only)*
- **Workspaces tab** — workspace CRUD *(admins only)*

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Express 5, TypeScript, Prisma ORM, PostgreSQL 16 |
| **Frontend** | React 18, TypeScript, Vite, TanStack Query, Zustand |
| **Styling** | CSS Modules + custom design system (no Tailwind) |
| **Browser Extension** | Chrome/Edge MV3, TypeScript |
| **Infrastructure** | Docker, Docker Compose, nginx |
| **Auth** | JWT (signed with `jsonwebtoken`), bcrypt password hashing |
| **Validation** | Zod (backend) |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌──────────────────┐   ┌──────────────────────┐ │
│  │   Web UI (React) │   │  Extension (MV3)     │ │
│  │  localhost:5173  │   │  //shortcut + Tab    │ │
│  └────────┬─────────┘   └──────────┬───────────┘ │
└───────────┼──────────────────────────────────────┘
            │ /api/v1/*                │ /api/v1/*
            ▼                          ▼
┌─────────────────────────────────────────────────┐
│              nginx (Docker)                      │
│         serves React SPA + proxies /api          │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│         Express API (Docker) :3001               │
│   Auth · Workspaces · Snippets · Variables       │
│   Users · Import · Folders                       │
└─────────────────────┬───────────────────────────┘
                      │ Prisma
                      ▼
┌─────────────────────────────────────────────────┐
│         PostgreSQL 16 (Docker)                   │
└─────────────────────────────────────────────────┘
```

---

## Self-Hosted Deployment

SnipLogic runs entirely in Docker. No cloud accounts, no subscriptions.

### Requirements
- Linux host with Docker + Docker Compose installed
- A reverse proxy (Nginx Proxy Manager, Traefik, Caddy, etc.) for SSL — or access via local IP

### Deploy in 5 steps

```bash
# 1. Clone the repo
git clone https://github.com/chindall/SnipLogic.git
cd SnipLogic

# 2. Create your environment file
cp .env.example .env
# Edit .env — set JWT_SECRET and POSTGRES_PASSWORD
# Generate a strong JWT_SECRET: openssl rand -base64 48

# 3. Build and start
docker compose up -d --build

# 4. Verify
docker compose ps
docker compose logs backend --tail 20

# 5. Open the setup wizard
# Navigate to http://<your-host-ip>:5173
# You'll be redirected to /setup automatically on a fresh install
# Enter your organization name and create your admin account — done!
```

Your instance will be available at `http://<your-host-ip>:5173`.

> **Fresh install detection:** SnipLogic automatically detects whether an admin account exists. On a brand-new deployment the `/setup` wizard appears first — no manual database commands needed. Once the first account is created the wizard is permanently disabled.

### Recommended: Nginx Proxy Manager + Let's Encrypt

If you run Nginx Proxy Manager (or NPM Plus):

1. Add a **Proxy Host**: `sniplogic.yourdomain.com` → `your-host-ip:5173`
2. Enable **Let's Encrypt SSL** and **Force HTTPS**
3. Add a **local DNS record** (Pi-hole, AdGuard, router) pointing `sniplogic.yourdomain.com` to your NPM host

Result: `https://sniplogic.yourdomain.com` — fully SSL, no cert management needed.

---

## Extension Setup

1. Build the extension:
   ```bash
   cd packages/extension
   node scripts/make-icons.cjs   # one-time icon generation
   npm run build
   ```
2. Open `chrome://extensions` → Enable **Developer mode** → **Load unpacked** → select `packages/extension/dist/`
3. Click the SnipLogic icon → **API Settings** → enter your server URL (e.g. `https://sniplogic.yourdomain.com`)
4. Log in — shortcuts and variables sync automatically

---

## Development Setup

```bash
# Start the database and backend
docker compose up -d postgres
docker compose up -d --build backend

# Start the frontend dev server (hot reload)
cd packages/frontend
npm install
npm run dev
# → http://localhost:5173

# Extension (watch mode)
cd packages/extension
npm install
npm run dev
# Load dist/ in Chrome as an unpacked extension
```

The Vite dev server proxies `/api` → `http://localhost:3001` automatically.

---

## Data Model

```
Organization
  ├── Users (with WorkspaceRoles)
  ├── Workspaces
  │     └── Folders
  │           └── Snippets
  └── Variables (USER or WORKSPACE scope)
```

- Every query is scoped to `organizationId` — full multi-tenant isolation
- Personal workspaces are owned by a single user and always writable by them
- Shared workspaces use role-based access (WORKSPACE_ADMIN / EDITOR / VIEWER)

---

## Roadmap

- [x] Snippet CRUD with folder organization
- [x] Multi-workspace support with role-based access
- [x] Browser extension (Chrome/Edge MV3)
- [x] Variable substitution — static + dynamic
- [x] Team management (invite, roles, password reset)
- [x] Settings hub (Account, Variables, Team, Workspaces)
- [x] TextBlaze JSON import
- [x] Production Docker setup (self-hosted)
- [x] First-run setup wizard (auto-detected, no CLI needed)
- [ ] Desktop app — Electron tray app for Windows + macOS (snippet picker outside the browser)
- [ ] Configurable trigger prefix (e.g. `;;`, `:` instead of `//`)
- [ ] Firefox extension

---

## Why I Built This

I needed a self-hosted alternative to TextBlaze due to PI and restrictions on what software I can use in my environment — something I could own completely, extend freely, and run on my own infrastructure. This project grew from that need into a full-featured platform I'm genuinely proud of.

I want to be transparent: I came into this project as someone new to TypeScript, React, Node.js, Docker, and browser extension development. What you see here was built by pairing with **Claude Code (AI)** as a learning accelerator — not just to generate code, but to understand *why* every decision was made along the way. Every architecture choice, every bug fix, every design pattern was a learning moment.

I believe this is what the future of software development looks like — humans bringing the vision, domain knowledge, and judgement; AI helping compress years of learning into weeks. This project is proof that works.

*Built with a lot of Dutch Brothers coffee, late nights I should be in bed, and lot of learning and determination, and Claude Code in my Terminal by my side. 🤖*

---

<div align="center">
  <sub>SnipLogic — Built by Craig Hindall</sub>
</div>
