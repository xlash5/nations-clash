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
│   │   ├── data/
│   │   │   ├── formations.ts # 5 formation templates (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2)
│   │   │   └── teams.ts      # 32 World Cup teams with kits, formations, and players
│   │   └── match/
│   │       ├── Match.ts     # 60 Hz authoritative game loop
│   │       ├── Player.ts    # Player state (position, velocity, stamina)
│   │       ├── Team.ts      # Team data structure (11 players, score)
│   │       ├── physics.ts   # Ball physics engine
│   │       ├── ai.ts        # AI behaviour (HOLD/CHASE/RETREAT states)
│   │       ├── collision.ts # Collision detection (player-ball, ball-goal, player-player)
│   │       ├── goalDetection.ts # Goal detection (stub)
│   │       └── tackling.ts  # Standing + slide tackles, foul detection
│   └── package.json
├── client/          # Vite + Three.js frontend
│   ├── src/
│   │   ├── main.ts           # Entry point, UI screen management
│   │   ├── network/
│   │   │   └── SocketClient.ts # Socket.io client wrapper
│   │   ├── ui/
│   │   │   ├── MainMenu.ts   # Create/Join room + How to Play button
│   │   │   ├── HowToPlay.ts  # Controls reference + game mechanics
│   │   │   ├── Settings.ts   # Sound volume, fullscreen, quality preset
│   │   │   ├── Lobby.ts      # Player list + ready button
│   │   │   ├── TeamSelect.ts # 32-team grid with flag, name, kit colours
│   │   │   └── PostMatch.ts  # Post-match results screen + rematch/leave
│   │   └── game/
│   │       ├── Pitch.ts           # 3D pitch, goals, stadium shell, lighting
│   │       ├── PlayerMesh.ts      # Low-poly humanoid player model
│   │       ├── BallMesh.ts        # Icosahedron soccer ball
│   │       ├── CameraController.ts # Tele-broadcast camera with lerp + flip
│   │       ├── Input.ts           # Keyboard capture + bitmask packing
│   │       ├── HUD.ts             # Score, clock, power bar, stamina, ping, mini-map
│   │       ├── HUD.test.ts        # 24 DOM-based HUD unit tests
│   │       └── ReplayController.ts # Slow-motion goal replay playback
│   ├── public/audio/ # SFX files (placeholder)
│   ├── index.html
│   └── package.json
├── shared/
│   └── types.ts     # Types shared between client & server (GameState, TeamData, PlayerData, etc.)
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

### How to Play Screen

A controls reference screen available from the Main Menu. Shows a table of all keyboard controls and explanations of charge-based kicking, player switching, and the stamina system.

### Settings Screen

A settings screen available from the Main Menu with the following options:

- **Sound Volume**: slider (0–100%) persisted to `localStorage` under the `nations-clash-settings` key
- **Fullscreen**: toggle checkbox that calls `requestFullscreen()` / `exitFullscreen()`
- **Quality Preset**: dropdown (Low / Medium / High) persisted for future rendering quality selection
- **Back** button returns to the Main Menu

The settings object is managed by `client/src/settings.ts` and is accessible from other modules via `getSettings()`.

### Multiplayer Flow

1. Open the app in two browser tabs
2. Player A clicks **Create Room** — a 6-character room code is generated
3. Player B enters the code and clicks **Join Room**
4. Both players see the lobby with their IDs and can click **Ready**
5. When both are ready, the **Team Select** screen appears with 32 World Cup teams
6. Each player clicks a team card (flag, name, kit colours) to select
7. Both players see each other's selection in real time
8. Home/away is assigned deterministically; both selected → match starts
9. After fulltime, a **Post-Match** screen shows the final score and goal scorers
10. Both players can click **Rematch** to start a new match with the same teams, or **Leave** to return to the main menu

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

### Goal Replay Camera

A dedicated camera angle activates during slow-motion goal replays (`client/src/game/CameraController.ts:85`):

- **Position**: elevated behind the goal that was scored on, looking toward the scorer
- **Height**: 50 units (vs. 40 for the broadcast camera) for a higher vantage point
- **Transition**: smooth lerp over ~0.5s into replay position and back to normal on end/skip
- **Follow**: the replay camera tracks the ball's x position during playback
- **Trigger**: `activateReplayMode(team, ballPosition)` on goal event; `deactivateReplayMode()` on replay end
- **Test coverage**: 7 unit tests covering positioning for both teams, elevation, lerp transitions, ball tracking, frustum containment, and return to normal

