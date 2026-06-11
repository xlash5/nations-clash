# Nations' Clash

A browser-based 1v1 online football game built with Three.js, Node.js, and WebSockets.

Two human players each command an 11-player team (AI controls the other 10), switching between them in real time. Real-time multiplayer via Socket.io with room-based invite codes.

## Project Structure

```
football/
├── server/          # Node.js + Socket.io game server
│   ├── src/
│   │   ├── index.ts # Entry point, Socket.io setup + room events
│   │   └── rooms.ts # Room management (create, join, ready, disconnect)
│   └── package.json
├── client/          # Vite + Three.js frontend
│   ├── src/
│   │   ├── main.ts           # Entry point, UI screen management
│   │   ├── network/
│   │   │   └── SocketClient.ts # Socket.io client wrapper
│   │   ├── ui/
│   │   │   ├── MainMenu.ts   # Create/Join room screen
│   │   │   └── Lobby.ts      # Player list + ready button
│   │   └── game/
│   │       └── Pitch.ts  # 3D pitch, goals, stadium shell, lighting
│   ├── public/audio/ # SFX files (placeholder)
│   ├── index.html
│   └── package.json
├── shared/
│   └── types.ts     # Types shared between client & server
├── tasks/           # Task breakdown (excluded from git)
├── spec.md          # Project specification (excluded from git)
└── package.json     # Root workspace config with scripts
```

## Getting Started

```bash
npm install
npm run dev     # Starts both server (port 3001) and client (port 5173)
npm test        # Runs Vitest across all packages
npm run typecheck  # TypeScript compiler check
```

### Multiplayer Flow

1. Open the app in two browser tabs
2. Player A clicks **Create Room** — a 6-character room code is generated
3. Player B enters the code and clicks **Join Room**
4. Both players see the lobby with their IDs and can click **Ready**
5. When both are ready (future: transition to team select)

## 3D Pitch

Procedural Three.js geometry composed in `client/src/game/Pitch.ts`:

- **Pitch surface**: green rectangle (105 × 68 units) with white markings
- **Markings**: halfway line, centre circle + spot, penalty areas, goal areas, penalty spots, penalty arcs, corner arcs
- **Goals**: white box-frame (posts + crossbar) with semi-transparent wireframe net (back, top, left, right panels)
- **Stadium shell**: four low-poly box stands around the pitch
- **Lighting**: ambient light + directional sun + fill light

## Network Events

| Event | Direction | Payload |
|---|---|---|
| `room:create` | C→S | — |
| `room:created` | S→C | `{ roomCode }` |
| `room:join` | C→S | `{ roomCode }` |
| `room:joined` | S→C | `{ code, players }` |
| `room:error` | S→C | `{ message }` |
| `player:ready` | C→S | — |
| `player:left` | S→C | `{ playerId }` |

## CI/CD Pipeline

GitHub Actions workflows are defined in `.github/workflows/`:

| Workflow | Trigger | Steps |
|---|---|---|
| **CI** | Every push & PR (all branches) | `npm ci` → typecheck → lint → test → build |
| **CD** | Push to `master` | `npm ci` → build → deploy to Railway |

CI runs on Node 18 and 20 in parallel. CD requires `RAILWAY_TOKEN` secret to be set in the GitHub repository.

## Tech Stack

| Layer | Technology |
|---|---|
| 3D Rendering | Three.js |
| Frontend | TypeScript + Vite |
| Backend | Node.js + TypeScript |
| Real-time | Socket.io |
| Testing | Vitest |
