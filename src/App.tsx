import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './App.css';
import { logger } from './debug/logger';
import GameBoard from './components/GameBoard';
import { DeckBuilder } from './components/DeckBuilder';
import { GameInfoModal } from './components/GameInfoModal';
import { EventLogModal } from './components/EventLogModal';
import { HandCardModal } from './components/HandCardModal';
import { GameLogModal } from './components/GameLogModal';
import UILayoutEditor from './components/UILayoutEditor';
import CardEffectTestSuite from './test/CardEffectTestSuite';
import QTEFrame from './components/QTEFrame';
import SpriteAtlasDemo from './components/SpriteAtlasDemo';
import { useGameState } from './hooks/useGameState';
import { BuilderEntry, PoliticianCard, Player } from './types/game';
import { Specials, Pols } from './data/gameData';
import { buildDeckFromEntries } from './utils/gameUtils';
import { copyDebugSnapshotToClipboard, downloadDebugSnapshot } from './utils/debugExport';
import { GameProvider } from './context/GameContext';
import { VisualEffectsProvider } from './context/VisualEffectsContext';
import { AudioProvider } from './context/AudioContext';
import { getCardDetails } from './data/cardDetails';
import { CardHoverInfoPanel } from './components/CardHoverInfoPanel';
import { IntroVideo } from './components/IntroVideo';
import { SequentialVideoPlayer } from './components/SequentialVideoPlayer';
import { MusicToggle } from './components/MusicToggle';
import { TutorialModal } from './components/TutorialModal';
import { AIBalanceTester } from './components/AIBalanceTester';
import Dice3D, { Dice3DHandle } from './components/Dice3D';
import SimpleDice from './components/SimpleDice';
// Temporarily disabled for build
// import { hasAnyZeroApPlay } from './utils/ap';