### Usage

```ts
// On goal event
cam.activateReplayMode('home', ballPosition)

// When replay ends or is skipped
cam.deactivateReplayMode()
```

## Input System

Client-side keyboard input capture and bitmask packing in `client/src/game/Input.ts`:

- **Keyboard listener**: tracks pressed/released keys via `keydown`/`keyup` DOM events
- **Keys**: Arrow Up/Down/Left/Right (or WASD), Shift (sprint), J (shoot), K (pass), L (tackle), U (slide tackle), I (switch player)
- **Switch player (I)**: switches control to the nearest outfield teammate to the ball; second-nearest if already closest
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

## In-Game HUD

The heads-up display in `client/src/game/HUD.ts` renders as an HTML/CSS overlay on top of the 3D canvas:

- **Score** (`#hud-score`): top centre, large text — `2 — 1`, updated every tick via `updateScore(teamA, teamB)`
- **Match clock** (`#hud-clock`): below the score, `MM:SS` format (e.g. `1:30` for 90 seconds), updated every tick via `updateClock(totalSeconds)`
- **Power bar**: bottom centre, a horizontal bar (`150×12 px`) that fills when charging shoot or pass. Colour gradient green → yellow → red as power increases. Visibility controlled by `showPowerBar(visible)`. Width set by `setPowerBar(fraction)`.
- **Active player indicator** (`#hud-active-player`): below the clock, shows `▶ playerId` with a team-coloured border. Updated via `setActivePlayer(playerId, teamColor)`.
- **Stamina bar** (`#hud-stamina`): below the active player indicator, a small horizontal bar (`100×6 px`) showing current stamina percentage. Colour: green (>50%), yellow (25–50%), red (<25%). Updated via `setStamina(fraction)`.
- **Ping indicator** (`#hud-ping`): top-right corner, e.g. `42ms`. Colour-coded green (<50ms), yellow (50–100ms), orange (101–200ms), red (>200ms). Rolling average of last 10 samples. Updated via `setPing(ms)`. Latency data from `SocketClient.getLatency()` (tracked via Socket.io's `pong` event).
- **Mini-map** (`#hud-minimap`): bottom-left corner, a `150×100` Canvas 2D pitch showing all 22 players as coloured dots (home red, away blue, GK yellow, human player outlined in white). Toggle visibility with the `M` key. Updated via `updateMiniMap(players)`.

- **Disconnect notification** (`#hud-disconnect`): centred overlay, red text, shows "Opponent disconnected — Xs" countdown during disconnect timeout. Shown via `showDisconnectNotification()`, hidden via `hideDisconnectNotification()`. Countdown managed by `startDisconnectCountdown(timeoutMs)` which updates every 200ms.

All HUD elements are mounted as children of `#hud-container` (an absolute overlay spanning the game container). 27 unit tests cover all elements.

## Sound Effects

Basic sound effects are managed by `client/src/game/Audio.ts`:

- **Preload**: all 6 sound files are loaded as `Audio` elements on startup
- **Volume**: read from the settings system (`localStorage` via `getSettings()`); updates take effect on the next play
- **Pitch variation**: the `play(name, pitch)` method sets `playbackRate` clamped to `[0.5, 2]` — used for the kick sound to vary pitch by charge power

### Sound Triggers

| Sound | File | Trigger |
|---|---|---|
| Kick | `kick.wav` | Shoot or pass release (pitch scaled by charge power) |
| Goal | `goal.wav` | `game:goal` event |
| Whistle (short) | `whistle-short.wav` | Kickoff, foul |
| Whistle (long) | `whistle-long.wav` | Halftime, full-time |
| Menu click | `menu-click.wav` | All UI button clicks (Create/Join Room, How to Play, Settings, Back, Ready, team select, rematch, leave) |
| Countdown beep | `countdown-beep.wav` | `game:event { type: 'countdown' }` |

### Audio Manager API

```ts
import { audio, AudioManager } from './game/Audio'

// Preload all sounds
audio.preload()

// Play a sound
audio.play('kick', 0.8)      // pitch = 0.8
audio.play('goal')            // default pitch

// Volume control (0–1)
audio.setVolume(0.5)
const vol = audio.getVolume() // 0.5
```

### Audio Files

Six `.wav` files reside in `client/public/audio/` — procedurally generated sine-wave tones (no external assets required, no attribution needed). To replace with production-quality sounds, drop `.ogg` or `.mp3` files with the same base names into that directory and update the `SOUND_FILES` map in `Audio.ts`.

### Test Coverage

12 unit tests in `client/src/game/Audio.test.ts` cover preload count, play invocation, pitch clamping, volume persistence, error handling, and the singleton export.

## Charge-Based Kick System (Shoot & Pass)

Server-side charge kicking in `server/src/match/Player.ts` with execution in `Match.ts`:

- **Charge**: hold `J` (shoot) or `K` (pass) to charge power; fills from 0→1 over ~1 second
- **Release**: releasing the key applies a kick impulse to the ball proportional to charge power
- **Shoot**: ball launches in the direction the player is facing
- **Pass**: ball launches toward the nearest teammate within a 30° cone (aim assist); falls back to facing direction if no teammate is in range
- **Power bar**: client-side HUD display (`client/src/game/HUD.ts`) shows a horizontal bar that fills while charging, colour-coded green/yellow/red by power level

### Test Coverage

49 unit tests cover charge start, accumulation, release, shoot/pass overlap, and power proportionality.

## Player Switching

Server-side player switching in `server/src/match/Match.ts`:

- **Key**: `I` to switch control to the nearest outfield teammate to the ball
- **Logic**: distances are computed per-tick using squared Euclidean distance from each outfield player to the ball
- **Second-nearest**: if the current controller is already the closest to the ball, pressing `I` switches to the second-closest
- **GK exclusion**: the goalkeeper is never selectable — always AI-controlled
- **Flag toggle**: `isHumanControlled` is toggled on the old and new player; the previous controller reverts to AI behaviour
- **Rising-edge**: the switch is triggered on key-down only (rising edge), so holding `I` does not cycle repeatedly
- **State broadcast**: `GameState` reflects `isHumanControlled` per player; the client HUD displays the active player ID with a team-coloured border

### Usage

```ts
// In Match tick — handled automatically via game:input bitmask
// Switch from current controller to nearest (or second-nearest) outfield player
match.handleInput(playerId, { switchPlayer: true, ... })
```

### Test Coverage

11 unit tests cover nearest-player selection, GK exclusion, second-nearest fallback, flag toggling, rising-edge detection, the no-outfield edge case, and state reflection.

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
- **Sprint**: 1.5× speed multiplier when stamina ≥ 25; reduced to 1.2× when stamina is 10–25; disabled below 10
- **Stamina drain**: 15 units/s while sprinting
- **Stamina regen**: 5 units/s after 1s delay while not sprinting
- **Ball control**: sprinting reduces control (1.5× drift multiplier) — ball offset from feet increases
- **Rotation**: player `rotation` is derived from the movement direction via `atan2`

## Stamina System

Server-side stamina management in `server/src/match/Player.ts`:

- **Stamina pool**: each player starts at 100, capped at 0–100
- **Drain**: 15 units/s while sprinting
- **Regen delay**: stamina does not regen for 1s after the last sprint tick
- **Regen rate**: 5 units/s after the 1s delay has elapsed
- **Speed tiers**:
  - `≥ 25 stamina`: full sprint (1.5× base speed)
  - `10–24 stamina`: reduced sprint (1.2× base speed)
  - `< 10 stamina`: sprint disabled entirely
- **Forced walk**: at 0 stamina the player must walk until some regen occurs
- **Ball control**: sprinting at full stamina applies a 1.5× drift multiplier to the ball; sprinting with depleted stamina or not sprinting applies 1.0×

### Test Coverage

54 Player tests cover drain rates, regen delay, speed tiers (full, reduced, disabled), stamina caps (0/100), diagonal normalisation, sprint toggling, and integration with input/charge/tackle.

### Usage

```ts
const player = new Player('p1', 'home')

// Each tick: apply input, then step position
player.applyInput(playerInput, cameraSide, delta)
player.tick(delta)
```

## AI Behaviour & Formations

Server-side AI for non-human players in `server/src/match/ai.ts` with formation templates in `server/src/data/formations.ts`:

- **Formations**: 5 templates (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2), each with 11 relative positions (GK + 10 outfield) mapped to absolute pitch coordinates
- **AI states** per player:
  - `HOLD`: stay near formation home position when team has possession and ball is outside player's zone
  - `CHASE`: pursue the ball when it enters the player's zone (~20 units)
  - `RETREAT`: fall back toward own half when opponent has possession
- **State transitions**: ball possession determines team-wide state; proximity to ball triggers CHASE; opponent possession triggers RETREAT
- **Goalkeeper AI**: stays on the goal line, interpolates x-position between ball and goal centre, dives toward fast shots heading toward goal within range
- **Human exclusion**: the human-controlled player is skipped during AI updates; only the 10 non-human outfield players plus the GK receive AI commands

### Exported functions

| Function | Description |
|---|---|
| `updateAI(match, state)` | Impure wrapper called from Match tick loop; updates all AI players and GK |

### Test Coverage

34 unit tests cover formation positions (all 5 formations, boundary checks), AI state transitions (HOLD/CHASE/RETREAT), GK positioning (goal line, interpolation, clamping, dive logic), and integration (possession-based states, velocity cap, pitch clamping).

## Teams Data

32 World Cup teams are defined in `server/src/data/teams.ts`:

- **32 teams** with names, flag emoji, home/away kit colours, default formation, and 11 players each
- **Real team colours**: each team's home and away colours approximate their real-world kits
- **Formations**: each team has a default formation from the 5 available templates
- **Players**: each team has exactly 11 players (1 GK + 10 outfield) with position roles
- **Unique IDs**: each team has a unique `id` used for selection and match setup

### Usage

```ts
import { TEAMS } from '../data/teams.js'

// All 32 teams
console.log(TEAMS.length) // 32

// Find a team by id
const england = TEAMS.find(t => t.id === 'england')

// Get home kit colour
const homeColour = england.homeColor // '#FFFFFF'
```

### Test Coverage

17 data validation tests cover team count, required fields, player count, valid roles, unique IDs, hex colour format, and formation references. 6 formation tests cover count, slot count, GK presence, and position bounds.

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

## Tackling System

Standing and slide tackles in `server/src/match/tackling.ts` with integration in `Player.ts` and `Match.ts`:

- **Standing Tackle (`L`)**: short-range lunge (~1.5 m reach). If the opponent has the ball and is within range, the ball pops loose and possession changes. Mistimed attempts carry a ~20% foul chance. A ~0.5 s cooldown follows any tackle attempt.
- **Slide Tackle (`U`)**: longer-range lunge (~3 m reach). The player slides along the ground for ~0.8 s, then enters a recovery period (~1 s) during which they cannot move or act. Higher foul chance (~40% on miss). On success the ball pops loose further; on miss the player is left out of position.
- **Foul detection**: if a tackle fails (no ball contact), a random roll determines whether a foul occurred. On foul, a `game:event { type: 'foul' }` is emitted. Slide tackles foul more often than standing tackles.
- **Rising edge**: tackle input is consumed on key-down only, so holding the key does not re-trigger.

### Exported functions (pure)

| Function | Description |
|---|---|
| `standingTackle(tacklerPos, opponentPos, opponentHasBall)` | Checks range, pops ball loose on success |
| `slideTackle(tacklerPos, opponentPos, opponentHasBall)` | Longer range version of standing tackle |
| `shouldFoul(tackleType)` | Random foul check based on tackle type probability |

### Constants

| Constant | Value |
|---|---|
| `TACKLE_STANDING_RANGE` | 1.5 m |
| `TACKLE_SLIDE_RANGE` | 3.0 m |
| `TACKLE_COOLDOWN` | 0.5 s |
| `SLIDE_DURATION` | 0.8 s |
| `SLIDE_RECOVERY` | 1.0 s |
| `FOUL_CHANCE_STANDING` | 20% |
| `FOUL_CHANCE_SLIDE` | 40% |

### Test Coverage

26 unit tests cover standing tackle range/success, slide tackle range/success, foul probability distribution (standing vs slide), tackle rising-edge detection, cooldown blocking, slide state machine (duration, recovery), and movement blocking during slide/recovery.

## Fouls & Free Kicks

Server-side free kick set-piece logic in `server/src/match/Match.ts`:

- **Foul trigger**: when a tackle fails (no ball contact), a random roll determines whether a foul occurred. Slide tackles foul more often than standing tackles.
- **Free kick setup**: on foul, the phase transitions to `freeKick`. The ball is placed at the foul position, all fouling-team players are moved to at least 9.15 m from the ball (and behind it toward their own goal). The nearest outfield player on the fouled team is assigned as the free kick taker.
- **Execution**: the fouled team's human-controlled player can shoot or pass using normal charge-based kick mechanics. After the kick, normal play resumes.
- **Network**: a `game:event { type: 'foul', position, foulingTeam, fouledTeam }` is emitted to both clients.
- **Client overlay**: a brief "FREE KICK" text overlay is shown for ~2 seconds on foul.

### Exported methods

| Method | Description |
|---|---|
| `startFreeKick(foulPosition, fouledTeam, foulingTeam)` | Transitions phase, places ball, moves players, assigns taker |
| `tickFreeKick()` | Per-tick update during free kick (processes inputs, awaits kick) |
| `executeFreeKick(kickRequest)` | Applies kick impulse and resumes normal play |

### Test Coverage

9 unit tests cover phase transition, ball placement, opposing player distance enforcement, taker assignment, tick idle behaviour, shoot/pass kick execution, lastTouch tracking, and foul event emission.

## Post-Match Screen & Rematch Flow

The post-match results screen in `client/src/ui/PostMatch.ts` is shown after fulltime:

- **Score display**: large centered score line — `Brazil 3 — 2 Argentina`
- **Goal scorers list**: each goal with scorer ID, team, and minute
- **Rematch button**: sends `match:rematchRequest` to server; disabled after first click
- **"Waiting for opponent..."**: shown after clicking rematch, before opponent agrees
- **"Opponent wants a rematch!"**: shown when opponent clicks rematch first
- **"Rematch accepted!"**: shown when both have agreed
- **Leave button**: sends `match:leave`, returns to main menu
- **Opponent left**: if opponent disconnects or leaves, status updates and returns to menu after 2s

### Rematch Flow

1. Match reaches fulltime → server emits `game:event { type: 'fulltime', score, goals, homeTeamName, awayTeamName }` and stops the match loop
2. Both clients show the PostMatch screen
3. Either player clicks Rematch → `match:rematchRequest` → server tracks agreement → `match:rematchStatus` with current requesters broadcast to both
4. Server detects both players have agreed → stops old match, creates a new `Match` with same teams/config
5. `match:rematchAccepted` then `match:start` emitted → both clients begin a new game

### Server Handling

- `rematchRequests: Map<string, Set<string>>` tracks per-room rematch status
- `matchSessions: Map<string, MatchSession>` stores the original team/config for reuse
- On `match:leave` or `disconnect`: match is stopped, player removed from room, opponent notified

## Disconnect Handling

Players can disconnect mid-match (closed tab, network drop, crash). The server handles this gracefully:

### Mid-Match Disconnect

1. Opponent disconnects → match simulation **pauses immediately**
2. A **15-second timeout** starts
3. Remaining player sees **"Opponent disconnected — Xs"** countdown overlay
4. If the player reconnects within 15s → timer cancelled, match resumes
5. If timer expires → `game:event { type: 'fulltime', winner }` emitted, opponent declared winner

### Lobby/Pre-Match Disconnect

- Player is removed from the room
- Remaining player is notified via `player:left`
- Empty rooms are cleaned up immediately

### Reconnection

- Room code is stored in `localStorage` under the `nations-clash-room` key
- On socket reconnect, `room:reconnect { roomCode }` is sent automatically
- Server re-associates the new socket ID with the existing player session
- Match state (timers, inputs) is transferred to the new socket ID

### Client Events

| Event | Direction | Payload |
|---|---|---|
| `game:event { type: 'player_disconnected' }` | S→C | `{ playerId, timeoutMs }` |
| `game:event { type: 'player_reconnected' }` | S→C | `{ playerId }` |

### Test Coverage

18 disconnect handling tests cover: disconnect marking, match pause, timer countdown, reconnect cancellation, timeout → fulltime with winner, lobby disconnect, session transfer via `updatePlayerId`, and reconnection before expiry preventing abandonment.

## Edge Cases

Server-side handling of match boundary conditions in `server/src/match/`:

### Own Goals

Goal detection in `goalDetection.ts` determines the scoring team based on which side of the pitch the ball crosses. If `lastTouch.team` does not match the scoring team, the goal is marked as an own goal (`isOwnGoal: true`, `scorer: null`). The `game:goal` event includes `isOwnGoal` so the client can display "(own goal)" next to the scorer name.

### Ball Out of Bounds

In `collision.ts`, `checkBallOutOfBounds()` returns true when the ball crosses the touchline (`|x| > 34`) or the goal line without scoring (`|z| > 52.5` beyond goal dimensions). When detected in `Match.ts`, the ball resets to the centre spot, `setupKickoff()` is called with possession awarded to the non-touching team (based on `lastTouch`), and a `game:event { type: 'ballOutOfBounds' }` is emitted.

### Extended Play (Overtime)

When the clock reaches 0 in the second half, the match enters **extended play** rather than ending immediately. The simulation continues running with the clock frozen at 0. Extended play ends on the next natural stoppage:

- **Goal scored**: the goal counts and the match transitions to fulltime
- **Ball out of bounds**: the match transitions to fulltime immediately

This ensures a goal scored on a ball that was in flight when the clock expired is counted, matching real football rules.

### Match Start Guard

During the pre-match countdown in `tickPreMatch()`, if either player has disconnected (`disconnectedPlayers.size > 0`), the countdown is paused and the match does not start. The countdown resumes only when both players are reconnected.

### Double Goal Prevention

A `goalCooldown` flag is set to `true` immediately after a goal is scored (`awardGoal()`). Goal detection is skipped while the flag is active. The flag is cleared when `setupKickoff()` runs, which occurs after the 3-second goal pause timer elapses. This prevents scenarios where a ball rebounding near the goal line could be counted twice.

### Test Coverage

10 edge case tests cover: ball out of bounds (touchline, goal line, within bounds), extended play (starts on clock=0, goal during extended play counts, out-of-bounds during extended play ends match, fulltime event emitted, firstHalf unaffected), double goal prevention (cooldown set/cleared), and match start guard (disconnect blocks transition).

## Network Events

| Event | Direction | Payload |
|---|---|---|---|---|---|---|---|
| `room:create` | C→S | — |
| `room:created` | S→C | `{ roomCode }` |
| `room:join` | C→S | `{ roomCode }` |
| `room:joined` | S→C | `{ code, players }` |
| `room:reconnect` | C→S | `{ roomCode }` |
| `room:error` | S→C | `{ message }` |
| `player:ready` | C→S | — |
| `player:left` | S→C | `{ playerId }` |
| `match:teamSelect` | S→C | `{ teams[] }` |
| `match:selectTeam` | C→S | `{ teamId }` |
| `team:selected` | S→C | `{ playerId, teamId, teamName }` |
| `bothTeamsSelected` | S→C | `{ home: { playerId, teamId, side, teamData }, away: {...} }` |
| `match:start` | S→C | `{ config, homeTeam?, awayTeam? }` |
| `game:input` | C→S | `{ keys: bitmask, chargeType, chargeTimestamp }` |
| `game:state` | S→C | `{ players[], ball, score, clock, phase }` |
| `game:goal` | S→C | `{ scorer, team, isOwnGoal, replayData }` |
| `game:event` | S→C | `{ type: 'foul'|'kickoff'|'halftime'|'fulltime'|'countdown'|'player_disconnected'|'player_reconnected', ... }` |
| `match:rematchRequest` | C→S | — |
| `match:rematchStatus` | S→C | `{ playerIds: string[] }` |
| `match:rematchAccepted` | S→C | — |
| `match:leave` | C→S | — |

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

1. Both players ready in lobby → `match:teamSelect` emitted with all 32 teams
2. **Team Select** screen renders a grid; each player clicks a team card
3. Each selection is sent via `match:selectTeam`; opponent's pick is broadcast via `team:selected`
4. When both have selected, home/away is assigned deterministically (seeded by room code)
5. `bothTeamsSelected` then `match:start` emitted with team assignments
6. A `Match` instance is created with the room's two player IDs
7. Each team has 11 players (1 GK + 10 outfield), first outfield player is human-controlled
8. Inputs flow via `game:input` bitmask events, consumed each tick

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
