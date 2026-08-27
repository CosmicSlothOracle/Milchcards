import fs from 'fs';
import path from 'path';
import { FILENAME_MAPPING, Pols, Specials, getCardImagePath } from '../../data/gameData';

const PUBLIC = path.join(__dirname, '../../../public');

function filesystemPathFromUrl(url: string): string {
  // getCardImagePath returns encodeURIComponent'd filenames; reverse for disk check
  const parts = url.split('/');
  const file = decodeURIComponent(parts[parts.length - 1]);
  const dir = parts.slice(0, -1).join('/');
  return path.join(PUBLIC, dir, file);
}

describe('card art mapping', () => {
  it('maps every politician and special to an existing file (ui + modal)', () => {
    const missing: string[] = [];

    for (const pol of Pols) {
      for (const size of ['ui', 'modal'] as const) {
        const url = getCardImagePath({ kind: 'pol', baseId: pol.id, key: pol.key }, size);
        const disk = filesystemPathFromUrl(url);
        if (!fs.existsSync(disk)) missing.push(`${pol.key} ${size} -> ${disk}`);
      }
    }

    for (const spec of Specials) {
      for (const size of ['ui', 'modal'] as const) {
        const url = getCardImagePath({ kind: 'spec', baseId: spec.id, key: spec.key }, size);
        const disk = filesystemPathFromUrl(url);
        if (!fs.existsSync(disk)) missing.push(`${spec.key} ${size} -> ${disk}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('gives distinct ui art for named people who are not intentional archetype aliases', () => {
    const intentionalShare = new Set([
      'Der_Unbestechliche', // Navalny art
      'Skandal_Enthueller', // Assange art
      'Kronzeuge', // Snowden art
      'Lobbyist', // Rove art
    ]);

    const byUrl = new Map<string, string[]>();
    for (const pol of Pols.filter((p) => p.id <= 63)) {
      const url = getCardImagePath({ kind: 'pol', baseId: pol.id, key: pol.key }, 'ui');
      const list = byUrl.get(url) || [];
      list.push(pol.key);
      byUrl.set(url, list);
    }
    for (const spec of Specials.filter((s) => s.type === 'Öffentlichkeitskarte')) {
      const url = getCardImagePath({ kind: 'spec', baseId: spec.id, key: spec.key }, 'ui');
      const list = byUrl.get(url) || [];
      list.push(spec.key);
      byUrl.set(url, list);
    }

    const collisions = [...byUrl.entries()]
      .filter(([, keys]) => keys.length > 1)
      .map(([, keys]) => keys.filter((k) => !intentionalShare.has(k)))
      .filter((keys) => keys.length > 1);

    expect(collisions).toEqual([]);
  });

  it('resolves by key even when baseId would be ambiguous', () => {
    // Specials and Pols both use low numeric ids; key must win when provided
    const shadow = getCardImagePath({ kind: 'spec', baseId: 1, key: 'Shadow_Lobbying' }, 'ui');
    const putin = getCardImagePath({ kind: 'pol', baseId: 1, key: 'Vladimir_Putin' }, 'ui');
    expect(shadow).toContain('Shadow_Lobbying');
    expect(putin).toContain('Vladimir_Putin');
    expect(shadow).not.toBe(putin);
  });

  it('URL-encodes spaces in special filenames', () => {
    const url = getCardImagePath({ kind: 'spec', baseId: 20, key: 'Konzernfreundlicher_Algorithmus' }, 'modal');
    expect(url).toContain('%20');
    expect(FILENAME_MAPPING.Konzernfreundlicher_Algorithmus).toContain(' ');
  });
});
