import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AudioProvider } from '../../context/AudioContext';
import { QuizScreen } from '../QuizScreen';

jest.mock('gsap', () => {
  const tween = { kill: jest.fn() };
  return {
    __esModule: true,
    default: {
      to: (_t: unknown, vars: { onComplete?: () => void; onUpdate?: () => void }) => {
        vars.onUpdate?.();
        vars.onComplete?.();
        return tween;
      },
      fromTo: () => tween,
      set: () => undefined,
    },
  };
});

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches,
      media: '',
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

function renderQuiz() {
  return render(
    <AudioProvider>
      <QuizScreen onBack={jest.fn()} />
    </AudioProvider>
  );
}

describe('QuizScreen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(true);
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a quote and five card choices', () => {
    renderQuiz();
    expect(screen.getByText('Wer hat das gesagt?')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Kartenauswahl' }).querySelectorAll('button')).toHaveLength(5);
    expect(screen.getByLabelText(/3 Leben/)).toBeInTheDocument();
  });

  it('locks the board after a pick and reveals attribution', () => {
    renderQuiz();
    const choices = screen.getByRole('group', { name: 'Kartenauswahl' }).querySelectorAll('button');
    fireEvent.click(choices[0]);
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
    choices.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('returns to the menu', () => {
    const onBack = jest.fn();
    render(
      <AudioProvider>
        <QuizScreen onBack={onBack} />
      </AudioProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Menü' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('opens the game-over card after three misses', () => {
    renderQuiz();
    let misses = 0;
    for (let step = 0; step < 24 && misses < 3; step++) {
      const group = screen.getByRole('group', { name: 'Kartenauswahl' });
      const buttons = Array.from(group.querySelectorAll('button'));
      fireEvent.click(buttons[0]);
      const missed = buttons[0].className.includes('quiz-choice--wrong');
      if (missed) misses += 1;
      const nextName = misses === 3 ? 'Ergebnis' : 'Weiter';
      fireEvent.click(screen.getByRole('button', { name: nextName }));
    }
    expect(screen.getByText('Die Sitzung ist zu Ende')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name für die Bestenliste/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nochmal' })).toBeInTheDocument();
  });

  it('submits a name to the local leaderboard on game over', async () => {
    renderQuiz();
    let misses = 0;
    for (let step = 0; step < 24 && misses < 3; step++) {
      const group = screen.getByRole('group', { name: 'Kartenauswahl' });
      const buttons = Array.from(group.querySelectorAll('button'));
      fireEvent.click(buttons[0]);
      const missed = buttons[0].className.includes('quiz-choice--wrong');
      if (missed) misses += 1;
      const nextName = misses === 3 ? 'Ergebnis' : 'Weiter';
      fireEvent.click(screen.getByRole('button', { name: nextName }));
    }
    fireEvent.change(screen.getByLabelText(/Name für die Bestenliste/i), { target: { value: 'Tester' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eintragen' }));
    await waitFor(() => {
      expect(screen.getByText(/Auf der Bestenliste|Neuer Bestwert|nicht in den Top/i)).toBeInTheDocument();
    });
    const raw = window.localStorage.getItem('milchcards.quiz.leaderboard');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)[0].name).toBe('Tester');
  });
});
