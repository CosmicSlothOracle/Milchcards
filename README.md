# Milchcards – React/TypeScript Turn-Based Card Game

[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?style=flat-square&logo=netlify)](https://www.netlify.com/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

A turn-based political card game built in **React**, **TypeScript**, and a custom game engine. Test your agenda.

**[Play it live here -> ](https://euphonious-pothos-d9e0a5.netlify.app)**

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


React · TypeScript · GSAP · Howler · CSS 3D-transform board scaling · Netlify

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

### 1v1 Online PvP (comeing soon)

Host-authoritative WebSocket relay in [`server/`](server/). Create/join a room code, pick premade decks, play. Deploy the relay with [`render.yaml`](render.yaml) (binds `0.0.0.0:$PORT`).

Production build deploys via [`netlify.toml`](netlify.toml) — push to `main` and Netlify rebuilds automatically.

```bash
npm run build
npx serve -s build
```
