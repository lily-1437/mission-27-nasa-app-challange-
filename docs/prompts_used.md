# Prompts used

| # | Purpose | Tool and model | Date |
|---|---|---|---|
| 0 | Master context | [AI Studio / model] | [date] |
| 1 | Scaffold, tokens, screen router | | |
| 2 | Home page | | |
| 3 | Story scenes | | |
| 4 | 3D engine, player, astronaut | | |
| 5 | Training Center, 6 mini-games | | |
| 6 | Moon world on real terrain | | |
| 7 | Clock, resources, XP, simple audio | | |
| 8 | 4 emergencies | | |
| 9 | Earth Observation console (EPIC) | | |
| 10 | Data loading and offline | | |
| 11 | Save, pause, report, handbook | | |
| 12 | Accessibility, tests, QA | | |

---

## Prompt 0 — Master context
Attach: dossier reference image. Add line: "Match the attached image for panel, label and corner-tick style. Do not copy it exactly."

```
You are a senior WebGL game developer. I'm building MISSION27, an educational
3D lunar outpost game for NASA Space Apps (ages 7-25). Tagline: "Train on
Earth. Survive the Moon." It is NOT an official NASA product.

STACK: vanilla HTML5/CSS3/ES modules + Three.js (r160+, vendored locally in
/lib, loaded via import map). No React, no bundler, no backend. Must run from
a static server and offline after first load.

FILES: index.html, style.css, /src/{main,state,ui,world,player,astronaut,
story,minigames,emergencies,economy,audio,storage,nasa,handbook,earthobs,
terrain}.js, /src/compute/{epic-match,slope,dose,pressure}.js, sw.js,
/assets/{models,textures,audio,video,epic,data}.

DATA RULES: Real data lives in /assets/data (epic-2024-05-10.json,
storm-record.json, moon-terrain.json, scenarios.json). Calculations live only
in /src/compute as small pure functions with no UI code. Every number shown from
real data carries its source, and a "Data Drawer" (key D) shows the raw record,
dataset name and source. Label real records "NASA DATA" or "NOAA DATA" and
anything the game computes or invents "MISSION27 SIMULATION".

DESIGN SYSTEM (UI only; flat, no gradients, no glow):
 bg #1C1C1E, surface #252527, text #E8E8E6, muted #8C8B88,
 accent #00BFCF (ONE primary action per screen), alert #FF4D5E (emergencies only).
 Fonts: Space Grotesk (display/headings), Inter (body 0.92rem/1.55),
 IBM Plex Mono (labels, 0.7rem, uppercase, 0.06em tracking). Self-host fonts.
 Radii 3/6/10px. Spacing 8/16/32.
 Layout language: framed panels (1px #8C8B88 border, small corner tick marks),
 label/value rows in mono caps (e.g. "OXYGEN ........ 94%"), dossier-style cards.
 Status is never color alone: always icon + text + shape.

RULES: Every file under 400 lines. JSDoc on exported functions. All tunables
in one CONFIG object in state.js. Target 60fps on integrated GPU.

Reply with complete files only, no placeholders, plus a 5-line test checklist.
```

## Prompt 1 — Scaffold, design tokens, screen router
Attach: dossier reference image. Add line: "Build the .panel, .row and .btn components to look like the attached image, using my flat color rules."

```
Build the foundation. Deliver index.html, style.css, main.js, state.js, ui.js.
- CSS custom properties for all design tokens. Components: .panel (framed,
  corner ticks via pseudo-elements), .row (label/value mono), .btn (primary =
  accent fill, secondary = outline), .toast, .modal, .tooltip, .drawer (Data Drawer).
- A screen state machine in state.js: HOME, STORY, TRAINING, MOON, REPORT,
  HANDBOOK, SETTINGS, MARS. API: go(screen, payload), onEnter/onExit hooks,
  history for back. Only one screen visible; 300ms fade (0ms if reduced-motion).
- Global focus rings, full keyboard navigation, prefers-reduced-motion and
  prefers-contrast support.
ACCEPTANCE: switching between all screens works via a temporary debug bar;
Tab order is logical; no console errors.
```

