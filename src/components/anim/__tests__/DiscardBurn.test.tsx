import React from 'react';
import { render } from '@testing-library/react';
import DiscardBurn from '../DiscardBurn';

describe('DiscardBurn', () => {
  beforeEach(() => {
    const existing = document.getElementById('ui-anim-layer');
    if (existing) existing.remove();
  });

  it('mounts and cleans up', () => {
    const start = { x: 20, y: 20, width: 60, height: 90 };
    const { unmount } = render(<DiscardBurn startRect={start} />);
    unmount();
  });
});


