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
import { VictoryOverlay } from './components/VictoryOverlay';
import { VsAiDeckSelect } from './components/VsAiDeckSelect';
import { StartDuelOverlay, StartDuelView } from './components/StartDuelOverlay';
import { useMobileLayout } from './hooks/useMobileLayout';
import { usePvpSession } from './hooks/usePvpSession';
import { PvpAction, RELAYED_ENGINE_EVENTS } from './pvp/types';
import { presetToBuilderEntries, PRESET_DECKS, randomPresetDeck } from './data/presetDecks';

type AppState = 'intro' | 'menu' | 'deckbuilder' | 'vs-ai-select' | 'game' | 'credits' | 'pvp-lobby';

type PendingStart =
  | { mode: 'ai'; p1Deck: BuilderEntry[]; deckName?: string }
  | { mode: 'pvp'; p1Deck: BuilderEntry[]; p2Deck: BuilderEntry[]; deckName?: string; p2DeckName?: string };

function rollW6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function AppContent() {
  const [appState, setAppState] = useState<AppState>('intro');
  const [handCardModalOpen, setHandCardModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<any>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [pendingStart, setPendingStart] = useState<PendingStart | null>(null);
  const [startDuel, setStartDuel] = useState<StartDuelView | null>(null);
  const startDuelRef = useRef<StartDuelView | null>(null);
  const pendingStartRef = useRef<PendingStart | null>(null);
  const mobile = useMobileLayout();
  const showRotateOverlay = appState === 'game' && mobile.isMobile && mobile.isPortrait;
  const diceSize = mobile.isMobile && mobile.isLandscape ? 72 : 120;

  // Simple dice logic
  const [diceOutcome, setDiceOutcome] = useState<'success' | 'fail' | null>(null);
  const diceOutcomeTimer = useRef<number | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const diceRollingTimer = useRef<number | null>(null);
  // Government ability target picker (client-side UI state)
  const [govAbilityPick, setGovAbilityPick] = useState<{
    actorPlayer: Player;
    actorUid: number;
    needsTarget: string;
    name: string;
  } | null>(null);
  // Champion (Anführer) active target picker — engine supports targetUid,
  // this state lets the player choose instead of auto-picking the strongest.
  const [leaderAbilityPick, setLeaderAbilityPick] = useState<{
    player: Player;
    needsTarget: 'own_gov' | 'enemy_gov';
    activeName: string;
  } | null>(null);

  const {
    gameState,
    selectedHandIndex,
    log,
    startMatchWithDecks,
    startMatchVsAI,
    playCard,
    activateInstantInitiative,
    activateGovernmentAbility,
    activateLeader,
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
      case 'activate_leader':
        activateLeader(2, action.targetUid);
        break;
      case 'event':
        if ((RELAYED_ENGINE_EVENTS as readonly string[]).includes(action.name)) {
          window.dispatchEvent(new CustomEvent(action.name, { detail: action.detail ?? undefined }));
        }
        break;
    }
  }, [playCard, passTurn, nextTurn, activateInstantInitiative, activateLeader]);

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
  const localPlayer: Player = pvpRole === 'guest' ? 2 : 1;

  useEffect(() => { startDuelRef.current = startDuel; }, [startDuel]);
  useEffect(() => { pendingStartRef.current = pendingStart; }, [pendingStart]);

  const syncStartDuel = useCallback((duel: StartDuelView | null) => {
    setStartDuel(duel);
    if (duel && pvpRole === 'host') {
      try {
        window.dispatchEvent(new CustomEvent('pc:start_duel_sync', { detail: duel }));
      } catch { /* */ }
    }
  }, [pvpRole]);

  const beginStartDuel = useCallback((pending: PendingStart) => {
    const duel: StartDuelView = {
      phase: 'await_p1',
      p1Roll: null,
      p2Roll: null,
      winner: null,
      mode: pending.mode,
      rematch: 0,
    };
    try { startNewGame(); } catch { /* best-effort clear */ }
    setPendingStart(pending);
    syncStartDuel(duel);
    setAppState('game');
    log('🎲 Startduell: Höhere W6 beginnt. Unentschieden → neu würfeln.');
  }, [log, syncStartDuel, startNewGame]);

  const completeStartDuel = useCallback((winner: Player) => {
    const pending = pendingStartRef.current;
    if (!pending) {
      syncStartDuel(null);
      return;
    }
    try {
      if (pending.mode === 'ai') {
        startMatchVsAI(pending.p1Deck, pending.deckName || '', { startingPlayer: winner });
        log(`🤖 Spiel vs KI gestartet — P${winner} beginnt (Deck: ${pending.deckName || 'Premade'}).`);
      } else {
        setAiEnabled(false);
        startMatchWithDecks(pending.p1Deck, pending.p2Deck, {
          startingPlayer: winner,
          p1PresetName: pending.deckName,
          p2PresetName: pending.p2DeckName,
        });
        log(`🌐 PvP gestartet — P${winner} beginnt.`);
      }
    } catch (error) {
      console.error('Start after duel failed', error);
      log('❌ Fehler: Spielstart nach Startduell fehlgeschlagen');
    }
    setPendingStart(null);
    window.setTimeout(() => syncStartDuel(null), 900);
  }, [log, setAiEnabled, startMatchVsAI, startMatchWithDecks, syncStartDuel]);

  const applyDuelP2Roll = useCallback((face: number) => {
    const cur = startDuelRef.current;
    if (!cur || cur.phase !== 'await_p2' || cur.p1Roll == null) return;
    try {
      window.dispatchEvent(new CustomEvent('pc:engine_dice_result', {
        detail: { roll: face, player: 2, startDuel: true },
      }));
    } catch { /* */ }

    window.setTimeout(() => {
      const latest = startDuelRef.current;
      if (!latest || latest.p1Roll == null) return;
      if (latest.p1Roll === face) {
        const tied: StartDuelView = {
          ...latest,
          p2Roll: face,
          phase: 'tie',
          rematch: latest.rematch + 1,
        };
        syncStartDuel(tied);
        log(`🎲 Startduell Unentschieden (${latest.p1Roll}:${face}) — neu würfeln.`);
        window.setTimeout(() => {
          syncStartDuel({
            phase: 'await_p1',
            p1Roll: null,
            p2Roll: null,
            winner: null,
            mode: latest.mode,
            rematch: latest.rematch + 1,
          });
        }, 1100);
        return;
      }
      const winner: Player = latest.p1Roll > face ? 1 : 2;
      syncStartDuel({
        ...latest,
        p2Roll: face,
        phase: 'winner',
        winner,
      });
      log(`🎲 Startduell: P1=${latest.p1Roll} vs P2=${face} → P${winner} beginnt.`);
      window.setTimeout(() => completeStartDuel(winner), 1000);
    }, 700);
  }, [completeStartDuel, log, syncStartDuel]);

  const applyDuelP1Roll = useCallback((face: number) => {
    const cur = startDuelRef.current;
    if (!cur || cur.phase !== 'await_p1') return;
    try {
      window.dispatchEvent(new CustomEvent('pc:engine_dice_result', {
        detail: { roll: face, player: 1, startDuel: true },
      }));
    } catch { /* */ }
    syncStartDuel({ ...cur, p1Roll: face, phase: 'await_p2' });
    log(`🎲 Startduell P1 würfelt ${face}.`);
  }, [log, syncStartDuel]);

  // Guest mirrors host duel UI
  useEffect(() => {
    const onSync = (ev: Event) => {
      if (pvpRole !== 'guest') return;
      const detail = (ev as CustomEvent<StartDuelView>).detail;
      if (!detail?.phase) return;
      setStartDuel(detail);
    };
    window.addEventListener('pc:start_duel_sync', onSync as EventListener);
    return () => window.removeEventListener('pc:start_duel_sync', onSync as EventListener);
  }, [pvpRole]);

  // Host: guest requested P2 roll
  useEffect(() => {
    const onGuestRoll = () => {
      if (pvpRole === 'guest') return;
      const cur = startDuelRef.current;
      if (!cur || cur.phase !== 'await_p2' || cur.mode !== 'pvp') return;
      applyDuelP2Roll(rollW6());
    };
    window.addEventListener('pc:start_duel_request_roll', onGuestRoll as EventListener);
    return () => window.removeEventListener('pc:start_duel_request_roll', onGuestRoll as EventListener);
  }, [applyDuelP2Roll, pvpRole]);

  // AI auto-roll for P2 during start duel
  useEffect(() => {
    if (!startDuel || startDuel.phase !== 'await_p2' || startDuel.mode !== 'ai') return;
    if (pvpRole === 'guest') return;
    const t = window.setTimeout(() => applyDuelP2Roll(rollW6()), 750);
    return () => window.clearTimeout(t);
  }, [startDuel, applyDuelP2Roll, pvpRole]);

  // Host: publish authoritative state after every change while playing
  useEffect(() => {
    if (pvpRole === 'host' && pvp.status === 'playing') {
      pvpPublishState(gameState);
    }
  }, [gameState, pvpRole, pvp.status, pvpPublishState]);

  const handleStartPvpMatch = useCallback((p1DeckName: string, p2DeckName: string) => {
    const p1Preset = PRESET_DECKS.find(d => d.name === p1DeckName) || randomPresetDeck();
    const p2Preset = PRESET_DECKS.find(d => d.name === p2DeckName) || randomPresetDeck();
    log(`🌐 PvP: P1 erhält "${ p1Preset.name }", P2 erhält "${ p2Preset.name }" — Startduell folgt.`);
    setAiEnabled(false);
    pvp.markStarted();
    beginStartDuel({
      mode: 'pvp',
      p1Deck: presetToBuilderEntries(p1Preset, log),
      p2Deck: presetToBuilderEntries(p2Preset, log),
      deckName: p1Preset.name,
      p2DeckName: p2Preset.name,
    });
    // Re-sync after guest FX listeners attach
    window.setTimeout(() => {
      if (startDuelRef.current) {
        try {
          window.dispatchEvent(new CustomEvent('pc:start_duel_sync', { detail: startDuelRef.current }));
        } catch { /* */ }
      }
    }, 250);
  }, [log, setAiEnabled, beginStartDuel, pvp]);

  const pendingAbilitySelect = (gameState as any).pendingAbilitySelect;
  const pendingAbility = pendingAbilitySelect?.type;
  const corruptionActive = pendingAbility === 'corruption_steal';
  const maulwurfActive = pendingAbility === 'maulwurf_steal';
  const tunnelvisionActive = pendingAbility === 'tunnelvision_choice' || pendingAbility === 'tunnelvision_probe';
  const purgeActive = Boolean(gameState.pendingPurge?.awaitingRoll);
  const startDuelNeedsRoll = Boolean(
    startDuel && (
      (startDuel.phase === 'await_p1' && localPlayer === 1) ||
      (startDuel.phase === 'await_p2' && startDuel.mode === 'pvp' && localPlayer === 2)
    )
  );
  // Tunnelvision is a choice modal (no dice). Purge/audit is deterministic stamps.
  const diceInteractive = startDuelNeedsRoll || (
    !startDuel && (corruptionActive || maulwurfActive)
  );

  const requestPendingDiceRoll = useCallback(() => {
    const duel = startDuelRef.current;
    if (duel) {
      if (duel.phase === 'await_p1' && localPlayer === 1) {
        applyDuelP1Roll(rollW6());
        return;
      }
      if (duel.phase === 'await_p2' && duel.mode === 'pvp' && localPlayer === 2) {
        window.dispatchEvent(new CustomEvent('pc:start_duel_request_roll', {
          detail: { player: 2 },
        }));
        return;
      }
      return;
    }
    if (gameState.pendingPurge?.awaitingRoll) {
      const entry = gameState.pendingPurge.queue[gameState.pendingPurge.index];
      window.dispatchEvent(new CustomEvent('pc:purge_request_roll', {
        detail: { player: entry?.player, targetUid: entry?.uid },
      }));
      return;
    }
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
    } else if (sel.type === 'tunnelvision_choice' || sel.type === 'tunnelvision_probe') {
      // Deterministic Freigabe — prefer AP tax when affordable
      const ap = gameState.actionPoints?.[sel.actorPlayer as 1 | 2] ?? 0;
      window.dispatchEvent(new CustomEvent('pc:tunnelvision_choice', {
        detail: {
          player: sel.actorPlayer,
          targetUid: sel.targetUid,
          choice: ap >= 1 ? 'ap' : 'corruption',
        },
      }));
    }
  }, [pendingAbilitySelect, gameState.pendingPurge, localPlayer, applyDuelP1Roll]);

  useEffect(() => {
    const handleCorruptionResolved = (event: Event) => {
      const detail = (event as CustomEvent).detail as { success?: boolean; type?: string; name?: string; roll?: number; target?: number };
      const success = Boolean(detail?.success);
      setDiceOutcome(success ? 'success' : 'fail');
      if (diceOutcomeTimer.current) window.clearTimeout(diceOutcomeTimer.current);
      diceOutcomeTimer.current = window.setTimeout(() => {
        setDiceOutcome(null);
        diceOutcomeTimer.current = null;
      }, detail?.type === 'purge' ? 900 : 1400);
    };

    const handleCorruptionRoll = () => {
      setDiceRolling(true);
      if (diceRollingTimer.current) window.clearTimeout(diceRollingTimer.current);
      diceRollingTimer.current = window.setTimeout(() => {
        setDiceRolling(false);
        diceRollingTimer.current = null;
      }, 1100);
    };

    const handlePurgeStart = () => {
      log('⚖️ Audit gestartet — jede belastete Regierungskarte wird geprüft.');
    };

    const handlePurgeAwait = () => {
      setDiceRolling(false);
    };

    window.addEventListener('pc:corruption_resolved', handleCorruptionResolved as EventListener);
    window.addEventListener('pc:probe_resolved', handleCorruptionResolved as EventListener);
    window.addEventListener('pc:corruption_roll_started', handleCorruptionRoll as EventListener);
    window.addEventListener('pc:purge_sequence_start', handlePurgeStart as EventListener);
    window.addEventListener('pc:purge_await_roll', handlePurgeAwait as EventListener);
    return () => {
      window.removeEventListener('pc:corruption_resolved', handleCorruptionResolved as EventListener);
      window.removeEventListener('pc:probe_resolved', handleCorruptionResolved as EventListener);
      window.removeEventListener('pc:corruption_roll_started', handleCorruptionRoll as EventListener);
      window.removeEventListener('pc:purge_sequence_start', handlePurgeStart as EventListener);
      window.removeEventListener('pc:purge_await_roll', handlePurgeAwait as EventListener);
    };
  }, [log]);

  useEffect(() => (
    () => {
      if (diceOutcomeTimer.current) window.clearTimeout(diceOutcomeTimer.current);
      if (diceRollingTimer.current) window.clearTimeout(diceRollingTimer.current);
    }
  ), []);

  const actionHint = useMemo(() => {
    if (appState !== 'game') return null;
    if (startDuel) {
      return {
        title: 'Startduell',
        body: startDuelNeedsRoll
          ? 'Würfle mit dem hervorgehobenen Dice. Höhere Augenzahl beginnt.'
          : 'Warte auf den Würfelwurf…',
      };
    }
    if (purgeActive || gameState.pendingPurge) {
      return {
        title: 'Audit',
        body: 'Audit läuft — jede belastete Regierungskarte wird nach ihrer Audit-Stufe geprüft.',
      };
    }
    if (leaderAbilityPick) {
      return {
        title: `Anführer: ${leaderAbilityPick.activeName}`,
        body: leaderAbilityPick.needsTarget === 'own_gov'
          ? 'Wähle eine eigene Regierungskarte als Ziel (erneuter Klick auf den Anführer bricht ab).'
          : 'Wähle eine gegnerische Regierungskarte als Ziel (erneuter Klick auf den Anführer bricht ab).',
      };
    }
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
  }, [appState, corruptionActive, maulwurfActive, tunnelvisionActive, selectedHandIndex, purgeActive, gameState.pendingPurge, startDuel, startDuelNeedsRoll, leaderAbilityPick]);

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

    // Pending champion active that needs a target (own or enemy government)
    if (leaderAbilityPick && data.type === 'board_card' && data.lane === 'aussen' && data.card?.uid) {
      const { player, needsTarget } = leaderAbilityPick;
      const okOwn = needsTarget === 'own_gov' && data.player === player;
      const okEnemy = needsTarget === 'enemy_gov' && data.player !== player;
      if (okOwn || okEnemy) {
        setLeaderAbilityPick(null);
        if (pvpRole === 'guest') {
          if (player === 2) pvpSendAction({ t: 'activate_leader', targetUid: data.card.uid });
          return;
        }
        log(`👑 UI: Anführer-Ziel gewählt — ${data.card.name}`);
        activateLeader(player, data.card.uid);
        return;
      }
    }

    // Pending government ability that needs a target
    if (govAbilityPick && data.type === 'board_card' && data.lane === 'aussen' && data.card?.uid) {
      const { actorPlayer, actorUid, needsTarget } = govAbilityPick;
      const okOwn = needsTarget === 'own_gov' && data.player === actorPlayer;
      const okEnemy = needsTarget === 'enemy_gov' && data.player !== actorPlayer;
      const okAny = needsTarget === 'any_gov';
      if (okOwn || okEnemy || okAny) {
        activateGovernmentAbility(actorPlayer, actorUid, data.card.uid);
        setGovAbilityPick(null);
        return;
      }
    }

    // Click own government with Korruption ≥3 to activate ability (or pick target)
    if (data.type === 'board_card' && data.lane === 'aussen' && data.player === gameState.current && data.card?.kind === 'pol') {
      const card = data.card;
      const corr = Number(card.corruption ?? 0);
      if (corr >= 3 && !card.deactivated && (gameState.actionPoints[gameState.current] || 0) >= 1) {
        try {
          const { getGovAbility, canActivateGovAbility } = require('./utils/govAbilities');
          const gate = canActivateGovAbility(gameState, gameState.current, card);
          if (gate.ok) {
            const ability = getGovAbility(card);
            if (ability?.needsTarget) {
              setGovAbilityPick({
                actorPlayer: gameState.current,
                actorUid: card.uid,
                needsTarget: ability.needsTarget,
                name: ability.name,
              });
              log(`⚡ ${card.name}: „${ability.name}" — wähle Ziel (${ability.needsTarget}).`);
              return;
            }
            activateGovernmentAbility(gameState.current, card.uid);
            return;
          }
        } catch { /* best-effort */ }
      }
    }

    if (data.type === 'activate_leader') {
      const player = (data.player || gameState.current) as Player;

      // Clicking the leader again while a target pick is pending cancels it.
      if (leaderAbilityPick?.player === player) {
        setLeaderAbilityPick(null);
        log('👑 UI: Anführer-Zielwahl abgebrochen.');
        return;
      }

      // Single-target actives: let the player pick when several targets exist.
      const TARGETED_LEADER_ACTIVES: Record<string, 'own_gov' | 'enemy_gov'> = {
        snowden_mark: 'enemy_gov',
        jack_ma_draw_corrupt: 'own_gov',
        koehler_audit_relief: 'own_gov',
        buffett_cleanse: 'own_gov',
      };
      const leader = gameState.leaders?.[player];
      const needsTarget = leader ? TARGETED_LEADER_ACTIVES[leader.activeId] : undefined;
      if (data.targetUid == null && needsTarget) {
        const side: Player = needsTarget === 'own_gov' ? player : (player === 1 ? 2 : 1);
        const candidates = (gameState.board[side]?.aussen || [])
          .filter((c: any) => c?.kind === 'pol' && !c.deactivated);
        if (candidates.length > 1) {
          setLeaderAbilityPick({ player, needsTarget, activeName: leader!.activeName });
          log(`👑 ${leader!.championName}: „${leader!.activeName}" — wähle ${needsTarget === 'own_gov' ? 'eine eigene' : 'eine gegnerische'} Regierungskarte.`);
          return;
        }
      }

      if (pvpRole === 'guest') {
        if (player === 2) pvpSendAction({ t: 'activate_leader', targetUid: data.targetUid });
        return;
      }
      log(`👑 UI: Anführer-Aktiv — Spieler ${player}`);
      activateLeader(player, data.targetUid);
      return;
    }

    if (data.type === 'button_pass_turn') {
      setLeaderAbilityPick(null);
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
      setLeaderAbilityPick(null);
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
  }, [gameState, selectedHandIndex, playCard, selectHandCard, passTurn, nextTurn, log, devMode, activateInstantInitiative, activateGovernmentAbility, activateLeader, govAbilityPick, leaderAbilityPick, pvpRole, pvpSendAction]);

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
    if (startDuel) return; // Startduell blocks AI until resolved

    if (gameState.current === 2 && !devMode && gameState.aiEnabled?.[2] && !gameState.passed?.[2]) {
      const t = setTimeout(() => {
        runAITurn();
      }, 120);
      return () => clearTimeout(t);
    }

    // Do not force nextTurn while the timer-driven Audit sequence is running —
    // that would re-enter resolveRound and wipe pendingPurge.
    if (gameState.pendingPurge) return;

    if (gameState.current === 2 && gameState.passed?.[2]) {
      const t2 = setTimeout(() => {
        nextTurn();
      }, 120);
      return () => clearTimeout(t2);
    }
  }, [gameState, runAITurn, devMode, appState, pvpRole, nextTurn, startDuel]);

  return (
    <div style={{
      margin: 0,
      padding: 0,
      background: 'var(--bg-app)',
      color: 'var(--content-primary)',
      fontFamily: 'var(--font-ui)',
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
          onStartGame={() => setAppState('vs-ai-select')}
          onOpenDeckBuilder={() => setAppState('deckbuilder')}
          onShowCredits={() => setAppState('credits')}
          onStartTutorial={() => setTutorialOpen(true)}
          onStartPvp={() => setAppState('pvp-lobby')}
        />
      )}

      {/* Slim vs-AI premade picker */}
      {appState === 'vs-ai-select' && (
        <VsAiDeckSelect
          onBack={() => setAppState('menu')}
          onStart={(p1Deck, deckName) => {
            beginStartDuel({ mode: 'ai', p1Deck, deckName });
          }}
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
              background: 'var(--bg-app)',
            }}>
              <GameBoard
                gameState={gameState}
                selectedHandIndex={selectedHandIndex}
                onCardClick={handleCardClick}
                onCardHover={handleCardHover}
                devMode={devMode}
                localPlayer={localPlayer}
                guidanceHint={!gameState.gameWinner ? actionHint : null}
                onExitToMenu={() => {
                  if (pvpRole) pvp.leaveRoom();
                  setAppState('menu');
                }}
              />

              {/* HandCardModal is kept for detailed views */}
              <HandCardModal
                gameState={gameState}
                selectedHandIndex={selectedHandIndex}
                isVisible={handCardModalOpen}
                onClose={() => setHandCardModalOpen(false)}
                onPlayCard={handlePlayCardFromModal}
              />

              <VictoryOverlay
                gameState={gameState}
                localPlayer={localPlayer}
                onBackToMenu={() => {
                  if (pvpRole) pvp.leaveRoom();
                  setStartDuel(null);
                  setPendingStart(null);
                  setAppState('menu');
                }}
                onPlayAgain={() => {
                  if (pvpRole) pvp.leaveRoom();
                  setStartDuel(null);
                  setPendingStart(null);
                  startNewGame();
                  setAppState('menu');
                }}
              />

              {startDuel && (
                <StartDuelOverlay duel={startDuel} localPlayer={localPlayer} />
              )}

              {!mobile.isTouch && <CardHoverInfoPanel hovered={hoveredCard} />}

              {/* Dice Roller centered for events */}
              <div className={`game-dice${ diceInteractive ? ' game-dice--highlight' : '' }${ startDuelNeedsRoll ? ' game-dice--start-duel' : '' }${ diceOutcome === 'success' ? ' game-dice--success' : '' }${ diceOutcome === 'fail' ? ' game-dice--fail' : '' }${ diceRolling ? ' game-dice--rolling' : '' }${ mobile.isMobile ? ' game-dice--mobile' : '' }`}>
                <SimpleDice
                  size={diceSize}
                  onClick={diceInteractive ? requestPendingDiceRoll : undefined}
                  onRoll={(f) => {
                    try {
                      window.dispatchEvent(new CustomEvent('pc:dice_result', { detail: { roll: f } }));
                    } catch (e) {
                      console.error('Error dispatching dice result:', e);
                    }
                  }}
                />
              </div>

              {/* Music toggle — exit lives subtly in the bottom HUD bar */}
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
                }}>
                  <MusicToggle size="medium" />
                </div>
              )}

              {/* DEV MODE Indicator */}
              {devMode && (
                <div style={{
                  position: 'fixed',
                  top: '70px',
                  right: '20px',
                  background: 'var(--amber-700)',
                  color: 'var(--content-on-action)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-sm)',
                  zIndex: 1000,
                  fontFamily: 'var(--font-ui)',
                }}>
                  DEV MODE — KI AUS
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