## Prompt 2 — Home page with video background
Attach: dossier reference image and a home layout mockup. Add line: "Attached is the UI style. The background video is /assets/video/home.mp4 and the poster /assets/video/poster.jpg."

```
Build the HOME screen.
- Full-screen <video> background (muted, loop, playsinline, preload=metadata),
  poster fallback, flat 55% dark overlay (no gradient). Pause video when the tab
  is hidden or reduced-motion is on (show poster instead).
- Title MISSION27 (Space Grotesk 3.5rem), tagline in mono caps.
- Menu in a framed panel: START MISSION (the only accent button), TRAINING,
  HANDBOOK, CONTINUE SAVED MISSION, RESET SAVE (confirm modal), plus small
  Settings and Mars (Coming Soon) links.
- A small Three.js canvas with an original procedural astronaut: head follows
  the cursor on hover, waves on click. Fall back gracefully if WebGL fails.
- If no save exists, CONTINUE is disabled with the text "No saved mission found."
ACCEPTANCE: menu usable by keyboard only; page works with video blocked.
```

## Prompt 3 — Story scenes
Attach: 1-3 concept images. Add line: "Use the attached images as the visual mood for the cutscene backgrounds. Files are in /assets/story/."

```
Build story.js: a data-driven cutscene player.
- Story data in /assets/data/story.json: scenes {id, level, background, lines:
  [{speaker, text, caption}], nextScreen}.
- Player UI: framed dossier panel, typewriter text (skippable, instant if
  reduced-motion), speaker ID card in the label/value style, SPACE/Enter = next,
  ESC = skip all, always-visible SKIP button, captions on if enabled.
- Write 3 short stories (3-4 scenes each, plain language, accurate science):
  (1) Why we return to the Moon, (2) Earth Training briefing, (3) Lunar outpost
  arrival at Shackleton Rim near the south pole. Characters: Ari (Commander),
  Maya (Systems), Leo (Science), Nova (Life Support).
- Tag any real fact "NASA DATA" and mark every fact I should verify with
  a TODO comment.
ACCEPTANCE: each story plays, skips, and routes to the correct next screen.
```

## Prompt 4 — 3D engine core
Attach: astronaut reference (front, side, back). Add line: "Build the procedural astronaut to match the attached design. Original design only, no copying existing characters."

```
Build world.js (renderer/scene/loader) and player.js.
- Renderer: ACES tone mapping, sRGB, shadow map 2048, pixel ratio capped at 2,
  adaptive quality (drop shadows/resolution if FPS<40 for 3s).
- Loading screen with progress bar and fun-fact tips.
- Third-person player: WASD, SHIFT run, smooth acceleration, camera follow with
  collision, AABB/capsule collision against a colliders list. Low-gravity feel
  (slower, floatier steps).
- Interaction system: raycast + proximity; show "[E] INSPECT" prompt anchored to
  the object; every interactable registers {id, label, range, onInteract}.
  Hold E (ring fills) for repairs.
- Procedural astronaut (astronaut.js): original design; animations: idle, walk,
  run, talk, repair, inspect, wave, react.
ACCEPTANCE: walk around a test room, interact with 3 test objects, FPS shown
in a debug overlay.
```

## Prompt 5 — Training Center and the 6 mini-games
Attach: a training facility interior photo. Add line: "Use the attached image for the mood and layout of the hub room."

```
Build the TRAINING screen: a walkable indoor facility (not an outpost).
- Hub with 6 doors/stations: Life Support Lab, Power Lab, Radiation Room,
  Greenhouse Lab, EVA Simulator, Command Room.
- minigames.js: a MiniGame base class {start, update, finish, skip, mount(el)}
  with a 20-60s timer. Each game must be a self-contained module that can be
  mounted both in the Training Center and inside a Moon emergency (Prompt 8),
  taking a "params" object so emergencies can change the difficulty.
- SKIP TRAINING is always visible (returns to the hub; a second click returns HOME).
- Games: (1) Life Support: find the leak on a pressure map and close the right
  valve; (2) Power: route limited power with a budget, life support cannot reach 0;
  (3) Radiation: move the crew to the shielded zone; (4) Greenhouse: water/light/
  nutrient sliders to keep growth in range; (5) EVA: monitor oxygen/cooling/
  battery; (6) Command Room: wire connecting.
- Each ends with a 2-line "why that worked" explanation, awards XP, saves
  progress. Keyboard-playable.
ACCEPTANCE: each game is winnable, losable, skippable, and mountable from outside.
```

