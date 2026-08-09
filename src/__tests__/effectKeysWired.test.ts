import { Specials } from '../data/gameData';
import { EFFECTS, LEGACY_NAME_TO_KEY } from '../effects/registry';

describe('effect keys wired for all specials', () => {
  test('every Special has an effectKey that exists in EFFECTS or a legacy name fallback', () => {
    const missing: string[] = [];
    for (const s of Specials) {
      const key = s.effectKey || LEGACY_NAME_TO_KEY[s.name];
      if (!key || !EFFECTS[key]) {
        missing.push(`${s.name} (effectKey=${s.effectKey})`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('Whataboutism and Digitaler Wahlkampf use the board-dependent handlers', () => {
    const what = Specials.find(s => s.name === 'Whataboutism');
    const digi = Specials.find(s => s.name === 'Digitaler Wahlkampf');
    expect(what?.effectKey).toBe('init.whataboutism.reactivate_minus1');
    expect(digi?.effectKey).toBe('init.digital_campaign.per_media');
    expect(EFFECTS['init.whataboutism.reactivate_minus1']).toBeDefined();
    expect(EFFECTS['init.digital_campaign.per_media']).toBeDefined();
  });
});
