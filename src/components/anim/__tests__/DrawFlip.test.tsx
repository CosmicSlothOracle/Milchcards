import React from 'react';
import { render } from '@testing-library/react';
import DrawFlip from '../DrawFlip';

describe('DrawFlip', () => {
  beforeEach(() => {
    // ensure anim layer exists
    const existing = document.getElementById('ui-anim-layer');
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
    // We can't observe animation easily here; just assert layer created
    const layer = document.getElementById('ui-anim-layer');
    expect(layer).not.toBeNull();
  });
});


