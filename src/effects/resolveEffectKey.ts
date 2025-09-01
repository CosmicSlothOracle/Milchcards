// src/effects/resolveEffectKey.ts
import { LEGACY_NAME_TO_KEY } from './cards';

export function resolveEffectKey(name?: string, presetKey?: string): string | undefined {
  if (presetKey && presetKey.length) return presetKey;
  if (!name) return undefined;
  return LEGACY_NAME_TO_KEY[name] ?? undefined;
}
