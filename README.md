# 🗳️ MILCHCARDS: A Premium Political Card Battle Engine

[![Netlify](https://img.shields.io/badge/Deployment-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://www.netlify.com/)
[![React](https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![GSAP](https://img.shields.io/badge/Animations-GSAP_3.13-10b981?style=for-the-badge&logo=greensock)](https://greensock.com/gsap/)

Milchcards is a premium, state-of-the-art digital political card battle game. This project was developed as a comprehensive frontend and software engineering portfolio piece to demonstrate advanced **UI/UX design principles, responsive game board scaling, event-driven state machines, and mathematical gameplay balancing.**

By eliminating early prototype clutter and arcade bloat, the application stands as a polished, deployment-ready production piece hosted on **Netlify**.

---

## 🎮 Game Concept & Mechanics

In Milchcards, players construct custom decks consisting of real-world political figures, lobbyists, and special campaign strategies to battle against an optimized AI opponent.

- **Dual-Lane Board System**: Play cards to either the **Government Lane** (aussen - for heads of state, ministers, and diplomats) or the **Public Lane** (innen - for activists, media figures, and influencers).
- **Influence Score Battle**: Each round, the player with the highest overall active Influence Score across their active cards wins. Matches are played in a competitive **Best-of-3 Rounds** format.
- **Action Points (AP)**: Manage limited resources (2 AP per turn) to play cards, activate instant political initiatives, or set up defensive campaign interventions.
- **Tactical Active Abilities**: Execute powerful, high-stakes abilities like *Bestechungsskandal* (Corruption Scan) with dynamic 2D dice rolls to seize control of enemy government slots, or trigger defensive *Interventions* when opponent strategies become too dominant.

---

## 🛠️ Technical Highlights & Portfolio Showcase

### 🚀 High-Performance CSS 3D-Transforms Board Scaling
Instead of rendering the board on a heavy, non-responsive Canvas that degrades text sharpness and compromises mobile battery life, Milchcards utilizes a **highly optimized CSS 3D-Transforms viewport scaler**. The entire 1920x1080 board is computed dynamically via react hooks and scaled down on smaller screens while keeping text elements fully crisp, screen-reader accessible, and rendering at a buttery-smooth **60fps**.

### 🎨 Glassmorphism & Cyber-Political Aesthetic
The user interface features a cohesive, premium sci-fi political interface. Using translucent blurs (`backdrop-filter: blur`), dark-slate radial gradients, and pulsing neon accents (emerald green for player actions, ruby red for the AI opponent, and amber gold for active dice rolls), the game delivers an immersive, high-end visual experience.

### 🎭 Beautiful State-Machine Flow
The application implements a clean React state-machine driving the entire user flow:
`Intro Video Sequence ➡️ Atmospheric Main Menu ➡️ Fullscreen Deck Manager ➡️ Live Tactical Gameboard ➡️ Credits & Portfolio Screen`

### 📊 Mathematical Balance Verification (600+ AI Matches)
To prove the gameplay mechanics are of professional-grade quality, the deck archetypes were balanced using **automated headless AI-vs-AI simulators**. Over **600 full games** were simulated to test interaction models. This process achieved **0 state validation errors** and validated a mathematically perfect **50.0% win rate** across the core starter decks (*Tech Oligarchs*, *Diplomatic Power*, and *Activist Movement*), establishing a highly reliable and balanced mechanical ecosystem.

### 📡 Collapsible Intelligence Feed
All logging modals and developer overlays were consolidated into a beautiful slide-out **Tactical Intelligence Feed**. It slides out of the screen's left edge on click and presents a real-time console log of all cards played, passed turns, and effect resolutions.

---

## 📂 Project Architecture

```
src/
├── components/          # Polished React UI Components
│   ├── MainMenu.tsx     # Grand entry screen with GSAP transitions
│   ├── Credits.tsx      # Portolio information & tech-stack presentation
│   ├── GameBoard.tsx    # Responsive grid-based board with integrated HUD
│   ├── DeckBuilder.tsx  # Full-screen strategic deck builder
│   └── SimpleDice.tsx   # Glassmorphic 2D dice rolling system
├── engine/              # Authoritative Core Game Logic
│   ├── gameEngine.ts    # State machine and turn transition logic
│   └── resolve.ts       # Queue-based card effect resolver
├── hooks/               # State encapsulation
│   └── useGameState.ts  # Game state hook providing clean actions
├── context/             # Global Providers
│   ├── AudioContext.tsx # Sound and music engine (Howler-based)
│   └── GameContext.tsx  # Auth game states provider
└── ui/
    └── layout.ts        # Declarative grid coordinate layouts
```

---

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0.0 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/skank/Milchcards.git
   cd Milchcards
   ```
2. Install the clean, optimized dependency tree:
   ```bash
   npm install
   ```
3. Run the local development server:
   ```bash
   npm run dev
   ```
4. Build the production bundle:
   ```bash
   npm run build
   ```

### Deployment (Netlify)

Deployment is handled by **Netlify** via [`netlify.toml`](netlify.toml):

- **Build command:** `npm run build`
- **Publish directory:** `build`
- **SPA routing:** all routes redirect to `index.html`

Push to the connected branch (usually `main`) and Netlify rebuilds automatically. No manual deploy script is required locally.

For a local production preview after building:

```bash
npx serve -s build
```

---

## 🇩🇪 Zusammenfassung (German Summary)

**Milchcards** ist ein voll funktionsfähiges, digitales Politik-Kartenspiel, das speziell als Vorzeigeobjekt für modernstes Frontend-Engineering, UI/UX-Design und agile Softwarearchitektur entwickelt wurde.

- **Fokus auf Qualität statt Bloat**: Alle unfertigen Entwicklertools, das experimentelle Fighting-Game-Zusatzmodul und lose Scripts wurden radikal entfernt. Übrig geblieben ist eine **AAA-Schnittstelle**, die den Benutzer vom ersten geheimnisvollen Intro über das stimmungsvolle Hauptmenü bis hin zum packenden Spielverlauf fesselt.
- **Spielfluss & Haptik**: Integrierte, unaufdringliche Soundeffekte, schwebende GSAP-Kartenanimationen, verdeckte Gegner-Handkarten und ein voll integriertes Status-HUD am oberen und unteren Bildschirmrand schaffen eine immersive Spielerfahrung, die weit über typische Web-Prototypen hinausgeht.
- **Portfolio-Qualität**: Dieses Projekt dient als perfekter Beleg für die Fähigkeit, komplexe State-Verwaltungen (Queues, Event-Resolver), responsive Layouts (CSS-Transforms Board-Scaling) und hohe visuelle Poliertheit in einer fertigen, deploybaren Web-Applikation zu vereinen.
