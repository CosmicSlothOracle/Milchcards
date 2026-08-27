import { act, renderHook } from '@testing-library/react';
import { useQuizState } from '../useQuizState';
import { QUIZ_HIGHSCORE_KEY } from '../../utils/quiz';

describe('useQuizState highscore persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists the highscore as soon as the score increases, without waiting for game over', () => {
    const { result } = renderHook(() => useQuizState());

    act(() => {
      result.current.start();
    });

    act(() => {
      const correctKey = result.current.question!.correctKey;
      result.current.selectOption(correctKey);
    });

    expect(result.current.run.score).toBe(1);
    // Committed immediately — not only once the run ends.
    expect(window.localStorage.getItem(QUIZ_HIGHSCORE_KEY)).toBe('1');
    expect(result.current.phase).toBe('reveal');
  });
});
