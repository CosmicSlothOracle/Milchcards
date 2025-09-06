export interface KeyBindings {
  left: string;
  right: string;
  up: string;
  down: string;
  attack: string;
  parry: string;
  ranged: string;
}

export interface InputState {
  [key: string]: boolean;
}

// Default keyboard bindings (same as previous HTML inline)
export const P1_KEYS: KeyBindings = {
  left: "KeyA",
  right: "KeyD",
  up: "KeyW",
  down: "KeyS",
  attack: "KeyE",
  parry: "KeyR",
  ranged: "KeyT",
};

export const P2_KEYS: KeyBindings = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  attack: "Numpad1",
  parry: "Numpad2",
  ranged: "Numpad3",
};

/**
 * Returns a fresh InputState object filled from Keyboard events.
 */
export function createKeyboardListener(target: HTMLElement = document.body) {
  const state: InputState = {};
  function keydown(e: KeyboardEvent) {
    state[e.code] = true;
  }
  function keyup(e: KeyboardEvent) {
    state[e.code] = false;
  }
  target.addEventListener("keydown", keydown);
  target.addEventListener("keyup", keyup);
  return state;
}

/**
 * Read Gamepads and map buttons/axes into an InputState according to provided bindings.
 */
export function readGamepadsUnified(
  p1Bindings: KeyBindings,
  p2Bindings: KeyBindings
): InputState {
  const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
  const inputFromPads: InputState = {};
  const dead = 0.35;
  function mapPadToKeys(pad: Gamepad | null, keys: KeyBindings) {
    if (!pad) return;
    const b = pad.buttons || [];
    const a = pad.axes || [];
    const left = (b[14] && b[14].pressed) || a[0] < -dead;
    const right = (b[15] && b[15].pressed) || a[0] > dead;
    const up = (b[12] && b[12].pressed) || a[1] < -0.6 || (b[0] && b[0].pressed);
    const down = (b[13] && b[13].pressed) || a[1] > 0.6;
    const attack = !!(b[5] && b[5].pressed); // R1
    const parry = !!(b[4] && b[4].pressed); // L1
    const ranged = !!(b[1] && b[1].pressed); // Circle
    if (left) inputFromPads[keys.left] = true;
    if (right) inputFromPads[keys.right] = true;
    if (up) inputFromPads[keys.up] = true;
    if (down) inputFromPads[keys.down] = true;
    if (attack) inputFromPads[keys.attack] = true;
    if (parry) inputFromPads[keys.parry] = true;
    if (ranged) inputFromPads[keys.ranged] = true;
  }
  mapPadToKeys(pads[0], p1Bindings);
  mapPadToKeys(pads[1], p2Bindings);
  return inputFromPads;
}
