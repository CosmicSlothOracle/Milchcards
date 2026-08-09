import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './App.css';
import { logger } from './debug/logger';
import GameBoard from './components/GameBoard';
import { DeckBuilder } from './components/DeckBuilder';
import { HandCardModal } from './components/HandCardModal';
import { useGameState } from './hooks/useGameState';
import { BuilderEntry, Player } from './types/game';
import { buildDeckFromEntries } from './utils/gameUtils';
import { copyDebugSnapshotToClipboard, downloadDebugSnapshot } from './utils/debugExport';
import { GameProvider } from './context/GameContext';
import { VisualEffectsProvider } from './context/VisualEffectsContext';
import { AudioProvider } from './context/AudioContext';
import { CardHoverInfoPanel } from './components/CardHoverInfoPanel';
import { SequentialVideoPlayer } from './components/SequentialVideoPlayer';
import { MusicToggle } from './components/MusicToggle';
import { TutorialModal } from './components/TutorialModal';
import SimpleDice from './components/SimpleDice';
import { MainMenu } from './components/MainMenu';
import { Credits } from './components/Credits';
import { RotateDeviceOverlay } from './components/RotateDeviceOverlay';
import { PvpLobby } from './components/PvpLobby';
import { ActionFeedback } from './components/ActionFeedback';
import { VictoryOverlay } from './components/VictoryOverlay';
import { useMobileLayout } from './hooks/useMobileLayout';
import { usePvpSession } from './hooks/usePvpSession';
import { PvpAction, RELAYED_ENGINE_EVENTS } from './pvp/types';
import { presetToBuilderEntries, PRESET_DECKS, randomPresetDeck } from './data/presetDecks';

type AppState = 'intro' | 'menu' | 'deckbuilder' | 'game' | 'credits' | 'pvp-lobby';

