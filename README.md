# Milchcards – React/TypeScript Turn-Based Card Game

[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?style=flat-square&logo=netlify)](https://www.netlify.com/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

A turn-based political card game built in **React**, **TypeScript**, and a custom game engine. Play against an AI opponent, build your own deck, or challenge another player in online 1v1 PvP.

**[Live demo on Netlify](https://euphonious-pothos-d9e0a5.netlify.app)**

---

## Screenshots

### Intro & Menu

<p align="center">
  <img src="./public/screenshots/in.png" alt="Intro" width="720" />
</p>

### Deck Manager

<p align="center">
  <img src="./public/screenshots/deckmanager.png" alt="Deck Manager" width="900" />
</p>

<p align="center">
  <img src="./public/screenshots/deckmanager_cardview1.png" alt="" width="440" />
  <img src="./public/screenshots/deckmanager_cardview2.png" alt="" width="440" />
</p>
<p align="center">
  <img src="./public/screenshots/deckmanager_cardview3.png" alt="" width="440" />
  <img src="./public/screenshots/deckmanager_cardview4.png" alt="" width="440" />
</p>

### Gameplay

<p align="center">
  <img src="./public/screenshots/board1.png" alt="" width="440" />
  <img src="./public/screenshots/board4.png" alt="" width="440" />
</p>
<p align="center">
  <img src="./public/screenshots/board5.png" alt="" width="440" />
  <img src="./public/screenshots/board23.png" alt="" width="440" />
</p>

### Card Detail Views

<p align="center">
  <img src="./public/screenshots/ini_1.png" alt="" width="440" />
  <img src="./public/screenshots/Inter_1.png" alt="" width="440" />
</p>

---

## What is Milchcards?

Milchcards is a **React/TypeScript turn-based card game** with:

- A custom **turn-based game engine** with action points, board zones, and an effect queue.
- A **deck builder** with premade decks and custom builds.
- A **heuristic AI opponent** with adjustable difficulty.
- Online **1v1 PvP** over a host-authoritative WebSocket relay.
- Card artwork produced with an **AI-assisted visual asset pipeline** and manually curated.

The game logic, UI, and implementation are written in **React/TypeScript**. The AI pipeline is used for the visual assets only.

---

## Tech Stack

React · TypeScript · GSAP · Howler · CSS 3D-transform board scaling · Netlify

Turn-based game engine with AI opponent, deck builder, and 600+ simulated balance matches.

---

## AI-assisted asset pipeline

```
Midjourney  →  manual curation  →  Python / ComfyUI batch processing  →  PNG assets  →  React game
```

1. **Generate** — structured Midjourney prompts per card category (politician, initiative, intervention).
2. **Process** — Python scripts and a ComfyUI workspace handle batch enhancement and export.
3. **Ship** — finished assets land in [`public/assets/images/`](public/assets/images/), mapped in [`src/data/gameData.ts`](src/data/gameData.ts), and consumed by the frontend.

Details, prompt templates, and compliance notes: [`docs/ai-pipeline.md`](docs/ai-pipeline.md)

### AI Disclosure

Visual assets were generated with **Midjourney** (paid commercial subscription), then curated, edited, and integrated by the developer. Game logic and implementation are written in React/TypeScript. See [Midjourney Terms of Service](https://docs.midjourney.com/docs/terms-of-service).

---

## Music

Original music by **milch** (Laurin):

- [Milschice on SoundCloud](https://soundcloud.com/laur-in/butter)
- [Milschice on Spotify](https://open.spotify.com/track/19GAfHsKHSzM4vsO0laZeu?si=11b848f0a9f040fd)

---

## Run Locally

```bash
git clone https://github.com/CosmicSlothOracle/Milchcards.git
cd Milchcards
npm install
npm run pvp:install   # once: WebSocket relay deps
npm run dev           # CRA client on :3000
# in a second terminal:
npm run pvp           # 1v1 relay on :8081
# or both together:
npm run dev:all
```

Set `REACT_APP_WS_URL` (see `.env.example`) if the relay is not on `ws://localhost:8081`.

### 1v1 Online PvP

Host-authoritative WebSocket relay in [`server/`](server/). Create/join a room code, pick premade decks, play. Deploy the relay with [`render.yaml`](render.yaml) (binds `0.0.0.0:$PORT`).

Production build deploys via [`netlify.toml`](netlify.toml) — push to `main` and Netlify rebuilds automatically.

```bash
npm run build
npx serve -s build
```

---

## Development Notes

### What I built

A complete turn-based card game in React/TypeScript: a deterministic game engine, card effect queue, deck builder, AI opponent, WebSocket PvP relay, and a UI that scales from desktop to mobile with CSS 3D transforms.

### What I learned

Building a real-time card game in React taught me how to separate **game state** from **presentation**, how to queue and resolve card effects deterministically, and how much value a stable test suite adds once the rules start interacting in unexpected ways.

### What I would improve next

- Replace the heuristic AI with a search-based or learned opponent.
- Add authentication to the PvP relay.
- Balance the card pool with more playtesting data.
- Integrate the animation engine more tightly with the card effect queue.

---

## Known Limitations

- **AI opponent** is heuristic, not optimal.
- **PvP relay** is not authenticated — anyone with a room code can join.
- **Visual assets** are AI-generated and may need further curation or replacement for commercial release.
- **Card balance** is still iterative and based on simulated matches rather than live player data.
- **Animation tests** are stabilized against jsdom limitations; some use targeted DOM access.

---

## Verification

After a clean install, the project builds and all tests pass on this machine:

```bash
npm install
npm run build
CI=true npm test -- --watchAll=false
```

Latest run:

- `npm install`: success (1642 packages)
- `npm run build`: success
- `CI=true npm test -- --watchAll=false`: **27 test suites passed, 218 tests passed**

ESLint is re-enabled (no global rule disabling). The production build path has no lint errors. A number of warnings remain — mostly around hook dependency arrays that would trigger false-positive re-renders if blindly followed, plus unused variables in tooling scripts and balance simulators. These are handled case by case rather than with blanket rule disabling.

---

## Commit History Note

If this repo has not been promoted publicly yet, consider creating a curated portfolio branch or a new public repository with a clean history: `setup → engine → UI → PvP → tests → docs`. Avoid force-pushing to a branch that is already shared.

---

## Architecture

For a high-level view of the game loop, see [`ARCHITECTURE.md`](ARCHITECTURE.md).
