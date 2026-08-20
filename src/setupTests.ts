// CRA automatically loads this file before running tests.
import '@testing-library/jest-dom';

// Native canvas bindings are often broken in CI/sandboxes; mock the npm module
// for any code that imports the 'canvas' package directly.
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

// jsdom does not implement HTMLCanvasElement 2D context. Provide a minimal
// stub so components that render real <canvas> elements can mount/unmount.
const mockCanvasContext = {
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
};

beforeAll(() => {
  if (typeof HTMLCanvasElement !== 'undefined') {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: () => mockCanvasContext,
      configurable: true,
    });
  }
});
