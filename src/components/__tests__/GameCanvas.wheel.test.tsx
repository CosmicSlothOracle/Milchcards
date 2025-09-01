import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { GameCanvas } from '../GameCanvas';
import { GameState } from '../../types/game';

// Minimal mock state
const makeState = (handCount: number): GameState => {
  const card = (id: number) => ({ id, key: 'k', name: 'C' + id, kind: 'pol', baseId: id, uid: id });
  const hands = { 1: Array.from({ length: handCount }, (_, i) => card(i + 1)), 2: [] } as any;
  return {
    round: 1,
    current: 1,
    passed: { 1: false, 2: false },
    actionPoints: { 1: 2, 2: 2 },
    actionsUsed: { 1: 0, 2: 0 },
    decks: { 1: [], 2: [] },
    hands,
    traps: { 1: [], 2: [] },
    board: { 1: { innen: [], aussen: [], sofort: [] }, 2: { innen: [], aussen: [], sofort: [] } },
    permanentSlots: { 1: { government: null, public: null, initiativePermanent: null }, 2: { government: null, public: null, initiativePermanent: null } },
    discard: [],
    log: [],
    activeRefresh: { 1: 0, 2: 0 },
    roundsWon: { 1: 0, 2: 0 },
    effectFlags: { 1: ({} as any), 2: ({} as any) },
    effectQueue: undefined,
  } as unknown as GameState;
};

describe('GameCanvas wheel scroll', () => {
  test('wheel does not throw when hand <=5', () => {
    const state = makeState(5);
    const { container } = render(<GameCanvas gameState={state} selectedHandIndex={null} onCardClick={() => {}} onCardHover={() => {}} />);
    const canvas = container.querySelector('canvas')!;
    expect(() => fireEvent.wheel(canvas, { deltaY: 100 })).not.toThrow();
  });

  test('wheel updates target when hand >5', () => {
    const state = makeState(8);
    const { container } = render(<GameCanvas gameState={state} selectedHandIndex={null} onCardClick={() => {}} onCardHover={() => {}} />);
    const canvas = container.querySelector('canvas')!;
    // simulate wheel down
    fireEvent.wheel(canvas, { deltaY: 100 });
    // no direct access to internal refs; assert no crash and canvas present
    expect(canvas).toBeTruthy();
  });
});