## Prompt 6 — Moon world on real terrain
Attach: Moon surface photos, a base layout sketch, module concept images. Add line: "Match the attached images for lighting and module shapes."

```
Build the MOON world and terrain.js.
- Terrain from real data: load /assets/textures/shackleton-local-h16.bin
  (256x256, uint16 little-endian, row-major) and /assets/data/moon-terrain.json.
  Height in metres = elev_min_m + value/65535*(elev_max_m-elev_min_m). Use
  metres_per_pixel for the true horizontal scale. Also load
  shackleton-regional-h16.bin (128x128 at 50 m) for distant terrain and the minimap.
- Add small rocks and craters on top, instanced, labelled MISSION27 SIMULATION.
  The source terrain is smooth, so apply /assets/textures/moon-regolith-color.jpg,
  moon-regolith-normal.webp (OpenGL normal) and moon-regolith-rough.jpg as the
  surface material, tiled.
- Show "Terrain: NASA LRO LOLA DEM, Shackleton Rim, 5 m/px, partly interpolated"
  in the Data Drawer, with the credit text from moon-terrain.json.
- Single harsh directional sun, long shadows, starfield, Earth in the sky.
- src/compute/slope.js: slope in degrees at a point from the height grid, and a
  walking speed and suit battery drain multiplier from slope. Use it in player.js.
- Modules (procedural boxes and cylinders are fine): Habitat, Command, Power
  station + solar panels, Greenhouse, Science Lab, Airlock. Colliders and
  interactables for each; place them on the flattest ground.
ACCEPTANCE: walk the base, slopes slow the player, Data Drawer shows the source,
60fps desktop.
```

## Prompt 7 — Mission clock, resources, objectives, XP, simple audio
Attach: nothing.

```
Build state/economy logic (pure functions where possible) and a small audio.js.
- Clock: CONFIG.MISSION_SPEED = 1 sim-minute per real second (27 hours = about
  27 minutes), ends at H27:00, pauses on pause/modal/minigame.
- Resources: lifeSupport, power, safety, food, water with coupling rules
  (greenhouse: power+water -> food; low power -> slower growth; life-support
  emergency -> higher power draw; radiation shelter -> science paused).
- Objective manager: 2-3 active objectives, rotated by location.
- XP, 4 levels (Trainee -> Mission Commander), 6 badges with unlock rules.
- Compact HUD in a framed corner panel: mono labels, icon + number + bar.
- audio.js with Web Audio (procedural): master/music/sfx buses with sliders and
  mute, UI click, alarm, pressure hiss, footstep, ambience hum. Every sound also
  fires a caption and a visual cue.
ACCEPTANCE: resource coupling visibly works in a 5-minute run; game is fully
understandable with sound off.
```

## Prompt 8 — The 4 emergencies
Attach: nothing.

