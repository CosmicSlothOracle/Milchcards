// CRA automatically loads this file before running tests.
import '@testing-library/jest-dom';

// Native canvas bindings are often broken in CI/sandboxes; mock for unit tests.
jest.mock('canvas', () => ({
  createCanvas: () => ({
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    }),
    width: 0,
    height: 0,
    toBuffer: () => Buffer.alloc(0),
  }),
  loadImage: async () => ({ width: 0, height: 0 }),
  Image: class Image {},
  Canvas: class Canvas {},
}), { virtual: true });
