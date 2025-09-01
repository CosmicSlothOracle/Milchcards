import React from 'react';
import { Icon, IconName } from './Icon';

const DICT: Array<{ re: RegExp; icon: IconName; label?: string }> = [
  { re: /\bGovernment\b/gi, icon: 'government_row' },
  { re: /\bPublic\b/gi, icon: 'public_row' },
  { re: /\bInitiative(s)?\b/gi, icon: 'initiative' },
  { re: /\bIntervention(s)?|Trap(s)?\b/gi, icon: 'intervention_trap' },
  { re: /\bAP\b/gi, icon: 'ap' },
  { re: /\bInfluence\b/gi, icon: 'influence' },
  { re: /\bRound(s)?\b/gi, icon: 'round_turn' },
  { re: /\bBuff\b/gi, icon: 'buff_strength' },
  { re: /\bDraw\b/gi, icon: 'draw_cards' },
  { re: /\bDiscard\b/gi, icon: 'discard_cards' },
  { re: /\bReturn to hand\b/gi, icon: 'return_to_hand' },
  { re: /\bDeactivate\b/gi, icon: 'deactivate_card' },
  { re: /\bCancel\b/gi, icon: 'cancel_card' },
  { re: /\bShield\b/gi, icon: 'grant_shield' },
  { re: /\bAura\b/gi, icon: 'aura_ongoing' },
  { re: /\bScience\b/gi, icon: 'aura_science' },
  { re: /\bHealth\b/gi, icon: 'aura_health' },
  { re: /\bMilitary\b/gi, icon: 'aura_military_penalty' },
  { re: /\bRegister Trap\b/gi, icon: 'register_trap' },
  { re: /\bInitiative Activated\b/gi, icon: 'initiative_activated' },
  { re: /\bStart of turn\b/gi, icon: 'start_of_turn' },
  { re: /\bCopy\b/gi, icon: 'copy_log' },
  { re: /\bClear\b/gi, icon: 'clear_log' },
  { re: /\bSearch\b/gi, icon: 'search' },
  { re: /\bBudget\b/gi, icon: 'budget_money' },
  { re: /\bLog\b/gi, icon: 'game_log' },
  { re: /\bMedien\b/gi, icon: 'medien' },
  { re: /\bOligarch(en)?\b/gi, icon: 'oligarch' },
  { re: /\bStaat(lich|en)?\b/gi, icon: 'staat' },
  { re: /\bTech\b/gi, icon: 'tech' },
  { re: /\bWissenschaft(ler)?\b/gi, icon: 'wissenschaft' },
  { re: /\bAktivist(en)?\b/gi, icon: 'aktivist' },
  { re: /\bDenker\b/gi, icon: 'denker' },
];

export function withIcons(text: string, size = 14) {
  // Ersetzt [ICON:name]-Tokens und bekannte Begriffe durch [Icon + Text]-Spans
  // First, tokenize explicit ICON tokens like [ICON:oligarch]
  const parts: React.ReactNode[] = [];
  const tokenRe = /\[ICON:([a-z_]+)\]/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(text)) !== null) {
    const idx = m.index;
    if (idx > lastIndex) parts.push(text.substring(lastIndex, idx));
    const token = m[1].toLowerCase();
    // Map token to existing icon name mapping where possible
    const tokenToIcon: Record<string, IconName> = {
      medien: 'medien',
      oligarch: 'oligarch',
      staat: 'staat',
      tech: 'tech',
      wissenschaft: 'wissenschaft',
      aktivist: 'aktivist',
      denker: 'denker',
    } as any;
    const iconName = tokenToIcon[token] as IconName | undefined;
    if (iconName) {
      parts.push(<Icon key={`tok-${token}-${idx}`} name={iconName} size={size} />);
    } else {
      // If unknown token, keep raw text
      parts.push(m[0]);
    }
    lastIndex = idx + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  DICT.forEach(({ re, icon }) => {
    for (let i = 0; i < parts.length; i++) {
      const chunk = parts[i];
      if (typeof chunk !== 'string') continue;
      const segs = chunk.split(re);
      if (segs.length === 1) continue;
      const matches = chunk.match(re) || [];
      const rebuilt: React.ReactNode[] = [];
      segs.forEach((s, idx) => {
        rebuilt.push(s);
        if (idx < matches.length) {
          rebuilt.push(
            <span key={`${icon}-${i}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name={icon} size={size} />
              <span>{matches[idx]}</span>
            </span>
          );
        }
      });
      parts.splice(i, 1, ...rebuilt);
      i += rebuilt.length - 1;
    }
  });
  return <>{parts}</>;
}