function AppContent() {
  const [appState, setAppState] = useState<AppState>('intro');
  const [handCardModalOpen, setHandCardModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<any>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const mobile = useMobileLayout();
  const showRotateOverlay = appState === 'game' && mobile.isMobile && mobile.isPortrait;
  const diceSize = mobile.isMobile && mobile.isLandscape ? 72 : 120;

  // Simple dice logic
  const [diceOutcome, setDiceOutcome] = useState<'success' | 'fail' | null>(null);
  const diceOutcomeTimer = useRef<number | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const diceRollingTimer = useRef<number | null>(null);

  const {
    gameState,
    selectedHandIndex,
    log,
    startMatchWithDecks,
    startMatchVsAI,
    playCard,
    activateInstantInitiative,
    startNewGame,
    runAITurn,
    selectHandCard,
    passTurn,
    nextTurn,
    setAiEnabled,
    applyRemoteGameState,
  } = useGameState();

  // ----- PvP (1v1 online) -----
  // Host (P1) runs the engine and publishes state; guest (P2) renders the
  // synced state and forwards actions.
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const handleRemoteAction = useCallback((action: PvpAction) => {
    switch (action.t) {
      case 'play_card':
        playCard(2, action.index, action.lane);
        break;
      case 'pass':
        passTurn(2);
        break;
      case 'end_turn':
        if (gameStateRef.current.current === 2) nextTurn();
        break;
      case 'activate_instant':
        activateInstantInitiative(2);
        break;
      case 'event':
        if ((RELAYED_ENGINE_EVENTS as readonly string[]).includes(action.name)) {
          window.dispatchEvent(new CustomEvent(action.name, { detail: action.detail ?? undefined }));
        }
        break;
    }
  }, [playCard, passTurn, nextTurn, activateInstantInitiative]);

  const pvp = usePvpSession({
    onRemoteAction: handleRemoteAction,
    onRemoteState: applyRemoteGameState,
    onPhaseChange: (phase) => {
      if (phase === 'started') {
        setAppState('game');
      } else if (phase === 'closed') {
        setAppState('menu');
      }
    },
  });
  const pvpRole = pvp.role;
  const { sendAction: pvpSendAction, publishState: pvpPublishState } = pvp;

  // Host: publish authoritative state after every change while playing
  useEffect(() => {
    if (pvpRole === 'host' && pvp.status === 'playing') {
      pvpPublishState(gameState);
    }
  }, [gameState, pvpRole, pvp.status, pvpPublishState]);

  const handleStartPvpMatch = useCallback((p1DeckName: string, p2DeckName: string) => {
    const p1Preset = PRESET_DECKS.find(d => d.name === p1DeckName) || randomPresetDeck();
    const p2Preset = PRESET_DECKS.find(d => d.name === p2DeckName) || randomPresetDeck();
    log(`🌐 PvP: P1 erhält "${ p1Preset.name }", P2 erhält "${ p2Preset.name }"`);
    setAiEnabled(false);
    startMatchWithDecks(
      presetToBuilderEntries(p1Preset, log),
      presetToBuilderEntries(p2Preset, log),
    );
    pvp.markStarted();
    setAppState('game');
  }, [log, setAiEnabled, startMatchWithDecks, pvp]);

  const pendingAbilitySelect = (gameState as any).pendingAbilitySelect;
  const pendingAbility = pendingAbilitySelect?.type;
  const corruptionActive = pendingAbility === 'corruption_steal';
  const maulwurfActive = pendingAbility === 'maulwurf_steal';
  const tunnelvisionActive = pendingAbility === 'tunnelvision_probe';

  const requestPendingDiceRoll = useCallback(() => {
    const sel = pendingAbilitySelect;
    if (!sel) return;
    if (sel.type === 'maulwurf_steal') {
      window.dispatchEvent(new CustomEvent('pc:maulwurf_request_roll', {
        detail: { player: sel.actorPlayer, targetUid: sel.targetUid },
      }));
    } else if (sel.type === 'corruption_steal' && sel.targetUid) {
      window.dispatchEvent(new CustomEvent('pc:corruption_request_roll', {
        detail: { player: sel.actorPlayer, targetUid: sel.targetUid },
      }));
    } else if (sel.type === 'tunnelvision_probe') {
      window.dispatchEvent(new CustomEvent('pc:tunnelvision_request_roll', {
        detail: {
          player: sel.actorPlayer,
          targetUid: sel.targetUid,
          requiredRoll: sel.requiredRoll,
          influence: sel.influence,
        },
      }));
    }
  }, [pendingAbilitySelect]);

  useEffect(() => {
    const handleCorruptionResolved = (event: Event) => {
      const detail = (event as CustomEvent).detail as { success?: boolean };
      const success = Boolean(detail?.success);
      setDiceOutcome(success ? 'success' : 'fail');
      if (diceOutcomeTimer.current) window.clearTimeout(diceOutcomeTimer.current);
      diceOutcomeTimer.current = window.setTimeout(() => {
        setDiceOutcome(null);
        diceOutcomeTimer.current = null;
      }, 1400);
    };

    const handleCorruptionRoll = () => {
      setDiceRolling(true);
      if (diceRollingTimer.current) window.clearTimeout(diceRollingTimer.current);
      diceRollingTimer.current = window.setTimeout(() => {
        setDiceRolling(false);
        diceRollingTimer.current = null;
      }, 1100);
    };

    window.addEventListener('pc:corruption_resolved', handleCorruptionResolved as EventListener);
    window.addEventListener('pc:probe_resolved', handleCorruptionResolved as EventListener);
    window.addEventListener('pc:corruption_roll_started', handleCorruptionRoll as EventListener);
    return () => {
      window.removeEventListener('pc:corruption_resolved', handleCorruptionResolved as EventListener);
      window.removeEventListener('pc:probe_resolved', handleCorruptionResolved as EventListener);
      window.removeEventListener('pc:corruption_roll_started', handleCorruptionRoll as EventListener);
    };
  }, []);

  useEffect(() => (
    () => {
      if (diceOutcomeTimer.current) window.clearTimeout(diceOutcomeTimer.current);
      if (diceRollingTimer.current) window.clearTimeout(diceRollingTimer.current);
    }
  ), []);

  const actionHint = useMemo(() => {
    if (appState === 'deckbuilder') return null;
    if (corruptionActive) {
      return {
        title: 'Korruption aktiv',
        body: 'Wähle eine gegnerische Regierungs-Karte (gelb markiert) und würfle danach mit dem Dice.',
      };
    }
    if (maulwurfActive) {
      return {
        title: 'Maulwurf aktiv',
        body: 'Ziel ist markiert. Würfle, um die Übernahme zu prüfen.',
      };
    }
    if (tunnelvisionActive) {
      return {
        title: 'Tunnelvision-Probe',
        body: 'Würfle, um die Regierungskarte platzieren zu dürfen.',
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
  }, [appState, corruptionActive, maulwurfActive, tunnelvisionActive, selectedHandIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Secret key to trigger dev mode (M for Manual Mode)
      if (event.key === 'm' || event.key === 'M') {
        const newDevMode = !devMode;
        setDevMode(newDevMode);
        log(`🔧 DEV MODE ${ newDevMode ? 'AKTIVIERT' : 'DEAKTIVIERT' } - KI ist ${ newDevMode ? 'AUS' : 'AN' }`);
      }

      if (devMode) {
        // P for Pass (current player)
        if (event.key === 'p' || event.key === 'P') {
          passTurn(gameState.current);
          log(`⏭️ Player ${ gameState.current } passt`);
        }

        // E for End Turn (current player)
        if (event.key === 'e' || event.key === 'E') {
          nextTurn();
          log(`⏭️ Player ${ gameState.current } beendet Zug`);
        }

        // A for instant initiative activate
        if (event.key === 'a' || event.key === 'A') {
          activateInstantInitiative(gameState.current);
          log(`🎯 Player ${ gameState.current } aktiviert Sofort-Initiative`);
        }
      }

      // Debug snapshot: Ctrl+D copies to clipboard, Shift+D downloads file
      if ((event.key === 'd' || event.key === 'D') && event.ctrlKey) {
        copyDebugSnapshotToClipboard(gameState).then(() => {
          logger.info('Debug snapshot copied to clipboard');
        }).catch(() => { });
      }
      if ((event.key === 'd' || event.key === 'D') && event.shiftKey) {
        downloadDebugSnapshot(gameState);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [devMode, log, gameState, passTurn, nextTurn, activateInstantInitiative]);

  const handleCardClick = useCallback((data: any) => {
    logger.info('🔧 DEBUG: handleCardClick called with:', data);
    if (!data) return;

    const sel = (gameState as any).pendingAbilitySelect;
    if (sel?.type === 'corruption_steal' && data.type === 'board_card') {
      const actor = sel.actorPlayer as Player;
      const victim: Player = actor === 1 ? 2 : 1;
      if (data.player === victim && data.lane === 'aussen' && data.card?.uid) {
        window.dispatchEvent(new CustomEvent('pc:corruption_pick_target', {
          detail: { player: actor, targetUid: data.card.uid },
        }));
        return;
      }
    }

    if (data.type === 'button_pass_turn') {
      const currentPlayer = gameState.current;
      if (pvpRole === 'guest') {
        if (currentPlayer === 2) pvpSendAction({ t: 'pass' });
        return;
      }
      log(`🎯 UI: Passen-Button geklickt - Spieler ${ currentPlayer } passt`);
      passTurn(currentPlayer);
      return;
    }

    if (data.type === 'button_end_turn') {
      const currentPlayer = gameState.current;
      if (pvpRole === 'guest') {
        if (currentPlayer === 2) pvpSendAction({ t: 'end_turn' });
        return;
      }
      log(`🎯 UI: Zug-beenden-Button geklickt - Spieler ${ currentPlayer } beendet Zug`);
      nextTurn();
      return;
    }

    if (data.type === 'hand_p1') {
      // In PvP the guest never controls player 1's hand
      if (pvpRole === 'guest') return;
      if (gameState.current !== 1) {
        log('❌ ERROR: Handkarte geklickt aber nicht Spieler-Zug - Current: ' + gameState.current);
        return;
      }

      const same = selectedHandIndex === data.index;
      log('🎯 UI: Handkarte geklickt - ' + data.card.name + ' (Index: ' + data.index + ', Selected: ' + selectedHandIndex + ')');

      if (!same) {
        // Single click -> Open details modal
        log('🎯 UI: Handkarte einfach geklickt → öffne Modal - ' + data.card.name);
        setHandCardModalOpen(true);
        selectHandCard(data.index);
      } else {
        // Double click -> Direct play (auto target)
        const card: any = data.card;
        const currentPlayer = gameState.current;
        const targetLane = card.kind === 'pol' ? (['Staatsoberhaupt', 'Regierungschef', 'Diplomat'].includes(card.tag) ? 'aussen' : 'aussen') : 'innen';
        log('🎯 UI: Handkarte doppelgeklickt → direkt spielen - ' + card.name + ' in ' + targetLane);
        playCard(currentPlayer, data.index, targetLane);
        selectHandCard(null);
      }
      return;
    }

    if (data.type === 'hand_p2') {
      // In PvP the host never controls player 2's hand
      if (pvpRole === 'host') return;
      if (gameState.current !== 2) {
        log('❌ ERROR: P2 Handkarte geklickt aber nicht P2-Zug - Current: ' + gameState.current);
        return;
      }

      const same = selectedHandIndex === data.index;
      log('🎯 UI: P2 Handkarte geklickt - ' + data.card.name + ' (Index: ' + data.index + ', Selected: ' + selectedHandIndex + ')');

      if (same) {
        setHandCardModalOpen(true);
      } else {
        const uid = data.card?.uid ?? data.card?.id;
        const stateHand = gameState.hands?.[2] || [];
        let idxInState = stateHand.findIndex((c: any) => (c.uid ?? c.id) === uid);

        if (idxInState === -1) {
          log('❌ ERROR: P2 Karte nicht in Hand gefunden - UID: ' + uid);
          return;
        }

        log('🎯 UI: P2 Handkarte ausgewählt - ' + data.card.name + ' (Index: ' + idxInState + ')');
        selectHandCard(idxInState);
      }
      return;
    }

    if (data.type === 'row_slot') {
      const currentPlayer = gameState.current;
      if (selectedHandIndex === null) {
        return;
      }

      const playerHand = gameState.hands?.[currentPlayer];
      if (!playerHand || selectedHandIndex < 0 || selectedHandIndex >= playerHand.length) {
        return;
      }

      const card = playerHand[selectedHandIndex];
      if (!card) {
        return;
      }

      const lane = data.lane;
      if (pvpRole === 'guest') {
        if (currentPlayer === 2) {
          pvpSendAction({ t: 'play_card', index: selectedHandIndex, lane });
          selectHandCard(null);
        }
        return;
      }
      log('🎯 UI: Karte auf Slot gespielt - ' + card.name + ' nach ' + (lane === 'aussen' ? 'Regierungsreihe' : 'Öffentlichkeitsreihe') + ' (Slot ' + (data.index + 1) + ')');
      playCard(currentPlayer, selectedHandIndex, lane);
      selectHandCard(null);
      return;
    }

    if (data.type === 'empty_slot') {
      const currentPlayer = gameState.current;
      const slotType = data.slot;

      if (selectedHandIndex === null) {
        return;
      }

      const playerHand = gameState.hands?.[currentPlayer];
      if (!playerHand || selectedHandIndex < 0 || selectedHandIndex >= playerHand.length) {
        return;
      }

      const card = playerHand[selectedHandIndex];
      if (!card || card.kind !== 'spec') {
        return;
      }

      const specCard = card as any;
      const isPlayableSlot =
        (slotType === 'permanent_government' && specCard.type === 'Dauerhaft-Initiative')
        || (slotType === 'permanent_public' && specCard.type === 'Dauerhaft-Initiative')
        || (slotType === 'instant' && specCard.type === 'Sofort-Initiative');

      if (!isPlayableSlot) return;

      if (pvpRole === 'guest') {
        if (currentPlayer === 2) {
          pvpSendAction({ t: 'play_card', index: selectedHandIndex });
          selectHandCard(null);
        }
        return;
      }

      log('🎯 UI: Initiative in Slot gelegt - ' + card.name);
      playCard(currentPlayer, selectedHandIndex);
      selectHandCard(null);
      return;
    }

    if (data.type === 'slot_card' && data.slot === 'instant') {
      const player = data.player as Player;
      if (gameState.current !== player && !devMode) return;
      // In PvP each client only activates its own instant slot
      if (pvpRole === 'host' && player === 2) return;
      if (pvpRole === 'guest') {
        if (player === 2) pvpSendAction({ t: 'activate_instant' });
        return;
      }
      log('🎯 UI: Sofort-Initiative aus Slot aktiviert - ' + data.card.name);
      activateInstantInitiative(player);
      try {
        const trig = (window as any).__pc_triggerInstantAnim || (window as any).pc_triggerInstantAnim;
        if (typeof trig === 'function') trig(`${ player }.instant.0`);
      } catch (e) { }
      return;
    }

    if (data.type === 'activate_instant') {
      const player = data.player as Player;
      const card = data.card;
      // In PvP each client only activates its own instant slot
      if (pvpRole === 'host' && player === 2) return;
      if (pvpRole === 'guest') {
        if (player === 2 && gameState.current === 2) pvpSendAction({ t: 'activate_instant' });
        return;
      }
      log('🎯 UI: Sofort-Initiative aus Slot aktiviert - ' + card.name);
      activateInstantInitiative(player);
      try {
        const trig = (window as any).__pc_triggerInstantAnim || (window as any).pc_triggerInstantAnim;
        if (typeof trig === 'function') trig(`${ player }.instant.0`);
      } catch (e) { }
      return;
    }
  }, [gameState, selectedHandIndex, playCard, selectHandCard, passTurn, nextTurn, log, devMode, activateInstantInitiative, pvpRole, pvpSendAction]);

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
        startMatchWithDecks(p1Deck, []);
        log('🔧 DEV MODE: Spiel gestartet ohne KI - beide Spieler manuell steuerbar');
      } else {
        startMatchVsAI(p1Deck, '');
        log('🤖 KI-Spiel gestartet');
      }
    } else {
      startMatchWithDecks([], []);
      log('🎮 Spiel gestartet mit leeren Decks');
    }
    setAppState('game');
  }, [startMatchWithDecks, startMatchVsAI, devMode, log]);

  const handleIntroComplete = useCallback(() => {
    setAppState('menu');
  }, []);

  const handlePlayCardFromModal = useCallback((index: number, targetSlot?: string) => {
    const currentPlayer = gameState.current;
    const playerHand = gameState.hands?.[currentPlayer];
    if (!playerHand || index < 0 || index >= playerHand.length) return;

    const card = playerHand[index];
    if (!card) return;

    if (pvpRole === 'guest') {
      if (currentPlayer === 2) {
        const lane = (targetSlot === 'aussen' || targetSlot === 'innen') ? targetSlot : undefined;
        pvpSendAction({ t: 'play_card', index, lane });
        selectHandCard(null);
      }
      return;
    }

    try {
      const { resolveEffectKey } = require('./effects/resolveEffectKey');
      const k = resolveEffectKey(card.name, (card as any).effectKey);
      if (k) (card as any).effectKey = k;
    } catch { }

    if (targetSlot === 'aussen' || targetSlot === 'innen') {
      playCard(currentPlayer, index, targetSlot as any);
    } else {
      playCard(currentPlayer, index);
    }

    selectHandCard(null);
  }, [gameState, playCard, selectHandCard, log, pvpRole, pvpSendAction]);

  // Auto-run AI turn when it's AI's turn (if not in Dev Mode)
  // PvP guests never run game logic locally; the host syncs the state.
  useEffect(() => {
    if (appState !== 'game') return;
    if (pvpRole === 'guest') return;

    if (gameState.current === 2 && !devMode && gameState.aiEnabled?.[2] && !gameState.passed?.[2]) {
      const t = setTimeout(() => {
        runAITurn();
      }, 120);
      return () => clearTimeout(t);
    }

    if (gameState.current === 2 && gameState.passed?.[2]) {
      const t2 = setTimeout(() => {
        nextTurn();
      }, 120);
      return () => clearTimeout(t2);
    }
  }, [gameState, runAITurn, devMode, appState, pvpRole, nextTurn]);

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
      {appState === 'intro' && (
        <SequentialVideoPlayer
          onComplete={handleIntroComplete}
          brandVideoSrc="/assets/brand/apocallippo_brand.mp4"
          introVideoSrc="/assets/brand/intro.mp4"
          musicSrc="/assets/music/theme.mp3"
        />
      )}

      {/* Main Menu State */}
      {appState === 'menu' && (
        <MainMenu
          onStartGame={() => setAppState('deckbuilder')}
          onOpenDeckBuilder={() => setAppState('deckbuilder')}
          onShowCredits={() => setAppState('credits')}
          onStartTutorial={() => setTutorialOpen(true)}
          onStartPvp={() => setAppState('pvp-lobby')}
        />
      )}

      {/* PvP Lobby State */}
      {appState === 'pvp-lobby' && (
        <PvpLobby
          configured={pvp.configured}
          role={pvp.role}
          status={pvp.status}
          roomCode={pvp.roomCode}
          error={pvp.error}
          onCreateRoom={() => { pvp.createRoom(); }}
          onJoinRoom={(code) => { pvp.joinRoom(code); }}
          onStartMatch={handleStartPvpMatch}
          onBack={() => {
            pvp.leaveRoom();
            setAppState('menu');
          }}
        />
      )}

      {/* Credits State */}
      {appState === 'credits' && (
        <Credits onBack={() => setAppState('menu')} />
      )}

      {/* Deck Builder State */}
      {appState === 'deckbuilder' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }}>
          <DeckBuilder
            isOpen={true}
            onClose={() => setAppState('menu')}
            onApplyDeck={handleApplyDeck}
            onStartMatch={handleStartMatch}
            onStartVsAI={(p1Deck) => {
              try {
                startMatchVsAI(p1Deck, '');
                log('🤖 Spiel vs KI mit zufälligem Premade-Deck gestartet');
                setAppState('game');
              } catch (error) {
                console.error('Start vs AI failed', error);
                log('❌ Fehler: KI-Start fehlgeschlagen');
              }
            }}
          />
          <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 11 }}>
            <MusicToggle size="medium" />
          </div>
        </div>
      )}

      {/* Main Game State */}
      {appState === 'game' && (
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
                localPlayer={pvpRole === 'guest' ? 2 : 1}
              />

              {/* HandCardModal is kept for detailed views */}
              <HandCardModal
                gameState={gameState}
                selectedHandIndex={selectedHandIndex}
                isVisible={handCardModalOpen}
                onClose={() => setHandCardModalOpen(false)}
                onPlayCard={handlePlayCardFromModal}
              />

              {actionHint && !gameState.gameWinner && (
                <div className={`action-hint${ mobile.isMobile ? ' action-hint--mobile' : '' }`}>
                  <div className="action-hint__title">{actionHint.title}</div>
                  <div className="action-hint__body">{actionHint.body}</div>
                </div>
              )}

              <ActionFeedback />
              <VictoryOverlay
                gameState={gameState}
                localPlayer={pvpRole === 'guest' ? 2 : 1}
                onBackToMenu={() => {
                  if (pvpRole) pvp.leaveRoom();
                  setAppState('menu');
                }}
                onPlayAgain={() => {
                  if (pvpRole) pvp.leaveRoom();
                  startNewGame();
                  setAppState('menu');
                }}
              />

              {!mobile.isTouch && <CardHoverInfoPanel hovered={hoveredCard} />}

              {/* Dice Roller centered for events */}
              <div className={`game-dice${ corruptionActive || maulwurfActive || tunnelvisionActive ? ' game-dice--highlight' : '' }${ diceOutcome === 'success' ? ' game-dice--success' : '' }${ diceOutcome === 'fail' ? ' game-dice--fail' : '' }${ diceRolling ? ' game-dice--rolling' : '' }${ mobile.isMobile ? ' game-dice--mobile' : '' }`}>
                <SimpleDice
                  size={diceSize}
                  onClick={corruptionActive || maulwurfActive || tunnelvisionActive ? requestPendingDiceRoll : undefined}
                  onRoll={(f) => {
                    try {
                      window.dispatchEvent(new CustomEvent('pc:dice_result', { detail: { roll: f } }));
                    } catch (e) {
                      console.error('Error dispatching dice result:', e);
                    }
                  }}
                />
              </div>

              {/* In-Game Music & Back to Menu buttons */}
              {mobile.isMobile ? (
                <div className="mobile-menu" style={{ position: 'fixed', top: 'max(8px, env(safe-area-inset-top))', left: 'max(8px, env(safe-area-inset-left))', zIndex: 1000 }}>
                  <button
                    type="button"
                    className="mobile-menu__toggle"
                    aria-label={mobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
                    aria-expanded={mobileMenuOpen}
                    onClick={() => setMobileMenuOpen((open) => !open)}
                  >
                    {mobileMenuOpen ? '✕' : '☰'}
                  </button>
                  {mobileMenuOpen && (
                    <div className="mobile-menu__sheet" role="menu">
                      <MusicToggle size="medium" />
                      <button
                        type="button"
                        role="menuitem"
                        className="mobile-menu__exit"
                        onClick={() => {
                          if (window.confirm('Möchtest du das Spiel wirklich beenden und zum Hauptmenü zurückkehren?')) {
                            if (pvpRole) pvp.leaveRoom();
                            setAppState('menu');
                          }
                        }}
                      >
                        Spiel beenden
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  position: 'fixed',
                  top: '20px',
                  right: '20px',
                  zIndex: 1000,
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => {
                      if (window.confirm('Möchtest du das Spiel wirklich beenden und zum Hauptmenü zurückkehren?')) {
                        if (pvpRole) pvp.leaveRoom();
                        setAppState('menu');
                      }
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#fca5a5',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                  >
                    🚪 Spiel beenden
                  </button>
                  <MusicToggle size="medium" />
                </div>
              )}

              {/* DEV MODE Indicator */}
              {devMode && (
                <div style={{
                  position: 'fixed',
                  top: '70px',
                  right: '20px',
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
              {showRotateOverlay && <RotateDeviceOverlay />}
            </div>
          </VisualEffectsProvider>
        </div>
      )}

      {/* Tutorial Modal Overlay */}
      <TutorialModal isVisible={tutorialOpen} onClose={() => setTutorialOpen(false)} />
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
