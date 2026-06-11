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
│   │       ├── collision.ts # Collision detection (player-ball, ball-goal, player-player)
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
│   │       ├── CameraController.ts # Tele-broadcast camera with lerp + flip
│   │       ├── Input.ts           # Keyboard capture + bitmask packing
│   │       └── ReplayController.ts # Slow-motion goal replay playback
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

## Input System

Client-side keyboard input capture and bitmask packing in `client/src/game/Input.ts`:

- **Keyboard listener**: tracks pressed/released keys via `keydown`/`keyup` DOM events
- **Keys**: Arrow Up/Down/Left/Right (or WASD), Shift (sprint), J (shoot), K (pass), L (tackle), U (slide tackle), I (switch player)
- **Bitmask packing**: each key maps to a power-of-two bit; `getBitmask()` returns a single `number` with all pressed keys OR'd together
- **Dual binding**: arrow keys and WASD both map to movement bits; either Shift key maps to sprint
- **Default prevention**: arrow keys and Shift are prevented from scrolling the page
- **Lifecycle**: `attach()` / `detach()` manage event listener registration

### Bitmask Layout

| Bit | Value | Key(s) | Action |
|-----|-------|--------|--------|
| 0   | 1     | ArrowUp / W | Move up |
| 1   | 2     | ArrowDown / S | Move down |
| 2   | 4     | ArrowLeft / A | Move left |
| 3   | 8     | ArrowRight / D | Move right |
| 4   | 16    | Shift (left/right) | Sprint |
| 5   | 32    | J | Shoot |
| 6   | 64    | K | Pass |
| 7   | 128   | L | Tackle |
| 8   | 256   | U | Slide tackle |
| 9   | 512   | I | Switch player |

### Broadcast Loop

The input loop in `main.ts` runs at ~60 Hz via `setInterval`:
1. Reads the bitmask from `Input.getBitmask()`
2. Detects charge start/release for shoot (J) and pass (K)
3. Updates the HUD power bar during charging
4. Emits `game:input` via `SocketClient.sendInput(keys, chargeType, chargeTimestamp)`

### Server Reception

The `game:input` event handler in `server/src/index.ts` unpacks the bitmask into a `PlayerInput` struct and calls `match.handleInput()`. Unknown bits are safely ignored. 21 unit tests cover bitmask packing/unpacking for every key and combination.

### Usage

```ts
import { Input, KEY_SHOOT } from './game/Input'

const input = new Input()
input.attach()

// Each frame
const bitmask = input.getBitmask()
const isShooting = !!(bitmask & KEY_SHOOT)
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

## Slow-Motion Replay

After a goal, a slow-motion replay plays the last ~5 seconds of action from a slightly elevated angle.

### Server-Side Replay Buffer

In `server/src/match/Match.ts`:

- **Buffer**: the last 300 `GameState` snapshots (5 seconds at 60 Hz) are retained
- **`pushSnapshot(state)`**: appends a snapshot to the buffer; oldest entries are evicted when the cap is exceeded
- **`getReplayData()`**: returns a copy of the buffered snapshots as `{ snapshots: GameStateSnapshot[] }`
- **Snapshot capture**: `broadcast()` pushes a snapshot before emitting `game:state` each tick
- **On goal**: `awardGoal()` includes `replayData` in the `game:goal` event sent to both clients

### Client-Side Replay Controller

In `client/src/game/ReplayController.ts`:

- **Playback**: iterates through snapshots at 15 ticks/s (¼ speed of real-time)
- **Skip**: `skip()` immediately ends playback and triggers the skip callback
- **Overlay**: shows "Press SPACE to skip" text during replay

### Goal Sequence Flow

1. Goal detected on server → `game:goal` emitted with `replayData`
2. Client shows "GOAL!" flash overlay for ~1.5s
3. Replay starts playing back buffered snapshots in slow motion
4. Player can press `Space` to skip the replay
5. After replay ends (auto or skip), match resumes with kickoff

### Network Event

| Event | Direction | Payload |
|---|---|---|
| `game:goal` | S→C | `{ scorer, team, isOwnGoal, replayData: { snapshots[] } }` |

### Test Coverage

6 unit tests cover replay buffer push, capacity capping (300), oldest-entry eviction, copy semantics, tick integration, and goal event inclusion.

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

## Collision Detection

Server-side collision detection in `server/src/match/collision.ts`:

- **Player-Ball** (sphere-sphere): when the ball overlaps a player's collision radius (0.5 m), the ball deflects away with a coefficient of restitution of 0.7
- **Dribble**: the nearest player to the ball within ~1 m is marked `hasBall`, and the ball sticks near their feet at a fixed offset (0.6 m behind the player)
- **Ball-Goal Frame** (sphere-cylinder): goal posts (vertical cylinders) and crossbar (horizontal cylinder) reflect the ball with restitution 0.7
- **Player-Player** (sphere-sphere): overlapping players are pushed apart along the vector between their centres
- **Goal Scored**: a ball that fully crosses the goal line within goal width and height awards a goal and resets to the centre spot

### Exported functions

| Function | Description |
|---|---|
| `checkPlayerBallCollision(playerPos, ballPos)` | Sphere-sphere overlap check; returns collision normal + penetration |
| `resolvePlayerBallCollision(ball, collision, hasBall, playerPos)` | Deflects ball or attaches for dribble |
| `checkBallGoalCollision(ballPos)` | Sphere-cylinder check against post/crossbar geometry |
| `checkGoalScored(ballPos)` | Returns true if ball crossed the goal line within frame |
| `resolvePlayerPlayerCollision(p1Pos, p2Pos)` | Separates two overlapping players |
| `findNearestPlayer(players, ballPos)` | Finds closest player to ball (for dribble assignment) |
| `updateCollisions(match, state)` | Impure wrapper called from Match tick loop |

Ball-player collision, deflection, and goal-post ricochet are covered by **25 unit tests**.

## Network Events

| Event | Direction | Payload |
|---|---|---|---|---|---|
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
| `game:goal` | S→C | `{ scorer, team, isOwnGoal, replayData }` |
| `game:event` | S→C | `{ type, ...data }` |

## Server-Side Game Loop

The authoritative game simulation runs at **60 ticks/sec** in `server/src/match/Match.ts`:

- **Tick rate**: `setInterval` at 16.67ms interval
- **Clock**: configurable countdown (time mode) or count-up (goals mode)
- **Phases**: `firstHalf` → `halftime` → `secondHalf` → `fulltime`
- **Hooks**: each tick calls physics, AI, collision, and goal detection — collision is fully implemented (player-ball sphere-sphere, ball-goal sphere-AABB, player-player push-apart), goal detection is a stub (phase 3)
- **Broadcasting**: after each tick, a `game:state` snapshot is sent to both clients via Socket.io

### Game State Snapshot

```ts
{
  players: { id, team, position, velocity, rotation, stamina, isHumanControlled, isGk, hasBall }[]
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
