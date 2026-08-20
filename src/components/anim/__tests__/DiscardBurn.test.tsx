import React from 'react';
import { render } from '@testing-library/react';
import DiscardBurn from '../DiscardBurn';

describe('DiscardBurn', () => {
  beforeEach(() => {
    // The animation appends a canvas layer to document.body; direct DOM access is
    // intentional here to isolate tests from previous layer state.
    // eslint-disable-next-line testing-library/no-node-access
    const existing = document.getElementById('ui-anim-layer');
    // eslint-disable-next-line testing-library/no-node-access
    if (existing) existing.remove();
  });

  it('mounts and cleans up', () => {
    const start = { x: 20, y: 20, width: 60, height: 90 };
    const { unmount } = render(<DiscardBurn startRect={start} />);
    unmount();
  });
});


