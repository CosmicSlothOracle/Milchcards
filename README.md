# Milchcards – React/TypeScript Turn-Based Card Game

[Netlify](https://www.netlify.com/)
[React](https://reactjs.org/)
[TypeScript](https://www.typescriptlang.org/)

A turn-based political card game built in **React**, **TypeScript**, and a custom game engine. Play your Cards right to outsmart your adversaries.

**[Live demo on Netlify](https://euphonious-pothos-d9e0a5.netlify.app)**

---



## Screenshots



### Intro & Menu



### Deck Manager







### Gameplay





### Card Detail Views



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

---



## AI-assisted asset pipeline

```
Midjourney  →  manual curation  →  Python / ComfyUI batch processing  →  PNG assets  →  React game
```

1. **Generate** — structured Midjourney prompts per card category (politician, initiative, intervention).
2. **Process** — Python scripts and a ComfyUI workspace handle batch enhancement and export.
3. **Ship** — finished assets land in `[public/assets/images/](public/assets/images/)`, mapped in `[src/data/gameData.ts](src/data/gameData.ts)`, and consumed by the frontend.

Details, prompt templates, and compliance notes: `[docs/ai-pipeline.md](docs/ai-pipeline.md)`

### AI Disclosure

Visual assets were generated with **Midjourney** (paid commercial subscription), then curated, edited, and integrated by the developer. Game logic and implementation are written in React/TypeScript. See [Midjourney Terms of Service](https://docs.midjourney.com/docs/terms-of-service).

---



## Music

Original music by **milch** (Laurin):

- [Milschice on SoundCloud](https://soundcloud.com/laur-in/butter)
- [Milschice on Spotify](https://open.spotify.com/track/19GAfHsKHSzM4vsO0laZeu?si=11b848f0a9f040fd)

---



### 1v1 PvP ( Online comeing soon)

Host-authoritative WebSocket relay in `[server/](server/)`. Create/join a room code, pick premade decks, play. Deploy the relay with `[render.yaml](render.yaml)` (binds `0.0.0.0:$PORT`).

Production build deploys via `[netlify.toml](netlify.toml)` — push to `main` and Netlify rebuilds automatically.

```bash
npm run build
npx serve -s build
```

---

## Architecture

For a high-level view of the game loop, see `[ARCHITECTURE.md](ARCHITECTURE.md)`.