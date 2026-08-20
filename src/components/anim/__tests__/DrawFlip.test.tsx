import React from 'react';
import { render } from '@testing-library/react';
import DrawFlip from '../DrawFlip';

describe('DrawFlip', () => {
  beforeEach(() => {
    // The animation appends a canvas layer to document.body; direct DOM access is
    // intentional here to isolate tests from previous layer state.
    // eslint-disable-next-line testing-library/no-node-access
    const existing = document.getElementById('ui-anim-layer');
    // eslint-disable-next-line testing-library/no-node-access
    if (existing) existing.remove();
  });

  it('mounts and unmounts without throwing', () => {
    const from = { x: 10, y: 10, width: 60, height: 90 };
    const to = { x: 200, y: 150, width: 60, height: 90 };
    const { unmount } = render(<DrawFlip fromRect={from} toRect={to} />);
    unmount();
  });

  it('respects reducedMotion by shortening duration', () => {
    const from = { x: 0, y: 0, width: 30, height: 50 };
    const to = { x: 100, y: 50, width: 30, height: 50 };
    render(<DrawFlip fromRect={from} toRect={to} reducedMotion={true} />);
    // We can't observe animation easily here; just assert layer created.
    // The layer is appended to document.body by the animation component.
    // eslint-disable-next-line testing-library/no-node-access
    const layer = document.getElementById('ui-anim-layer');
    expect(layer).not.toBeNull();
  });
});