```
Build emergencies.js as a scheduler + state machine:
ALERT -> NOTICE -> TRAVEL -> INSPECT -> ACT -> CHANGE -> CONSEQUENCE -> RESUME.
Each emergency reuses its training mini-game module from minigames.js.
1. RADIATION (real data): load /assets/data/storm-record.json. Play the alert
   sequence from the record: flare events (class and times), then the proton
   rise. Flare class sets the severity tier (C, M, X), and the 10 pfu (>10 MeV)
   threshold triggers the shelter order. Rescale the real timestamps to game
   time. Tasks: read the radiation monitor, locate the crew, guide them to the
   shelter, secure the science instrument, then ONE decision (safety first, or
   continue science). Show the record id, class and source in the alert and in
   the Data Drawer, labelled NOAA DATA. Crew dose and shelter results are
   MISSION27 SIMULATION, computed in src/compute/dose.js.
2. DEPRESSURIZATION (simulation): four modules linked by hatches; pressure
   decays from a leak via src/compute/pressure.js (simple orifice-flow model
   from volume and hole size). Player reads the pressure map and closes the
   correct hatch or valve. Wrong hatch keeps the leak draining.
3. POWER FAILURE (simulation): generation drops; player goes to the power
   station, clears dust from a panel, then prioritises loads. Life support
   cannot reach 0.
4. GREENHOUSE (simulation): a physical fault (clogged filter, stuck valve); fix
   it, then restore water/light/nutrient bands from /assets/data/scenarios.json.
- Scheduler: min gap between emergencies, never during a mini-game, seeded RNG
  so QA can replay.
- Alerts: alert color + icon + text + caption + sound.
- Log each event {time, cause, playerAction, change, consequence, dataRef}.
ACCEPTANCE: a debug panel triggers each emergency; all 4 resolve and fail correctly;
the radiation event shows its NOAA record in the Data Drawer.
```

## Prompt 9 — Earth Observation console (EPIC)
Attach: nothing.

```
Build earthobs.js and src/compute/epic-match.js.
- A console in the Science Lab (press E). Panel title "DSCOVR satellite feed
  (NASA EPIC)". Never describe it as a view from the Moon.
- Load /assets/data/epic-2024-05-10.json. Use only records whose "image" name
  matches a file in /assets/epic/ (files are .jpg named <image>.jpg). Show
  each frame as a thumbnail with its real capture time (the "date" field) and
  its centroid latitude and longitude.
- Task: Mission Control asks "A flood was reported in Bangladesh (about 90 E).
  Find the frame where the region faces the camera." The player picks a frame.
  epic-match.js returns the frame whose centroid longitude is closest to the
  target and the angular distance; the game checks the answer with that function.
  Right answer gives XP and completes the objective. A wrong answer shows a
  hint such as "this frame is centered over the Pacific."
- Data Drawer (key D) shows the raw EPIC record and source, labelled NASA DATA.
ACCEPTANCE: the correct frame is epic_1b_20240510055119; keyboard-playable.
```

## Prompt 10 — Data loading and offline
Attach: nothing.

```
Build nasa.js and sw.js.
- Load the saved JSON files in /assets/data first, with a source badge (saved).
  Optional live refresh with the pattern live -> cache -> bundled fallback, and
  a visible badge (live/cache/fallback). Keep every base URL and key in CONFIG;
  keys are never hardcoded and never committed.
- Service worker: precache the shell, scripts, terrain .bin files, textures, the
  five EPIC images, the JSON data, core audio and the video poster; runtime
  cache for any API; versioned cache with cleanup.
- Disclaimer in the footer and settings: not an official NASA product.
ACCEPTANCE: after one load, the game runs with network disabled.
```

## Prompt 11 — Save, pause, report, replay list, handbook
Attach: nothing.

```
Build storage.js, the Mission Control pause menu, REPORT, an event list, handbook.
- Save versioned JSON to localStorage (time, resources, XP, objectives,
  emergencies, crew, training, position, settings); autosave every 30s; migrate
  on version change; guard every access with try/catch.
- ESC -> MISSION CONTROL: RESUME / RESTART MISSION / LEAVE TO HOME (saves, then
  returns home). Never trap the player.
- Report: dossier layout with all required stats and a command-style title.
- Replay: a simple clickable list from the event log showing what happened,
  what the player did, what changed, the consequence, and the data record used.
- Handbook: 6 cards, reachable anytime, pauses the clock.
ACCEPTANCE: save, reload, and continue works; restart fully resets.
```

## Prompt 12 — Accessibility, tests, QA
Attach: nothing.

```
Audit the whole project and fix everything: keyboard-only play, contrast >=4.5:1,
captions, reduced motion, icon+text status, tooltips, Simple Explanations toggle,
FPS on a throttled laptop, memory leaks on screen changes, console errors.
Add /tests/compute.html that runs known-input checks for epic-match.js, slope.js,
dose.js and pressure.js and shows pass or fail. Output a prioritized bug list
first, then the fixes.
```