function AppContent() {
  // Old image atlas/background removed; cards load their own images per file mapping

  const [showIntro, setShowIntro] = useState(true);
  const [deckBuilderOpen, setDeckBuilderOpen] = useState(false);
  const [gameInfoModalOpen, setGameInfoModalOpen] = useState(true);
  const [eventLogModalOpen, setEventLogModalOpen] = useState(false);
  const [handCardModalOpen, setHandCardModalOpen] = useState(false);
  const [gameLogModalOpen, setGameLogModalOpen] = useState(false);
  const [aiBalanceTesterOpen, setAiBalanceTesterOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<any>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  // 🔧 DEV MODE: Toggle für lokales Testing ohne KI
  const [devMode, setDevMode] = useState(false);

  // 🎲 DICE: Toggle zwischen 3D und einfachem Würfel (Standard: einfacher Würfel für bessere Kompatibilität)
  const [useSimpleDice, setUseSimpleDice] = useState(true);

  // UI Layout Editor Route
  const [currentRoute, setCurrentRoute] = useState<'game' | 'ui-editor' | 'test-suite' | 'qte' | 'sprite-demo'>('game');

  const {
    gameState,
    selectedHandIndex,
    log,
    startMatchWithDecks,
    startMatchVsAI,
    playCard,
    activateInstantInitiative,
    runAITurn,
    selectHandCard,
    passTurn,
    nextTurn,
  } = useGameState();
  const corruptionActive = (gameState as any).pendingAbilitySelect?.type === 'corruption_steal';

  const actionHint = useMemo(() => {
    if (deckBuilderOpen) return null;
    if (corruptionActive) {
      return {
        title: 'Korruption aktiv',
        body: 'Wähle eine gegnerische Regierungs-Karte (gelb markiert) und würfle danach mit dem Dice.',
      };
    }
    if (selectedHandIndex !== null) {
      return {
        title: 'Slot wählen',
        body: 'Klicke auf einen passenden Slot, um die ausgewählte Handkarte auszuspielen.',
      };
    }
    return {
      title: 'Handkarte auswählen',
      body: 'Wähle eine Karte aus deiner Hand, um eine Aktion zu starten.',
    };
  }, [deckBuilderOpen, corruptionActive, selectedHandIndex]);

  // No global image preloading required

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'i' || event.key === 'I') {
        setGameInfoModalOpen(!gameInfoModalOpen);
      }
      if (event.key === 'l' || event.key === 'L') {
        setEventLogModalOpen(!eventLogModalOpen);
      }
      if (event.key === 'g' || event.key === 'G') {
        setGameLogModalOpen(!gameLogModalOpen);
      }
      // 🔧 DEV MODE: Toggle mit 'M' Taste (M für Manual-Mode)
      if (event.key === 'm' || event.key === 'M') {
        const newDevMode = !devMode;
        setDevMode(newDevMode);
        log(`🔧 DEV MODE ${newDevMode ? 'AKTIVIERT' : 'DEAKTIVIERT'} - KI ist ${newDevMode ? 'AUS' : 'AN'}`);
      }
      // 🔧 DEV MODE: Zusätzliche Controls für manuelles Testen
      if (devMode) {
        // 'P' für Pass (aktueller Spieler)
        if (event.key === 'p' || event.key === 'P') {
          passTurn(gameState.current);
          log(`⏭️ Player ${gameState.current} passt`);
        }

        // 'E' für Zug beenden (aktueller Spieler)
        if (event.key === 'e' || event.key === 'E') {
          nextTurn();
          log(`⏭️ Player ${gameState.current} beendet Zug`);
        }

        // 'A' für Sofort-Initiative aktivieren (aktueller Spieler)
        if (event.key === 'a' || event.key === 'A') {
          activateInstantInitiative(gameState.current);
          log(`🎯 Player ${gameState.current} aktiviert Sofort-Initiative`);
        }
      }

      // UI Layout Editor Toggle mit 'U' Taste
      if (event.key === 'u' || event.key === 'U') {
        setCurrentRoute(currentRoute === 'game' ? 'ui-editor' : 'game');
      }

      // Test Suite Toggle mit 'T' Taste
      if (event.key === 't' || event.key === 'T') {
        setCurrentRoute(currentRoute === 'game' ? 'test-suite' : 'game');
      }

      // Sprite Demo Toggle mit 'S' Taste
      if (event.key === 's' || event.key === 'S') {
        setCurrentRoute(currentRoute === 'game' ? 'sprite-demo' : 'game');
      }

      // Debug snapshot: Ctrl+D copies to clipboard, Shift+D downloads file
      if ((event.key === 'd' || event.key === 'D') && event.ctrlKey) {
        copyDebugSnapshotToClipboard(gameState).then(() => {
          logger.info('Debug snapshot copied to clipboard');
        }).catch(() => {});
      }
      if ((event.key === 'd' || event.key === 'D') && event.shiftKey) {
        downloadDebugSnapshot(gameState);
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameInfoModalOpen, eventLogModalOpen, gameLogModalOpen, devMode, log, gameState, passTurn, nextTurn, currentRoute, activateInstantInitiative]);

  const handleCardClick = useCallback((data: any) => {
    logger.info('🔧 DEBUG: handleCardClick called with:', data);
    if (!data) return;

    // Handle game control buttons


    if (data.type === 'button_pass_turn') {
      const currentPlayer = gameState.current;
      logger.info(`🔧 DEBUG: button_pass_turn clicked - currentPlayer: ${currentPlayer}`);
      log(`🎯 UI: Passen-Button geklickt - Spieler ${currentPlayer} passt`);
      log(`📊 FLOW: UI → passTurn(${currentPlayer}) | Button click | Data: { type: "button_pass_turn", current: ${currentPlayer} }`);
      passTurn(currentPlayer);
      return;
    }

    if (data.type === 'button_end_turn') {
      const currentPlayer = gameState.current;
      logger.info(`🔧 DEBUG: button_end_turn clicked - currentPlayer: ${currentPlayer}`);
      log(`🎯 UI: Zug-beenden-Button geklickt - Spieler ${currentPlayer} beendet Zug`);
      log(`📊 FLOW: UI → nextTurn() | Button click | Data: { type: "button_end_turn", current: ${currentPlayer} }`);
      nextTurn();
      return;
    }



    if (data.type === 'hand_p1') {
      if (gameState.current !== 1) {
        log('❌ ERROR: Handkarte geklickt aber nicht Spieler-Zug - Current: ' + gameState.current);
        return;
      }

      const same = selectedHandIndex === data.index;
      log('🎯 UI: Handkarte geklickt - ' + data.card.name + ' (Index: ' + data.index + ', Selected: ' + selectedHandIndex + ')');
      log('📊 FLOW: UI → handleCardClick | Card selection | Data: { card: "' + data.card.name + '", index: ' + data.index + ', same: ' + same + ' }');

      if (!same) {
        // Single click → Modal öffnen
        log('🎯 UI: Handkarte einfach geklickt → öffne Modal - ' + data.card.name);
        setHandCardModalOpen(true);
        selectHandCard(data.index);
      } else {
        // Double click → Karte direkt spielen (Auto-Platzierung)
        const card: any = data.card;
        const currentPlayer = gameState.current;
        const targetLane = card.kind === 'pol' ? (['Staatsoberhaupt','Regierungschef','Diplomat'].includes(card.tag) ? 'aussen' : 'aussen') : 'innen';
        log('🎯 UI: Handkarte doppelgeklickt → direkt spielen - ' + card.name + ' in ' + targetLane);
        playCard(currentPlayer, data.index, targetLane);
        selectHandCard(null);
      }
      return;
    }

    // 🔧 DEV MODE: Player 2 Hand Clicks
    if (data.type === 'hand_p2') {
      if (gameState.current !== 2) {
        log('❌ ERROR: P2 Handkarte geklickt aber nicht P2-Zug - Current: ' + gameState.current);
        return;
      }

      const same = selectedHandIndex === data.index;
      log('🎯 UI: P2 Handkarte geklickt - ' + data.card.name + ' (Index: ' + data.index + ', Selected: ' + selectedHandIndex + ')');
      log('📊 FLOW: UI → handleCardClick | P2 Card selection | Data: { card: "' + data.card.name + '", index: ' + data.index + ', same: ' + same + ' }');

      if (same) {
        // Double-click to open modal for P2
        log('🎯 UI: P2 Handkarte doppelgeklickt - ' + data.card.name);
        log('📊 FLOW: UI → setHandCardModalOpen(true) | P2 Double click | Data: { card: "' + data.card.name + '" }');
        setHandCardModalOpen(true);
      } else {
        // Fallback: UI index may not match authoritative state. Prefer UID lookup for P2.
        const uid = data.card?.uid ?? data.card?.id;
        const stateHand = gameState.hands?.[2] || [];
        let idxInState = stateHand.findIndex((c: any) => (c.uid ?? c.id) === uid);

        if (idxInState === -1) {
          console.warn('[DIAG] P2 hand click: card uid not found in state.hands[2]', { uid, data });
          log('❌ ERROR: P2 Karte nicht in Hand gefunden - UID: ' + uid);
          (window as any).__politicardDebug = {
            ...(window as any).__politicardDebug,
            lastClickMismatch: { ts: Date.now(), uid, data, player: 2 }
          };
          return;
        }

        log('🎯 UI: P2 Handkarte ausgewählt - ' + data.card.name + ' (Index: ' + idxInState + ')');
        log('📊 FLOW: UI → selectHandCard(' + idxInState + ') | P2 Card selection | Data: { card: "' + data.card.name + '", stateIndex: ' + idxInState + ' }');
        selectHandCard(idxInState);
      }
      return;
    }

    if (data.type === 'row_slot') {
      const currentPlayer = gameState.current;
      if (selectedHandIndex === null) {
        console.log('❌ ERROR: Slot geklickt aber keine Karte ausgewählt');
        return;
      }

      const playerHand = gameState.hands?.[currentPlayer];
      if (!playerHand || selectedHandIndex < 0 || selectedHandIndex >= playerHand.length) {
        console.log('❌ ERROR: Ungültige Hand oder Index - Index: ' + selectedHandIndex + ', Player: ' + currentPlayer + ', Hand-Größe: ' + (playerHand?.length || 0));
        return;
      }

      const card = playerHand[selectedHandIndex];
      if (!card) {
        console.log('❌ ERROR: Ausgewählte Karte nicht gefunden - Index: ' + selectedHandIndex + ', Player: ' + currentPlayer);
        return;
      }

      const lane = data.lane;
      console.log('🎯 UI: Karte auf Slot gespielt - ' + card.name + ' nach ' + (lane === 'aussen' ? 'Regierungsreihe' : 'Öffentlichkeitsreihe') + ' (Slot ' + (data.index + 1) + ') für Player ' + currentPlayer);
      console.log('📊 FLOW: UI → playCard(' + currentPlayer + ', ' + selectedHandIndex + ', "' + lane + '") | Card placement | Data: { card: "' + card.name + '", lane: "' + lane + '", slot: ' + (data.index + 1) + ', player: ' + currentPlayer + ' }');
      playCard(currentPlayer, selectedHandIndex, lane);
      selectHandCard(null);
      return;
    }

    if (data.type === 'empty_slot') {
      const currentPlayer = gameState.current;
      const clickedSlotType = data.slot;

      // Spezielle Behandlung für leere Instant-Slots
      if (clickedSlotType === 'instant') {
        if (selectedHandIndex === null) {
          console.log('ℹ️ INFO: Leerer Sofort-Initiative-Slot geklickt - wähle eine Sofort-Initiative aus der Hand aus');
          return;
        }
        // Fall durch zur normalen Slot-Logik
      } else if (selectedHandIndex === null) {
        console.log('❌ ERROR: Leerer Slot geklickt aber keine Karte ausgewählt');
        return;
      }

      const playerHand = gameState.hands?.[currentPlayer];
      if (!playerHand || selectedHandIndex < 0 || selectedHandIndex >= playerHand.length) {
        console.log('❌ ERROR: Ungültige Hand oder Index - Index: ' + selectedHandIndex + ', Player: ' + currentPlayer + ', Hand-Größe: ' + (playerHand?.length || 0));
        return;
      }

      const card = playerHand[selectedHandIndex];
      if (!card || card.kind !== 'spec') {
        console.log('❌ ERROR: Ausgewählte Karte ist keine Spezialkarte - Kind: ' + (card?.kind || 'null') + ', Player: ' + currentPlayer);
        return;
      }

      const specCard = card as any; // Cast to access type property
      const slotType = data.slot;

      console.log('🎯 UI: Leerer Slot geklickt - ' + card.name + ' auf ' + slotType);
      console.log('📊 FLOW: UI → handleCardClick | Empty slot click | Data: { card: "' + card.name + '", type: "' + specCard.type + '", slot: "' + slotType + '" }');

      // Check if card type matches slot
      if (slotType === 'permanent_government' && specCard.type === 'Dauerhaft-Initiative') {
        // Place permanent initiative in government slot
        console.log('🎯 UI: Dauerhafte Initiative in Regierungs-Slot gelegt - ' + card.name + ' für Player ' + currentPlayer);
        console.log('📊 FLOW: UI → playCard(' + currentPlayer + ', ' + selectedHandIndex + ') | Permanent initiative | Data: { card: "' + card.name + '", slot: "government", player: ' + currentPlayer + ' }');
        playCard(currentPlayer, selectedHandIndex);
        selectHandCard(null);
        return;
      }

      if (slotType === 'permanent_public' && specCard.type === 'Dauerhaft-Initiative') {
        // Place permanent initiative in public slot
        console.log('🎯 UI: Dauerhafte Initiative in Öffentlichkeits-Slot gelegt - ' + card.name + ' für Player ' + currentPlayer);
        console.log('📊 FLOW: UI → playCard(' + currentPlayer + ', ' + selectedHandIndex + ') | Permanent initiative | Data: { card: "' + card.name + '", slot: "public", player: ' + currentPlayer + ' }');
        playCard(currentPlayer, selectedHandIndex);
        selectHandCard(null);
        return;
      }

      if (slotType === 'instant' && specCard.type === 'Sofort-Initiative') {
        // Place instant initiative in sofort slot
        console.log('🎯 UI: Sofort-Initiative in Slot gelegt - ' + card.name + ' für Player ' + currentPlayer);
        console.log('📊 FLOW: UI → playCard(' + currentPlayer + ', ' + selectedHandIndex + ') | Instant initiative | Data: { card: "' + card.name + '", type: "Sofort-Initiative", player: ' + currentPlayer + ' }');
        playCard(currentPlayer, selectedHandIndex);
        selectHandCard(null);
        return;
      }

      console.log('❌ ERROR: Karten-Typ passt nicht zum Slot - Card: ' + specCard.type + ', Slot: ' + slotType);
      return;
    }

    // 🔧 NEU: Sofort-Initiative aus dem Slot aktivieren
    if (data.type === 'activate_instant') {
      const player = data.player as Player;
      const card = data.card;
      console.log('🎯 UI: Sofort-Initiative aus Slot aktiviert - ' + card.name + ' für Player ' + player);
      activateInstantInitiative(player);
      // trigger canvas instant sprite animation (slot-key pattern)
      try {
        const trig = (window as any).__pc_triggerInstantAnim || (window as any).pc_triggerInstantAnim;
        if (typeof trig === 'function') trig(`${player}.instant.0`);
      } catch (e) {}
      return;
    }
  }, [gameState, selectedHandIndex, playCard, selectHandCard, passTurn, nextTurn, log]);

  const handleCardHover = useCallback((data: any) => {
    setHoveredCard(data);
  }, []);

  const handleApplyDeck = useCallback((deck: BuilderEntry[]) => {
    const cardDeck = buildDeckFromEntries(deck);
    console.log('Applied deck:', cardDeck);
  }, []);

  const handleStartMatch = useCallback((p1Deck: BuilderEntry[], p2Deck: BuilderEntry[]) => {
    if (p1Deck && p1Deck.length > 0 && p2Deck && p2Deck.length > 0) {
      startMatchWithDecks(p1Deck, p2Deck);
    } else if (p1Deck && p1Deck.length > 0) {
      if (devMode) {
        // Dev Mode: Beide Spieler manuell steuern - nutze leere Decks
        startMatchWithDecks(p1Deck, []);
        log('🔧 DEV MODE: Spiel gestartet ohne KI - beide Spieler manuell steuerbar');
      } else {
        // Versus AI with empty deck if only P1 provided
        startMatchVsAI(p1Deck, '');
        log('🤖 KI-Spiel gestartet');
      }
    } else {
      // Use empty decks if no decks are provided
      startMatchWithDecks([], []);
      log('🎮 Spiel gestartet mit leeren Decks');
    }
  }, [startMatchWithDecks, startMatchVsAI, devMode, log]);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    setDeckBuilderOpen(true);
  }, []);

  const handlePlayCardFromModal = useCallback((index: number, targetSlot?: string) => {
    console.log('🔧 DEBUG: handlePlayCardFromModal called with:', index, targetSlot);
    const currentPlayer = gameState.current;
    const playerHand = gameState.hands?.[currentPlayer];
    if (!playerHand || index < 0 || index >= playerHand.length) {
      console.log('❌ DEBUG: Invalid hand or index:', index, 'for player:', currentPlayer, 'hand size:', (playerHand?.length || 0));
      return;
    }

    const card = playerHand[index];
    if (!card) {
      console.log('❌ DEBUG: No card found at index:', index, 'for player:', currentPlayer);
      return;
    }

    console.log('🔥 PLAYING CARD:', card.name, 'effectKey:', card.effectKey);

    // effectKey sicherstellen (Legacy-Namen → Keys)
    try {
      const { resolveEffectKey } = require('./effects/resolveEffectKey');
      const k = resolveEffectKey(card.name, (card as any).effectKey);
      if (k) (card as any).effectKey = k;
    } catch {}

    console.log('🔧 DEBUG: Card found:', card.name, 'for player:', currentPlayer);

    if (targetSlot === 'aussen' || targetSlot === 'innen') {
      console.log('🔧 DEBUG: Calling playCard with lane:', targetSlot);
      playCard(currentPlayer, index, targetSlot as any);
    } else {
      // Handle special slots
      console.log('🔧 DEBUG: Calling playCard without lane');
      log(`🃏 Player ${currentPlayer}: ${card.name} gespielt in ${targetSlot}`);
      // TODO: Implement special slot placement
      playCard(currentPlayer, index);
    }

    selectHandCard(null);
    // nextTurn() wird jetzt automatisch in playCard aufgerufen wenn nötig
  }, [gameState, playCard, selectHandCard, log]);

  // Auto-run AI turn whenever it's AI's turn (nur wenn nicht im Dev Mode)
  useEffect(() => {
    // Debug: Log auto-AI trigger checks
    if (gameState.current === 2) {
      console.log('🔍 AUTO_AI_CHECK: current=2, aiEnabled=', gameState.aiEnabled);
    }
    if (gameState.current === 2 && !devMode && gameState.aiEnabled?.[2] && !gameState.passed?.[2]) {
      console.log('🔔 AUTO_AI_RUN scheduled');
      const t = setTimeout(() => {
        console.log('🔔 AUTO_AI_RUN executing runAITurn');
        runAITurn();
      }, 120);
      return () => clearTimeout(t);
    }

    // If AI already passed, advance the turn (avoid AI stuck loop)
    if (gameState.current === 2 && gameState.passed?.[2]) {
      const t2 = setTimeout(() => {
        console.log('🔔 AUTO: AI passed - advancing turn');
        nextTurn();
      }, 120);
      return () => clearTimeout(t2);
    }
  }, [gameState, runAITurn, devMode]);



  // Old renderTooltip removed; using CardHoverInfoPanel component instead.

  return (
    <div style={{
      margin: 0,
      padding: 0,
      background: '#0b0f14',
      color: '#e8f0f8',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Sequential Video Player - Brand then Intro */}
      {showIntro && (
        <SequentialVideoPlayer
          onComplete={handleIntroComplete}
          brandVideoSrc="/assets/brand/apocallippo_brand.mp4"
          introVideoSrc="/assets/brand/intro.mp4"
          musicSrc="/assets/music/theme.mp3"
        />
      )}
      {/* Route Navigation Dropdown */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 1001,
      }}>
        <select
          value={currentRoute}
          onChange={(e) => {
            const route = e.target.value as 'game' | 'ui-editor' | 'test-suite' | 'qte' | 'sprite-demo';
            setCurrentRoute(route);
          }}
          style={{
            background: '#374151',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            minWidth: '150px',
          }}
        >
          <option value="game">🎮 Game</option>
          <option value="ui-editor">🎨 UI Editor</option>
          <option value="test-suite">🧪 Test Suite</option>
          <option value="qte">🕹 QTE</option>
          <option value="sprite-demo">🦾 Sprite Demo</option>
        </select>
      </div>
      <div style={{
        position: 'fixed',
        top: '52px',
        left: '10px',
        zIndex: 1001,
      }}>
        <button
          type="button"
          onClick={() => setTutorialOpen(true)}
          style={{
            background: '#0ea5e9',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            minWidth: '150px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
          }}
        >
          📘 Tutorial starten
        </button>
      </div>

      {currentRoute === 'ui-editor' ? (
        <UILayoutEditor />
      ) : currentRoute === 'test-suite' ? (
        <CardEffectTestSuite />
      ) : currentRoute === 'qte' ? (
        <QTEFrame onBack={() => setCurrentRoute('game')} />
      ) : currentRoute === 'sprite-demo' ? (
        <SpriteAtlasDemo />
      ) : (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'grid',
          gridTemplateRows: '1fr',
          gap: 0,
          padding: 0,
        }}>
          <VisualEffectsProvider>
            <div style={{
              position: 'relative',
              overflow: 'hidden',
              background: '#0e141b',
            }}>
              <GameBoard
                gameState={gameState}
                selectedHandIndex={selectedHandIndex}
                onCardClick={handleCardClick}
                onCardHover={handleCardHover}
                devMode={devMode}
              />

              <DeckBuilder
                isOpen={deckBuilderOpen}
                onClose={() => setDeckBuilderOpen(false)}
                onApplyDeck={handleApplyDeck}
                onStartMatch={handleStartMatch}
                onStartVsAI={(p1Deck) => {
                  try {
                    startMatchVsAI(p1Deck, '');
                    log('🤖 Spiel vs KI mit zufälligem Premade-Deck gestartet');
                  } catch (error) {
                    console.error('Start vs AI failed', error);
                    log('❌ Fehler: KI-Start fehlgeschlagen');
                  }
                }}
              />

              {/* Music Toggle for DeckBuilder */}
              {deckBuilderOpen && (
                <div style={{
                  position: 'fixed',
                  top: '20px',
                  right: '20px',
                  zIndex: 1000,
                }}>
                  <MusicToggle size="medium" />
                </div>
              )}

              {!deckBuilderOpen && (
                <GameInfoModal
                  gameState={gameState}
                  isVisible={gameInfoModalOpen}
                  onToggle={() => setGameInfoModalOpen(!gameInfoModalOpen)}
                  onPassTurn={passTurn}
                  onToggleLog={() => setGameLogModalOpen(!gameLogModalOpen)}
                  onCardClick={handleCardClick}
                  devMode={devMode}
                />
              )}

              {!deckBuilderOpen && (
                <EventLogModal
                  gameState={gameState}
                  isVisible={eventLogModalOpen}
                  onToggle={() => setEventLogModalOpen(!eventLogModalOpen)}
                />
              )}

              {!deckBuilderOpen && (
                <HandCardModal
                  gameState={gameState}
                  selectedHandIndex={selectedHandIndex}
                  isVisible={handCardModalOpen}
                  onClose={() => setHandCardModalOpen(false)}
                  onPlayCard={handlePlayCardFromModal}
                />
              )}

              {!deckBuilderOpen && (
                <GameLogModal
                  gameState={gameState}
                  isVisible={gameLogModalOpen}
                  onToggle={() => setGameLogModalOpen(!gameLogModalOpen)}
                />
              )}

              <TutorialModal isVisible={tutorialOpen} onClose={() => setTutorialOpen(false)} />

              {actionHint && (
                <div className="action-hint">
                  <div className="action-hint__title">{actionHint.title}</div>
                  <div className="action-hint__body">{actionHint.body}</div>
                </div>
              )}

              <CardHoverInfoPanel hovered={hoveredCard} />

              {/* Dice - Dev utility with fallback */}
              <div className={corruptionActive ? 'game-dice game-dice--highlight' : 'game-dice'}>
                {useSimpleDice ? (
                  <SimpleDice
                    size={120}
                    onRoll={(f) => {
                      console.log('Simple dice rolled', f);
                      // Dispatch dice result for corruption system
                      try {
                        window.dispatchEvent(new CustomEvent('pc:dice_result', { detail: { roll: f } }));
                      } catch(e) {
                        console.error('Error dispatching dice result:', e);
                      }
                    }}
                  />
                ) : (
                  <Dice3D
                    size={120}
                    duration={900}
                    onRoll={(f) => {
                      console.log('3D dice rolled', f);
                      // Dispatch dice result for corruption system
                      try {
                        window.dispatchEvent(new CustomEvent('pc:dice_result', { detail: { roll: f } }));
                      } catch(e) {
                        console.error('Error dispatching dice result:', e);
                      }
                    }}
                  />
                )}
              </div>

              {/* 🔧 DEV MODE Indikator */}
              {devMode && (
                <div style={{
                  position: 'fixed',
                  top: '10px',
                  right: '10px',
                  background: '#ff6b35',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 1000,
                }}>
                  🔧 DEV MODE - KI AUS
                </div>
              )}

              {/* 🎲 DICE Toggle Button */}
              <button
                onClick={() => setUseSimpleDice(!useSimpleDice)}
                style={{
                  position: 'fixed',
                  top: '10px',
                  left: '10px',
                  background: useSimpleDice ? '#10b981' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  zIndex: 1300,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                title={useSimpleDice ? 'Switch to 3D dice (WebGL required)' : 'Switch to simple dice (recommended)'}
              >
                🎲 {useSimpleDice ? '3D' : 'Simple'} {useSimpleDice ? '✓' : ''}
              </button>

              {/* Music Toggle for In-Game */}
              {!deckBuilderOpen && (
                <div style={{
                  position: 'fixed',
                  top: '20px',
                  right: devMode ? '120px' : '20px',
                  zIndex: 1000,
                }}>
                  <MusicToggle size="medium" />
                </div>
              )}

              {/* 🎯 Current Player Indicator (immer sichtbar im Dev Mode) */}
              {devMode && (
                <div style={{
                  position: 'fixed',
                  top: '60px',
                  right: '10px',
                  background: gameState.current === 1 ? '#4ade80' : '#ef4444',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 1000,
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                }}>
                  🎮 Player {gameState.current} am Zug
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 400,
                    opacity: 0.9,
                    marginTop: '4px',
                  }}>
                    AP: {gameState.actionPoints[gameState.current]}
                  </div>
                </div>
              )}

              {/* 🤖 AI Balance Tester Button (Dev Mode) */}
              {devMode && (
                <div style={{
                  position: 'fixed',
                  top: '140px',
                  right: '10px',
                  zIndex: 1000,
                }}>
                  <button
                    onClick={() => setAiBalanceTesterOpen(true)}
                    style={{
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    🤖 AI Balance Tester
                  </button>
                </div>
              )}

              {/* AI Balance Tester Modal */}
              <AIBalanceTester
                isOpen={aiBalanceTesterOpen}
                onClose={() => setAiBalanceTesterOpen(false)}
              />
            </div>
          </VisualEffectsProvider>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AudioProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </AudioProvider>
  );
}

export default App;
