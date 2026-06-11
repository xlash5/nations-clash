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
│   │       ├── Pitch.ts           # 3D pitch, goals, stadium shell, lighting
│   │       ├── PlayerMesh.ts      # Low-poly humanoid player model
│   │       ├── BallMesh.ts        # Icosahedron soccer ball
│   │       └── CameraController.ts # Tele-broadcast camera with lerp + flip
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

## Player Meshes

Procedural low-poly humanoid models in `client/src/game/PlayerMesh.ts`:

- **Torso**: box geometry coloured by team kit colour
- **Head**: sphere geometry with skin tone
- **Limbs**: cylinder geometry for upper/lower arms and legs
- **Kit colour**: passed as a parameter; all players share the same mesh shape
- **Flat shading** for consistent low-poly aesthetic
- Exported as `createPlayerMesh(color: string): THREE.Group`

## Ball Mesh

Procedural soccer ball in `client/src/game/BallMesh.ts`:

- **Geometry**: `IcosahedronGeometry` with detail level 1 (80 faces for a round-ish shape)
- **Pentagon pattern**: vertex-colored — the 12 original icosahedron vertices are darkened to suggest pentagon panels
- **Scale**: ~0.22 m radius (regulation size 5)
- **Flat shading** with vertex colouring
- Exported as `createBallMesh(): THREE.Mesh`

## Camera System

Tele-broadcast style camera in `client/src/game/CameraController.ts`:

- **Position**: elevated (~40 units) behind one team's goal line, angled down at the pitch
- **Follow**: smoothly interpolates (`lerp`) its x position toward the ball's x position for a broadcast feel
- **Flip**: `flipSide()` rotates the camera 180° around the pitch centre at halftime
- **FOV**: 60° for a typical broadcast field of view
- **Orientation**: constrained — maintains a fixed birds-eye-ish angle from behind the attacking/defending team

### Usage

```ts
const cam = new CameraController(aspect)

// Each frame — pass the ball position and delta time
cam.update(ballPosition, delta)

// At halftime
cam.flipSide()
```

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
