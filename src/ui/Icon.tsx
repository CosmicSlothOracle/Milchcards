import React from 'react';

// Import SVG components - matching actual filenames in src/assets/icons
import { ReactComponent as IcAP } from '../assets/icons/ap.svg';
// government-row.svg was removed/renamed; use existing government.svg instead
import { ReactComponent as IcGovernmentRow } from '../assets/icons/government.svg';
import { ReactComponent as IcPublicRow } from '../assets/icons/public-row.svg';
import { ReactComponent as IcInitiative } from '../assets/icons/initiative.svg';
import { ReactComponent as IcInterventionTrap } from '../assets/icons/intervention-trap.svg';
import { ReactComponent as IcInfluence } from '../assets/icons/influence.svg';
import { ReactComponent as IcRoundTurn } from '../assets/icons/round-turn.svg';
import { ReactComponent as IcBuffStrength } from '../assets/icons/buff-strength.svg';
import { ReactComponent as IcDrawCards } from '../assets/icons/draw-cards.svg';
import { ReactComponent as IcDiscardCards } from '../assets/icons/discard-cards.svg';
import { ReactComponent as IcReturnToHand } from '../assets/icons/return-to-hand.svg';
import { ReactComponent as IcDeactivateCard } from '../assets/icons/deactivate-card.svg';
import { ReactComponent as IcCancelCard } from '../assets/icons/cancel-card.svg';
import { ReactComponent as IcGrantShield } from '../assets/icons/grant-shield.svg';
import { ReactComponent as IcAuraOngoing } from '../assets/icons/aura-ongoing.svg';
import { ReactComponent as IcAuraScience } from '../assets/icons/aura-science.svg';
import { ReactComponent as IcAuraHealth } from '../assets/icons/aura-health.svg';
import { ReactComponent as IcAuraMilitaryPenalty } from '../assets/icons/aura-military-penalty.svg';
import { ReactComponent as IcRegisterTrap } from '../assets/icons/register-trap.svg';
import { ReactComponent as IcInitiativeActivated } from '../assets/icons/initiative-activated.svg';
import { ReactComponent as IcStartOfTurn } from '../assets/icons/start-of-turn.svg';
import { ReactComponent as IcCopyLog } from '../assets/icons/copy-log.svg';
import { ReactComponent as IcClearLog } from '../assets/icons/clear-log.svg';
import { ReactComponent as IcSearch } from '../assets/icons/search.svg';
import { ReactComponent as IcBudgetMoney } from '../assets/icons/budget-money.svg';
import { ReactComponent as IcGameLog } from '../assets/icons/game-log.svg';
import { ReactComponent as IcMedien } from '../assets/icons/symbols_public/medien.svg';
import { ReactComponent as IcOligarch } from '../assets/icons/symbols_public/oligarch.svg';
import { ReactComponent as IcStaat } from '../assets/icons/symbols_public/staat.svg';
import { ReactComponent as IcTech } from '../assets/icons/symbols_public/tech.svg';
import { ReactComponent as IcWissenschaft } from '../assets/icons/symbols_public/wissenschaft.svg';
import { ReactComponent as IcAktivist } from '../assets/icons/symbols_public/aktivist.svg';
import { ReactComponent as IcDenker } from '../assets/icons/symbols_public/denker.svg';

// Fallback component
const noop = () => null;

const ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  // Core game icons
  ap: IcAP,
  government_row: IcGovernmentRow,
  public_row: IcPublicRow,
  initiative: IcInitiative,
  intervention_trap: IcInterventionTrap,
  influence: IcInfluence,
  round_turn: IcRoundTurn,
  buff_strength: IcBuffStrength,
  draw_cards: IcDrawCards,
  discard_cards: IcDiscardCards,
  return_to_hand: IcReturnToHand,
  deactivate_card: IcDeactivateCard,
  cancel_card: IcCancelCard,
  grant_shield: IcGrantShield,
  aura_ongoing: IcAuraOngoing,
  aura_science: IcAuraScience,
  aura_health: IcAuraHealth,
  aura_military_penalty: IcAuraMilitaryPenalty,
  register_trap: IcRegisterTrap,
  initiative_activated: IcInitiativeActivated,
  start_of_turn: IcStartOfTurn,
  copy_log: IcCopyLog,
  clear_log: IcClearLog,
  search: IcSearch,
  budget_money: IcBudgetMoney,
  game_log: IcGameLog,
  medien: IcMedien,
  oligarch: IcOligarch,
  staat: IcStaat,
  tech: IcTech,
  wissenschaft: IcWissenschaft,
  aktivist: IcAktivist,
  denker: IcDenker,
};

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 16,
  className,
  title,
  ...rest
}: {
  name: IconName;
  size?: number;
  className?: string;

  
  title?: string;
} & React.SVGProps<SVGSVGElement>) {
  const Cmp = ICONS[name] || (noop as any);
  return <Cmp width={size} height={size} aria-label={title || name} className={className} {...rest} />;
}
