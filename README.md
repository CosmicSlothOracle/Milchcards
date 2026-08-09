# Milchcards: AI-Driven Asset Pipeline & Automation

[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?style=flat-square&logo=netlify)](https://www.netlify.com/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Pipeline-Python-3776AB?style=flat-square&logo=python)](https://www.python.org/)

A **Proof of Concept** for an end-to-end AI asset workflow — from Midjourney generation through Python batch processing to a playable React frontend.

**[Live demo on Netlify](https://euphonious-pothos-d9e0a5.netlify.app)** · [Pipeline docs](docs/ai-pipeline.md)

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

## Workflow

```
Midjourney  →  manual curation  →  Python / ComfyUI batch processing  →  PNG assets  →  React game
```

1. **Generate** — structured Midjourney prompts per card category (politician, initiative, intervention)
2. **Process** — Python scripts and a ComfyUI workspace handle batch enhancement and export
3. **Ship** — finished assets land in [`public/assets/images/`](public/assets/images/), mapped in [`src/data/gameData.ts`](src/data/gameData.ts), consumed by the frontend

Details, prompt templates, and compliance notes: [`docs/ai-pipeline.md`](docs/ai-pipeline.md)

---

## AI Disclosure

> Portions of this game's visual assets were created with generative AI tools and were reviewed, edited, and integrated by human creators.

Artwork was generated with **Midjourney** (paid commercial subscription), then curated and modified by the developer. See [Midjourney Terms of Service](https://docs.midjourney.com/docs/terms-of-service).

---

## Tech Stack

React · TypeScript · GSAP · Howler · CSS 3D-transform board scaling · Netlify

Turn-based game engine with AI opponent, deck builder, and 600+ simulated balance matches.

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
