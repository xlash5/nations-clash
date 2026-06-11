# Nations' Clash

A browser-based 1v1 online football game built with Three.js, Node.js, and WebSockets.

Two human players each command an 11-player team (AI controls the other 10), switching between them in real time. Real-time multiplayer via Socket.io with room-based invite codes.

## Project Structure

```
football/
├── server/          # Node.js + Socket.io game server
│   ├── src/
│   │   ├── index.ts        # Entry point, Socket.io setup + room events
│   │   ├── rooms.ts        # Room management (create, join, ready, disconnect)
│   │   └── match/
│   │       ├── Match.ts     # 60 Hz authoritative game loop
│   │       ├── Player.ts    # Player state (position, velocity, stamina)
│   │       ├── Team.ts      # Team data structure (11 players, score)
│   │       ├── physics.ts   # Ball physics engine
│   │       ├── ai.ts        # AI behaviour (stub)
│   │       ├── collision.ts # Collision detection (stub)
│   │       └── goalDetection.ts # Goal detection (stub)
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

## Charge-Based Kick System (Shoot & Pass)

Server-side charge kicking in `server/src/match/Player.ts` with execution in `Match.ts`:

- **Charge**: hold `J` (shoot) or `K` (pass) to charge power; fills from 0→1 over ~1 second
- **Release**: releasing the key applies a kick impulse to the ball proportional to charge power
- **Shoot**: ball launches in the direction the player is facing
- **Pass**: ball launches toward the nearest teammate within a 30° cone (aim assist); falls back to facing direction if no teammate is in range
- **Power bar**: client-side HUD display (`client/src/game/HUD.ts`) shows a horizontal bar that fills while charging, colour-coded green/yellow/red by power level

### Test Coverage

49 unit tests cover charge start, accumulation, release, shoot/pass overlap, and power proportionality.

## Ball Physics

Server-side ball physics engine in `server/src/match/physics.ts`:

- **Gravity**: `-9.81 m/s²` applied to Y velocity each tick
- **Air resistance**: linear drag (`0.05/s`) on all velocity axes when ball is airborne
- **Rolling friction**: horizontal deceleration (`5.0 m/s²`) when ball is on the ground
- **Bounce**: reflects Y velocity with `0.5` restitution coefficient when ball lands
- **Ground clamp**: ball Y position never drops below `BALL_RADIUS` (0.22 units)
- **Spin (Magnus effect)**: cross product of spin and velocity produces lateral acceleration (`0.003` factor), curving the trajectory
- **Kick**: applies velocity impulse in a given direction scaled by power, with automatic side-spin

### Exported functions

| Function | Description |
|---|---|
| `tickPhysics(ball, dt)` | Full per-tick physics update (gravity, drag/friction, spin, position, bounce) |
| `updatePhysics(match, state)` | Impure wrapper called from Match tick loop |
| `applyGravity`, `applyAirResistance`, `applyRollingFriction`, `applySpin` | Pure force functions |
| `bounce`, `clampToGround`, `isOnGround`, `updatePosition` | Pure utility functions |
| `kick(ball, direction, power)` | Applies kick impulse + spin |

All physics functions are pure (input ball state → output new ball state) for testability. 34 unit tests cover gravity, air resistance, rolling friction, bounce, ground clamping, Magnus effect, kick impulse, and integrated tick behaviour.

## Player Movement & Sprint

Server-side player movement logic in `server/src/match/Player.ts`:

- **Input**: arrow keys (`up`, `down`, `left`, `right`) relative to the camera orientation, plus `sprint` (Shift)
- **Camera-relative mapping**: `up` always pushes toward the opponent's goal regardless of which side the camera is on (handled via the `cameraSide` param: `-1` or `1`)
- **Base speed**: 8 m/s; diagonal movement is normalised so speed is consistent
- **Sprint**: 1.5× speed multiplier when stamina ≥ 10
- **Stamina drain**: 15 units/s while sprinting
- **Stamina regen**: 5 units/s while not sprinting
- **Ball control**: sprinting reduces control (1.5× drift multiplier) — ball offset from feet increases
- **Rotation**: player `rotation` is derived from the movement direction via `atan2`

### Usage

```ts
const player = new Player('p1', 'home')

// Each tick: apply input, then step position
player.applyInput(playerInput, cameraSide, delta)
player.tick(delta)
```

## Network Events

| Event | Direction | Payload |
|---|---|---|---|---|
| `room:create` | C→S | — |
| `room:created` | S→C | `{ roomCode }` |
| `room:join` | C→S | `{ roomCode }` |
| `room:joined` | S→C | `{ code, players }` |
| `room:error` | S→C | `{ message }` |
| `player:ready` | C→S | — |
| `player:left` | S→C | `{ playerId }` |
| `match:start` | S→C | `{ config }` |
| `game:input` | C→S | `{ keys: bitmask, chargeType, chargeTimestamp }` |
| `game:state` | S→C | `{ players[], ball, score, clock, phase }` |

## Server-Side Game Loop

The authoritative game simulation runs at **60 ticks/sec** in `server/src/match/Match.ts`:

- **Tick rate**: `setInterval` at 16.67ms interval
- **Clock**: configurable countdown (time mode) or count-up (goals mode)
- **Phases**: `firstHalf` → `halftime` → `secondHalf` → `fulltime`
- **Hooks**: each tick calls physics, AI, collision, and goal detection stubs (filled in by subsequent tasks)
- **Broadcasting**: after each tick, a `game:state` snapshot is sent to both clients via Socket.io

### Game State Snapshot

```ts
{
  players: { id, team, position, velocity, rotation, stamina, isHumanControlled, isGk }[]
  ball:    { position, velocity, spin }
  score:   { teamA: number, teamB: number }
  clock:   number
  phase:   'firstHalf' | 'halftime' | 'secondHalf' | 'fulltime'
}
```

### Match Start Flow

1. Both players ready in lobby → `match:start` emitted
2. A `Match` instance is created with the room's two player IDs
3. Each team has 11 players (1 GK + 10 outfield), first outfield player is human-controlled
4. Inputs flow via `game:input` bitmask events, consumed each tick

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
