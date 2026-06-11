# Nations' Clash

A browser-based 1v1 online football game built with Three.js, Node.js, and WebSockets.

Two human players each command an 11-player team (AI controls the other 10), switching between them in real time. Real-time multiplayer via Socket.io with room-based invite codes.

## Project Structure

```
football/
├── server/          # Node.js + Socket.io game server
│   ├── src/
│   │   └── index.ts # Entry point, Socket.io setup
│   └── package.json
├── client/          # Vite + Three.js frontend
│   ├── src/
│   │   └── main.ts  # Entry point, Three.js scene
│   ├── public/audio/ # SFX files (placeholder)
│   ├── index.html
│   └── package.json
├── shared/
│   └── types.ts     # Types shared between client & server
└── package.json     # Root workspace config with scripts
```

## Getting Started

```bash
npm install
npm run dev     # Starts both server (port 3001) and client (port 5173)
npm test        # Runs Vitest across all packages
npm run typecheck  # TypeScript compiler check
```

## CI/CD Pipeline

GitHub Actions workflows are defined in `.github/workflows/`:

| Workflow | Trigger | Steps |
|---|---|---|
| **CI** | Every push & PR (all branches) | `npm ci` → typecheck → lint → test → build |
| **CD** | Push to `main` | `npm ci` → build → deploy to Railway |

CI runs on Node 18 and 20 in parallel. CD requires `RAILWAY_TOKEN` secret to be set in the GitHub repository.

## Tech Stack

| Layer | Technology |
|---|---|
| 3D Rendering | Three.js |
| Frontend | TypeScript + Vite |
| Backend | Node.js + TypeScript |
| Real-time | Socket.io |
| Testing | Vitest |
