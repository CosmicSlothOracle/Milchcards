import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { VisualEffectsProvider, useVisualEffects } from '../context/VisualEffectsContext';
import { render } from '@testing-library/react';

describe('VisualEffectsContext', () => {
  test('spawnParticles adds particles to ref', () => {
    const wrapper = ({ children }: any) => <VisualEffectsProvider>{children}</VisualEffectsProvider>;
    const { result } = renderHook(() => useVisualEffects(), { wrapper });

    act(() => {
      result.current.spawnParticles(100, 100, 5);
    });

    expect(result.current.particlesRef.current.length).toBeGreaterThanOrEqual(5);
  });

  test('spawnPop adds pop entry', () => {
    const wrapper = ({ children }: any) => <VisualEffectsProvider>{children}</VisualEffectsProvider>;
    const { result } = renderHook(() => useVisualEffects(), { wrapper });

    act(() => {
      result.current.spawnPop('u1');
    });

    expect(result.current.popsRef.current.length).toBeGreaterThanOrEqual(1);
  });

  test('spawnRipple adds ripple and ap label when requested', () => {
    const wrapper = ({ children }: any) => <VisualEffectsProvider>{children}</VisualEffectsProvider>;
    const { result } = renderHook(() => useVisualEffects(), { wrapper });

    act(() => {
      result.current.spawnRipple(200, 200, { radius: 120, showAp: true, apX: 200, apY: 220 });
    });

    expect(result.current.ripplesRef.current.length).toBeGreaterThanOrEqual(1);
    expect(result.current.apLabelsRef.current.length).toBeGreaterThanOrEqual(1);
  });
});


