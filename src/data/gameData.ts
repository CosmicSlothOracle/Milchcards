import { BasePolitician, BaseSpecial } from '../types/game';
import { EK } from './effectKeys';

// Game configuration
export const ASSETS = {
  politicians: 'assets/images/politicians_1024x1024',
  politicians_256: 'assets/images/politicians_256x256',
  specials: 'assets/images/specials_1024x1024',
  specials_256: 'assets/images/specials_256x256',
};

export const CARD_CONFIG = {
  sizes: {
    ui: 256,      // For UI lists, game canvas
    modal: 1024   // For detail modals
  },
  format: 'png',
};

// Special Cards - From Karten_Initiativen_Interventionen.md
export const Specials: BaseSpecial[] = [
  // Sofort-Initiativen (Immediate Initiatives)
  {id:1, key:'Shadow_Lobbying', name:'Shadow Lobbying', type:'Sofort-Initiative', speed:'Schnell', bp:2, effect:'Öffentlichkeits-Effekt zählt doppelt (einmalig für diese Runde)', tier:2, impl:'shadow_lobbying'},
  {id:2, key:'Spin_Doctor', name:'Spin Doctor', type:'Sofort-Initiative', speed:'Schnell', bp:2, effect:'+2 Einfluss auf eine Regierungskarte (oder +1 bei Medien)', tier:2, impl:'spin_doctor', effectKey:EK.SPIN_DOCTOR},
  {id:3, key:'Digitaler_Wahlkampf', name:'Digitaler Wahlkampf', type:'Sofort-Initiative', speed:'Schnell', bp:3, effect:'Ziehe 2 Karten. Plattform senkt Aktionspunkt-Kosten der nächsten Initiative um 1', tier:3, impl:'digital_campaign'},
  {id:4, key:'Partei_Offensive', name:'Partei-Offensive', type:'Sofort-Initiative', speed:'Schnell', bp:3, effect:'Eine Regierungskarte des Gegners wird deaktiviert (bis Rundenende)', tier:3, impl:'party_offensive'},
  {id:5, key:'Oppositionsblockade', name:'Oppositionsblockade', type:'Sofort-Initiative', speed:'Schnell', bp:4, effect:'Gegner kann keine Initiativen mehr spielen (bis Rundenende)', tier:3, impl:'opposition_block'},
  {id:6, key:'Verzoegerungsverfahren', name:'Verzögerungsverfahren', type:'Sofort-Initiative', speed:'Schnell', bp:1, effect:'+1 Aktionspunkt oder ziehe 1 Karte', tier:1, impl:'delay_procedure', effectKey:EK.AP_PLUS_1},
  {id:7, key:'Opportunist', name:'Opportunist', type:'Sofort-Initiative', speed:'Schnell', bp:3, effect:'Eine Regierungskarte -2 Einfluss, eine andere +2 Einfluss', tier:3, impl:'opportunist'},
  {id:8, key:'Think_Tank', name:'Think-tank', type:'Sofort-Initiative', speed:'Schnell', bp:2, effect:'Ziehe 1 Karte, nächste Regierungskarte +2 Einfluss', tier:2, impl:'think_tank', effectKey:EK.THINK_TANK},
  {id:9, key:'Whataboutism', name:'Whataboutism', type:'Sofort-Initiative', speed:'Schnell', bp:2, effect:'Reaktiviere eine Karte; sie erhält -1 Einfluss', tier:2, impl:'whataboutism'},
  {id:10, key:'Influencer_Kampagne', name:'Influencer-Kampagne', type:'Sofort-Initiative', speed:'Schnell', bp:2, effect:'Öffentlichkeits-Effekt zählt doppelt (einmalig)', tier:2, impl:'influencer_campaign'},
  {id:11, key:'Systemrelevant', name:'Systemrelevant', type:'Sofort-Initiative', speed:'Schnell', bp:2, effect:'Schützt 1 Karte vor Deaktivierung (einmalig)', tier:2, impl:'system_relevant'},
  {id:12, key:'Symbolpolitik', name:'Symbolpolitik', type:'Sofort-Initiative', speed:'Schnell', bp:1, effect:'Ziehe 1 Karte. Effekt: Nichts. Optik: Stark.', tier:1, impl:'symbolic_politics', effectKey:EK.DRAW_1},

  // Dauerhaft-Initiativen (Permanent Initiatives)
  {id:13, key:'Koalitionszwang', name:'Koalitionszwang', type:'Dauerhaft-Initiative', speed:'Dauerhaft', bp:2, effect:'Kein Einflussverschieben erlaubt, Tier 2 Regierungskarten +1 Einfluss', tier:2, impl:'coalition_force'},
  {id:14, key:'Algorithmischer_Diskurs', name:'Algorithmischer Diskurs', type:'Dauerhaft-Initiative', speed:'Dauerhaft', bp:2, effect:'Bei Plattform-Karten: +1 Aktionspunkt oder ziehe 1 Karte nach Initiative', tier:2, impl:'algorithmic_discourse'},
  {id:15, key:'Wirtschaftlicher_Druck', name:'Wirtschaftlicher Druck', type:'Dauerhaft-Initiative', speed:'Dauerhaft', bp:2, effect:'Wenn du eine Oligarchen-Karte spielst: +1 Einfluss auf eine Regierungskarte', tier:2, impl:'economic_pressure'},
  {id:16, key:'Zivilgesellschaft', name:'Zivilgesellschaft', type:'Dauerhaft-Initiative', speed:'Dauerhaft', bp:2, effect:'Bewegung-Karten +1 Einfluss, NGOs machen Initiativen billiger (-1 AP)', tier:2, impl:'civil_society'},
  {id:17, key:'Milchglas_Transparenz', name:'Milchglas Transparenz', type:'Dauerhaft-Initiative', speed:'Dauerhaft', bp:2, effect:'+1 Einfluss wenn keine NGO/Bewegung liegt', tier:2, impl:'transparency'},
  {id:18, key:'Alternative_Fakten', name:'Alternative Fakten', type:'Dauerhaft-Initiative', speed:'Dauerhaft', bp:2, effect:'Gegner-Interventionen -1 Wirkung (mindestens 0)', tier:2, impl:'alternative_facts'},
  {id:19, key:'Napoleon_Komplex', name:'Napoleon Komplex', type:'Dauerhaft-Initiative', speed:'Dauerhaft', bp:2, effect:'Tier 1 Regierungskarten +1 Einfluss, kein Einfluss verschieben erlaubt', tier:2, impl:'napoleon_complex'},
  {id:20, key:'Konzernfreundlicher_Algorithmus', name:'Konzernfreundlicher Algorithmus', type:'Dauerhaft-Initiative', speed:'Dauerhaft', bp:2, effect:'Bei Plattform-Karten: ziehe 1 Karte, Oligarchen +1 Einfluss', tier:2, impl:'corporate_algorithm'},

  // Interventionen (Trap Cards)
  {id:21, key:'Fake_News_Kampagne', name:'Fake News-Kampagne', type:'Intervention', speed:'Bei Medien-Karte', bp:2, effect:'Die Medien-Karte wird deaktiviert', tier:2, impl:'fake_news_campaign'},
  {id:22, key:'Whistleblower', name:'Whistleblower', type:'Intervention', speed:'Bei Tier 2 REG', bp:3, effect:'-2 Einfluss auf die Regierungskarte', tier:3, impl:'whistleblower'},
  {id:23, key:'Strategische_Enthuellung', name:'Strategische Enthüllung', type:'Intervention', speed:'Bei >2 REG', bp:3, effect:'Eine Regierungskarte zurück auf die Hand', tier:3, impl:'strategic_revelation'},
  {id:24, key:'Interne_Fraktionskaempfe', name:'Interne Fraktionskämpfe', type:'Intervention', speed:'Bei großer Initiative', bp:2, effect:'Die Initiative wird annulliert', tier:2, impl:'internal_fights'},
  {id:25, key:'Boykott_Kampagne', name:'Boykott-Kampagne', type:'Intervention', speed:'Bei NGO/Bewegung', bp:2, effect:'Die Karte wird deaktiviert', tier:2, impl:'boycott_campaign'},
  {id:26, key:'Deepfake_Skandal', name:'Deepfake-Skandal', type:'Intervention', speed:'Bei Diplomat', bp:2, effect:'Kein Einflusstransfer möglich', tier:2, impl:'deepfake_scandal'},
  {id:27, key:'Cyber_Attacke', name:'Cyber-Attacke', type:'Intervention', speed:'Bei Plattform', bp:3, effect:'Die Plattform-Karte wird zerstört', tier:3, impl:'cyber_attack'},
  {id:28, key:'Bestechungsskandal_2_0', name:'Bestechungsskandal 2.0', type:'Intervention', speed:'Bei REG M≤5', bp:3, effect:'Du übernimmst die Regierungskarte bis Rundenende', tier:3, impl:'bribery_scandal_2'},
  {id:29, key:'Grassroots_Widerstand', name:'Grassroots-Widerstand', type:'Intervention', speed:'Bei >2 ÖFF', bp:2, effect:'Eine Öffentlichkeitskarte wird deaktiviert', tier:2, impl:'grassroots_resistance'},
  {id:30, key:'Massenproteste', name:'Massenproteste', type:'Intervention', speed:'Bei 2 REG/Runde', bp:2, effect:'Beide Regierungskarten -1 Einfluss', tier:2, impl:'mass_protests'},
  {id:31, key:'Berater_Affaere', name:'Berater-Affäre', type:'Intervention', speed:'Bei Tier 1 REG', bp:2, effect:'-2 Einfluss auf die Regierungskarte', tier:2, impl:'advisor_affair'},
  {id:32, key:'Parlament_geschlossen', name:'Parlament geschlossen', type:'Intervention', speed:'Bei ≥2 REG', bp:3, effect:'Gegner kann keine weiteren Regierungskarten spielen (diese Runde)', tier:3, impl:'parliament_closed'},
  {id:33, key:'Unabhaengige_Untersuchung', name:'"Unabhängige" Untersuchung', type:'Intervention', speed:'Bei Intervention', bp:2, effect:'Die Intervention wird annulliert', tier:2, impl:'independent_investigation'},
  {id:34, key:'Soft_Power_Kollaps', name:'Soft Power-Kollaps', type:'Intervention', speed:'Bei Diplomat', bp:2, effect:'-3 Einfluss auf die Diplomat-Karte', tier:2, impl:'soft_power_collapse'},
  {id:35, key:'Cancel_Culture', name:'Cancel Culture', type:'Intervention', speed:'Bei ÖFF-Karte', bp:2, effect:'Die Öffentlichkeitskarte wird deaktiviert', tier:2, impl:'cancel_culture'},
  {id:36, key:'Lobby_Leak', name:'Lobby Leak', type:'Intervention', speed:'Bei NGO', bp:2, effect:'Gegner muss 1 Karte abwerfen', tier:2, impl:'lobby_leak'},
  {id:37, key:'Maulwurf', name:'Maulwurf', type:'Intervention', speed:'Bei REG-Karte', bp:3, effect:'Du kopierst die schwächere Regierungskarte des Gegners', tier:3, impl:'mole'},
  {id:38, key:'Skandalspirale', name:'Skandalspirale', type:'Intervention', speed:'Bei Initiative + ÖFF', bp:2, effect:'Eine der beiden Karten wird annulliert', tier:2, impl:'scandal_spiral'},
  {id:39, key:'Tunnelvision', name:'Tunnelvision', type:'Intervention', speed:'Bei REG M≤4', bp:2, effect:'Die Regierungskarte zählt nicht zur Runde', tier:2, impl:'tunnel_vision'},
  {id:40, key:'Satire_Show', name:'Satire-Show', type:'Intervention', speed:'Bei mehr Einfluss Gegner', bp:2, effect:'Eine Regierungskarte des Gegners -2 Einfluss', tier:2, impl:'satire_show'},

  // Public Cards (Öffentlichkeitskarten) - From Karten_Oeffentlichkeit.md
  {id:64, key:'Elon_Musk', name:'Elon Musk', type:'Öffentlichkeitskarte', speed:'Passiv', bp:8, effect:'Ziehe 1 Karte. Deine erste Initiative pro Runde kostet 1 Aktionspunkt weniger.', tier:2, impl:'elon_musk'},
  {id:65, key:'Bill_Gates', name:'Bill Gates', type:'Öffentlichkeitskarte', speed:'Passiv', bp:7, effect:'Ziehe 1 Karte. Deine nächste Initiative kostet 1 Aktionspunkt weniger.', tier:2, impl:'bill_gates', tag:'NGO'},
  {id:66, key:'Mark_Zuckerberg', name:'Mark Zuckerberg', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Nach einer Initiative: +1 Aktionspunkt zurück (einmal pro Runde).', tier:2, impl:'mark_zuckerberg'},
  {id:67, key:'Oprah_Winfrey', name:'Oprah Winfrey', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Wenn du eine Initiative spielst, darfst du 1 Karte abwerfen und 1 ziehen.', tier:1, impl:'oprah_winfrey'},
  {id:68, key:'Sam_Altman', name:'Sam Altman', type:'Öffentlichkeitskarte', speed:'Passiv', bp:6, effect:'Bei einer KI-bezogenen Initiative: ziehe 1 Karte + 1 Aktionspunkt zurück.', tier:2, impl:'sam_altman'},
  {id:69, key:'George_Soros', name:'George Soros', type:'Öffentlichkeitskarte', speed:'Passiv', bp:7, effect:'+1 Aktionspunkt wenn der Gegner eine autoritäre Regierungskarte hat.', tier:2, impl:'george_soros', tag:'NGO'},
  {id:70, key:'Greta_Thunberg', name:'Greta Thunberg', type:'Öffentlichkeitskarte', speed:'Passiv', bp:4, effect:'Deine erste Regierungskarte pro Runde kostet 0 Aktionspunkte (einmal pro Runde).', tier:1, impl:'greta_thunberg'},
  {id:71, key:'Jack_Ma', name:'Jack Ma', type:'Öffentlichkeitskarte', speed:'Passiv', bp:7, effect:'Nach einer Initiative: Ziehe 1 Karte + optional -1 HP auf gegnerische Regierungs-Plattform.', tier:2, impl:'jack_ma'},
  {id:72, key:'Jennifer_Doudna', name:'Jennifer Doudna', type:'Öffentlichkeitskarte', speed:'Passiv', bp:4, effect:'Deine Initiativen mit "Wissenschaft" erhalten +1 Effekt.', tier:1, impl:'jennifer_doudna'},
  {id:73, key:'Malala_Yousafzai', name:'Malala Yousafzai', type:'Öffentlichkeitskarte', speed:'Passiv', bp:4, effect:'Wenn du eine NGO/Think-Tank spielst, ziehe 1 Karte.', tier:1, impl:'malala_yousafzai'},
  {id:74, key:'Noam_Chomsky', name:'Noam Chomsky', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Gegner erhalten -1 Effekt bei "Militär"-Initiativen.', tier:1, impl:'noam_chomsky'},
  {id:75, key:'Roman_Abramovich', name:'Roman Abramovich', type:'Öffentlichkeitskarte', speed:'Passiv', bp:6, effect:'Ziehe 1 Karte, wenn eine Regierungskarte mit Einfluss 5 oder weniger ausgespielt wird.', tier:2, impl:'roman_abramovich'},
  {id:76, key:'Tim_Cook', name:'Tim Cook', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Deine dauerhaften Initiativen kosten 1 HP weniger (nur beim Deckbau).', tier:2, impl:'tim_cook'},
  {id:77, key:'Mukesh_Ambani', name:'Mukesh Ambani', type:'Öffentlichkeitskarte', speed:'Passiv', bp:6, effect:'Ziehe 1 Karte. Gegner darf 1 Karte weniger nachziehen in der Runde.', tier:2, impl:'mukesh_ambani'},
  {id:78, key:'Jeff_Bezos', name:'Jeff Bezos', type:'Öffentlichkeitskarte', speed:'Passiv', bp:6, effect:'Ziehe 1 Karte beim Ausspielen. Wenn eine Plattform liegt: +1 Aktionspunkt.', tier:2, impl:'jeff_bezos'},
  {id:79, key:'Alisher_Usmanov', name:'Alisher Usmanov', type:'Öffentlichkeitskarte', speed:'Passiv', bp:6, effect:'+1 Schutz für eine Regierungskarte.', tier:2, impl:'alisher_usmanov'},
  {id:80, key:'Zhang_Yiming', name:'Zhang Yiming', type:'Öffentlichkeitskarte', speed:'Passiv', bp:6, effect:'Ziehe 1 Karte. Bei Medien auf dem Feld: -1 Aktionspunkt auf deine nächste Initiative.', tier:2, impl:'zhang_yiming'},
  {id:81, key:'Edward_Snowden', name:'Edward Snowden', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Gegner verliert 1 Karte (zufällig). Bei US-Regierungskarte: -1 Einfluss dort.', tier:1, impl:'edward_snowden'},
  {id:82, key:'Julian_Assange', name:'Julian Assange', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Beim Ausspielen: +1 Karte, aber auch Gegner zieht 1. Bei NGO auf dem Feld: Ziehe 2 statt 1.', tier:1, impl:'julian_assange'},
  {id:83, key:'Yuval_Noah_Harari', name:'Yuval Noah Harari', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Deine nächste dauerhafte Initiative kostet 1 Aktionspunkt weniger. +1 Aktionspunkt, wenn auch Plattform liegt.', tier:1, impl:'yuval_harari'},
  {id:84, key:'Ai_Weiwei', name:'Ai Weiwei', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Bei einer Kunst/Kultur-Initiative: ziehe 1 Karte + 1 Aktionspunkt zurück.', tier:1, impl:'ai_weiwei'},
  {id:85, key:'Alexei_Navalny', name:'Alexei Navalny', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Bei Auslösen einer gegnerischen Intervention: ziehe 1 Karte.', tier:1, impl:'alexei_navalny'},
  {id:86, key:'Anthony_Fauci', name:'Anthony Fauci', type:'Öffentlichkeitskarte', speed:'Passiv', bp:5, effect:'Bei einer Gesundheits-Initiative: +1 Effekt.', tier:1, impl:'anthony_fauci', tag:'NGO'},
  {id:87, key:'Warren_Buffett', name:'Warren Buffett', type:'Öffentlichkeitskarte', speed:'Passiv', bp:7, effect:'Ziehe 1 Karte. Bei einer Wirtschafts-Initiative: +1 Effekt.', tier:2, impl:'warren_buffett'},
  {id:88, key:'Gautam_Adani', name:'Gautam Adani', type:'Öffentlichkeitskarte', speed:'Passiv', bp:6, effect:'Ziehe 1 Karte. Bei einer Infrastruktur-Initiative: +1 Effekt.', tier:2, impl:'gautam_adani'},

  // NGO Cards for testing Joschka Fischer
  {id:94, key:'Greenpeace', name:'Greenpeace', type:'Öffentlichkeitskarte', speed:'Passiv', bp:3, effect:'NGO: Umweltschutz +1 Einfluss auf eigene Regierungskarten.', tier:1, impl:'greenpeace', tag:'NGO'},
  {id:95, key:'Amnesty_International', name:'Amnesty International', type:'Öffentlichkeitskarte', speed:'Passiv', bp:4, effect:'NGO: Menschenrechte +1 Einfluss bei Diplomat-Karten.', tier:1, impl:'amnesty_international', tag:'NGO'},
];

// Politicians data - Only government cards from MD files
export const Pols: BasePolitician[] = [
  // Government Cards (Regierung) - From Karten_Regierung.md
  {id:1,  key:'Vladimir_Putin', name:'Vladimir Putin', influence:10, tag:'Staatsoberhaupt', T:2, BP:17},
  {id:2,  key:'Xi_Jinping', name:'Xi Jinping', influence:10,  tag:'Staatsoberhaupt', T:2, BP:17},
  {id:3,  key:'Recep_Tayyip_Erdogan', name:'Recep Tayyip Erdoğan', influence:10, tag:'Staatsoberhaupt', T:2, BP:17},
  {id:4,  key:'Justin_Trudeau', name:'Justin Trudeau', influence:8, tag:'Regierungschef', T:2, BP:13},
  {id:5,  key:'Volodymyr_Zelenskyy', name:'Volodymyr Zelenskyy', influence:9, tag:'Staatsoberhaupt', T:2, BP:13},
  {id:6,  key:'Ursula_von_der_Leyen', name:'Ursula von der Leyen', influence:9, tag:'Diplomat', T:2, BP:15},
  {id:7,  key:'Narendra_Modi', name:'Narendra Modi', influence:9, tag:'Regierungschef', T:2, BP:13},
  {id:8,  key:'Luiz_Inacio_Lula', name:'Luiz Inácio Lula da Silva', influence:9, tag:'Staatsoberhaupt', T:2, BP:13},
  {id:9,  key:'Sergey_Lavrov', name:'Sergey Lavrov', influence:9, tag:'Diplomat', T:2, BP:13},
  {id:10, key:'Wolfgang_Schaeuble', name:'Wolfgang Schäuble', influence:8, tag:'Minister', T:2, BP:13},
  {id:11, key:'Jens_Stoltenberg', name:'Jens Stoltenberg', influence:8, tag:'Diplomat', T:2, BP:12},
  {id:12, key:'Helmut_Schmidt', name:'Helmut Schmidt', influence:9, tag:'Staatsoberhaupt', T:2, BP:15},
  {id:13, key:'Javier_Milei', name:'Javier Milei', influence:7, tag:'Staatsoberhaupt', T:2, BP:11},
  {id:14, key:'Joschka_Fischer', name:'Joschka Fischer', influence:7, tag:'Diplomat', T:2, BP:11, effect:'ngo_boost'},
  {id:15, key:'Kamala_Harris', name:'Kamala Harris', influence:7, tag:'Staatsoberhaupt', T:2, BP:11},
  {id:16, key:'Olaf_Scholz', name:'Olaf Scholz', influence:7, tag:'Regierungschef', T:1, BP:7},
  {id:17, key:'Rishi_Sunak', name:'Rishi Sunak', influence:7, tag:'Regierungschef', T:1, BP:6},
  {id:18, key:'Pedro_Sanchez', name:'Pedro Sánchez', influence:6, tag:'Regierungschef', T:1, BP:5},
  {id:19, key:'Keir_Starmer', name:'Keir Starmer', influence:6, tag:'Abgeordneter', T:1, BP:5},
  {id:20, key:'Robert_Gates', name:'Robert Gates', influence:6, tag:'Minister', T:1, BP:5},
  {id:21, key:'Karl_Rove', name:'Karl Rove', influence:6, tag:'Berater', T:1, BP:5},
  {id:22, key:'Shigeru_Ishiba', name:'Shigeru Ishiba', influence:6, tag:'Minister', T:1, BP:5},
  {id:23, key:'Heidemarie_Wieczorek_Zeul', name:'Heidemarie Wieczorek-Zeul', influence:5, tag:'Minister', T:1, BP:4},
  {id:24, key:'Renate_Kuenast', name:'Renate Künast', influence:5, tag:'Minister', T:1, BP:4},
  {id:25, key:'Rudolf_Scharping', name:'Rudolf Scharping', influence:5, tag:'Minister', T:1, BP:4},
  {id:26, key:'John_Ashcroft', name:'John Ashcroft', influence:5, tag:'Minister', T:1, BP:4},
  {id:27, key:'Tedros_Adhanom_Ghebreyesus', name:'Tedros Adhanom Ghebreyesus', influence:5, tag:'Berater', T:1, BP:4},
  {id:28, key:'Tom_Ridge', name:'Tom Ridge', influence:5, tag:'Minister', T:1, BP:4},
  {id:29, key:'Henry_Paulson', name:'Henry Paulson', influence:6, tag:'Minister', T:1, BP:5},
  {id:30, key:'Horst_köhler', name:'Horst Köhler', influence:7, tag:'Staatsoberhaupt', T:1, BP:6},
  {id:31, key:'Johannes_Rau', name:'Johannes Rau', influence:6, tag:'Staatsoberhaupt', T:1, BP:5},
  {id:32, key:'John_Snow', name:'John Snow', influence:4, tag:'Minister', T:1, BP:3},
  {id:33, key:'Karl_Carstens', name:'Karl Carstens', influence:4, tag:'Staatsoberhaupt', T:1, BP:3},
  {id:34, key:'Hans_Eichel', name:'Hans Eichel', influence:4, tag:'Minister', T:1, BP:3},
  {id:35, key:'Walter_Scheel', name:'Walter Scheel', influence:4, tag:'Diplomat', T:1, BP:4},
  {id:36, key:'Werner_Maihofer', name:'Werner Maihofer', influence:3, tag:'Minister', T:1, BP:2},
  {id:37, key:'Andrzej_Duda', name:'Andrzej Duda', influence:8, tag:'Staatsoberhaupt', T:2, BP:13},
  {id:38, key:'Anthony_Albanese', name:'Anthony Albanese', influence:8, tag:'Regierungschef', T:2, BP:13},
  {id:39, key:'Benjamin_Netanyahu', name:'Benjamin Netanyahu', influence:9, tag:'Regierungschef', T:2, BP:15},
  {id:40, key:'Dick_Cheney', name:'Dick Cheney', influence:8, tag:'Staatsoberhaupt', T:2, BP:13},
  {id:41, key:'Donald_Trump', name:'Donald Trump', influence:10, tag:'Staatsoberhaupt', T:2, BP:17},
  {id:42, key:'Ebrahim_Raisi', name:'Ebrahim Raisi', influence:9, tag:'Staatsoberhaupt', T:2, BP:15},
  {id:43, key:'Emmanuel_Macron', name:'Emmanuel Macron', influence:9, tag:'Staatsoberhaupt', T:2, BP:15},
  {id:44, key:'Giorgia_Meloni', name:'Giorgia Meloni', influence:9, tag:'Regierungschef', T:2, BP:15},
  {id:45, key:'King_Charles_III', name:'King Charles III', influence:7, tag:'Staatsoberhaupt', T:2, BP:12},
  {id:46, key:'Mohammed_bin_Salman', name:'Mohammed bin Salman', influence:10, tag:'Staatsoberhaupt', T:2, BP:17},
  {id:47, key:'Alberto_Gonzales', name:'Alberto Gonzales', influence:5, tag:'Minister', T:1, BP:4},
  {id:48, key:'Annette_Schavan', name:'Annette Schavan', influence:5, tag:'Minister', T:1, BP:4},
  {id:49, key:'Edelgard_Bulmahn', name:'Edelgard Bulmahn', influence:4, tag:'Minister', T:1, BP:3},
  {id:50, key:'Erhard_Eppler', name:'Erhard Eppler', influence:6, tag:'Minister', T:1, BP:5},
  {id:51, key:'Franz_Josef_Jung', name:'Franz Josef Jung', influence:5, tag:'Minister', T:1, BP:4},
  {id:52, key:'Friedrich_Merz', name:'Friedrich Merz', influence:6, tag:'Abgeordneter', T:1, BP:5},
  {id:53, key:'Georg_Leber', name:'Georg Leber', influence:5, tag:'Minister', T:1, BP:4},
  {id:54, key:'Gerhart_Baum', name:'Gerhart Baum', influence:4, tag:'Minister', T:1, BP:3},
  {id:55, key:'Hans_Apel', name:'Hans Apel', influence:5, tag:'Minister', T:1, BP:4},
  {id:56, key:'Hans_Dietrich_Genscher', name:'Hans Dietrich Genscher', influence:8, tag:'Diplomat', T:2, BP:13},
  {id:57, key:'Otto_Schily', name:'Otto Schily', influence:6, tag:'Minister', T:1, BP:5},
  {id:58, key:'Peter_Struck', name:'Peter Struck', influence:5, tag:'Minister', T:1, BP:4},
  {id:59, key:'Rainer_Offergeld', name:'Rainer Offergeld', influence:4, tag:'Minister', T:1, BP:3},
  {id:60, key:'Colin_Powell', name:'Colin Powell', influence:7, tag:'Diplomat', T:2, BP:12},
  {id:61, key:'Condoleezza_Rice', name:'Condoleezza Rice', influence:7, tag:'Diplomat', T:2, BP:12},
  {id:62, key:'Donald_Rumsfeld', name:'Donald Rumsfeld', influence:7, tag:'Minister', T:2, BP:12},
  {id:63, key:'Christine_Lagarde', name:'Christine Lagarde', influence:8, tag:'Diplomat', T:2, BP:13},
];

// Filename mapping for card images
export const FILENAME_MAPPING: Record<string, string> = {
  // Politicians
  'Vladimir_Putin': 'Vladimir_Putin.png',
  'Xi_Jinping': 'Xi_Jinping.png',
  'Recep_Tayyip_Erdogan': 'Recep_Tayyip_Erdogan.png',
  'Justin_Trudeau': 'Justin_Trudeau.png',
  'Volodymyr_Zelenskyy': 'Volodymyr_Zelenskyy.png',
  'Ursula_von_der_Leyen': 'Ursula_von_der_Leyen.png',
  'Narendra_Modi': 'Narendra_Modi.png',
  'Luiz_Inacio_Lula': 'Luiz_Inacio_Lula.png',
  'Sergey_Lavrov': 'Sergey_Lavrov.png',
  'Wolfgang_Schaeuble': 'Wolfgang_Schaeuble.png',
  'Jens_Stoltenberg': 'Jens_Stoltenberg.png',
  'Helmut_Schmidt': 'Helmut_Schmidt.png',
  'Javier_Milei': 'Javier_Milei.png',
  'Joschka_Fischer': 'Joschka_Fischer.png',
  'Kamala_Harris': 'Kamala_Harris.png',
  'Olaf_Scholz': 'Olaf_Scholz.png',
  'Rishi_Sunak': 'Rishi_Sunak.png',
  'Pedro_Sanchez': 'Pedro_Sanchez.png',
  'Keir_Starmer': 'Keir_Starmer.png',
  'Robert_Gates': 'Robert_Gates.png',
  'Karl_Rove': 'Karl_Rove.png',
  'Shigeru_Ishiba': 'Shigeru_Ishiba.png',
  'Heidemarie_Wieczorek_Zeul': 'Heidemarie_Wieczorek_Zeul.png',
  'Renate_Kuenast': 'Renate_Kuenast.png',
  'Rudolf_Scharping': 'Rudolf_Scharping.png',
  'John_Ashcroft': 'John_Ashcroft.png',
  'Tedros_Adhanom_Ghebreyesus': 'Tedros_Adhanom_Ghebreyesus.png',
  'Tom_Ridge': 'Tom_Ridge.png',
  'Henry_Paulson': 'Henry_Paulson.png',
  'Horst_köhler': 'Horst_köhler.png',
  'Johannes_Rau': 'Johannes_Rau.png',
  'John_Snow': 'John_Snow.png',
  'Karl_Carstens': 'Karl_Carstens.png',
  'Hans_Eichel': 'Hans_Eichel.png',
  'Walter_Scheel': 'Walter_Scheel.png',
  'Werner_Maihofer': 'Werner_Maihofer.png',
  'Andrzej_Duda': 'Andrzej_Duda.png',
  'Anthony_Albanese': 'Anthony_Albanese.png',
  'Benjamin_Netanyahu': 'Benjamin_Netanyahu.png',
  'Dick_Cheney': 'Dick_Cheney.png',
  'Donald_Trump': 'Donald_Trump.png',
  'Ebrahim_Raisi': 'Ebrahim_Raisi.png',
  'Emmanuel_Macron': 'Emmanuel_Macron.png',
  'Giorgia_Meloni': 'Giorgia_Meloni.png',
  'King_Charles_III': 'King_Charles_III.png',
  'Mohammed_bin_Salman': 'Mohammed_bin_Salman.png',
  'Alberto_Gonzales': 'Alberto_Gonzales.png',
  'Annette_Schavan': 'Annette_Schavan.png',
  'Edelgard_Bulmahn': 'Edelgard_Bulmahn.png',
  'Erhard_Eppler': 'Erhard_Eppler.png',
  'Franz_Josef_Jung': 'Franz_Josef_Jung.png',
  'Friedrich_Merz': 'Friedrich_Merz.png',
  'Georg_Leber': 'Georg_Leber.png',
  'Gerhart_Baum': 'Gerhart_Baum.png',
  'Hans_Apel': 'Hans_Apel.png',
  'Hans_Dietrich_Genscher': 'Hans_Dietrich_Genscher.png',
  'Otto_Schily': 'Otto_Schily.png',
  'Peter_Struck': 'Peter_Struck.png',
  'Rainer_Offergeld': 'Rainer_Offergeld.png',
  'Colin_Powell': 'Colin_Powell.png',
  'Condoleezza_Rice': 'Condoleezza_Rice.png',
  'Donald_Rumsfeld': 'Donald_Rumsfeld.png',
  'Christine_Lagarde': 'Christine_Lagarde.png',
  'Elon_Musk': 'Elon_Musk.png',
  'Bill_Gates': 'Bill_Gates.png',
  'Mark_Zuckerberg': 'Mark_Zuckerberg.png',
  'Oprah_Winfrey': 'Oprah_Winfrey.png',
  'Sam_Altman': 'Sam_Altman.png',
  'George_Soros': 'George_Soros.png',
  'Greta_Thunberg': 'Greta_Thunberg.png',
  'Jack_Ma': 'Jack_Ma.png',
  'Jennifer_Doudna': 'Jennifer_Doudna.png',
  'Malala_Yousafzai': 'Malala_Yousafzai.png',
  'Noam_Chomsky': 'Noam_Chomsky.png',
  'Roman_Abramovich': 'Roman_Abramovich.png',
  'Tim_Cook': 'Tim_Cook.png',
  'Mukesh_Ambani': 'Mukesh_Ambani.png',
  'Jeff_Bezos': 'Jeff_Bezos.png',
  'Alisher_Usmanov': 'Alisher_Usmanov.png',
  'Zhang_Yiming': 'Zhang_Yiming.png',
  'Edward_Snowden': 'Edward_Snowden.png',
  'Julian_Assange': 'Julian_Assange.png',
  'Yuval_Noah_Harari': 'Yuval_Noah_Harari.png',
  'Ai_Weiwei': 'Ai_Weiwei.png',
  'Alexei_Navalny': 'Alexei_Navalny.png',
  'Anthony_Fauci': 'Anthony_Fauci.png',
  'Warren_Buffett': 'Warren_Buffett.png',
  'Gautam_Adani': 'Gautam_Adani.png',
  'Greenpeace': 'Greenpeace.png',
  'Amnesty_International': 'Amnesty_International.png',

  // Special Cards
  'Shadow_Lobbying': 'Sofort-Initiative_T2_Shadow_Lobbying.png',
  'Spin_Doctor': 'Sofort-Initiative_T2_Spin_Doctor.png',
  'Digitaler_Wahlkampf': 'Sofort-Initiative_T3_Digitaler_Wahlkampf.png',
  'Partei_Offensive': 'Sofort-Initiative_T3_Partei-Offensive.png',
  'Oppositionsblockade': 'Sofort-Initiative_T3_Oppositionsblockade.png',
  'Verzoegerungsverfahren': 'Sofort-Initiative_T1_Verzögerungsverfahren.png',
  'Opportunist': 'Sofort-Initiative_T3_Opportunist.png',
  'Think_Tank': 'Sofort-Initiative_T2_Think-Tank.png',
  'Whataboutism': 'Sofort-Initiative_T2_whatabouttism.png',
  'Influencer_Kampagne': 'Sofort-Initiative_T2_Influencer_Kampagne.png',
  'Systemrelevant': 'Sofort-Initiative_T2_Systemrelevant.png',
  'Symbolpolitik': 'Sofort-Initiative_T1_Symbolpolitik.png',
  'Koalitionszwang': 'Initiative-Dauerhaft_T2_Koalitionszwang.png',
  'Algorithmischer_Diskurs': 'Initiative-Dauerhaft_T2_Algorithmischer_Diskurs.png',
  'Wirtschaftlicher_Druck': 'Initiative-Dauerhaft_T2_Wirtschaftlicher-Druck.png',
  'Zivilgesellschaft': 'Initiative-Dauerhaft_T2_Zivilgesellschaft.png',
  'Milchglas_Transparenz': 'Initiative-Dauerhaft_T2_Milchglas_Transparenz.png',
  'Alternative_Fakten': 'Initiative-Dauerhaft_T2_Alternative_Fakten.png',
  'Napoleon_Komplex': 'Initiative-Dauerhaft_T2_Napoleon_Komplex.png',
  'Konzernfreundlicher_Algorithmus': 'Initiative-Dauerhaft_T2_Konzernfreundlicher Algorithmus.png',
  'Fake_News_Kampagne': 'Intervention_T2_Fake News-Kampagne.png',
  'Whistleblower': 'Intervention_T3_Whistleblower.png',
  'Strategische_Enthuellung': 'Intervention_T3_Strategische Enthüllung.png',
  'Interne_Fraktionskaempfe': 'Intervention_T2_Interne Fraktionskämpfe.png',
  'Boykott_Kampagne': 'Intervention_T2_Boykott-Kampagne.png',
  'Deepfake_Skandal': 'Intervention_T2_Deepfake-Skandal.png',
  'Cyber_Attacke': 'Intervention_T3_Cyberattack.png',
  'Bestechungsskandal_2_0': 'Intervention_T3_Bestechungsskandal_2.0.png',
  'Grassroots_Widerstand': 'Intervention_T2_Grassroots-Widerstand.png',
  'Massenproteste': 'Intervention_T2_Massenproteste.png',
  'Berater_Affaere': 'Intervention_T2_Berater_Affäre.png',
  'Parlament_geschlossen': 'Intervention_T3_Parlament_geschlossen.png',
  'Unabhaengige_Untersuchung': 'Intervention_T2_Unabhängige_Untersuchung.png',
  'Soft_Power_Kollaps': 'Intervention_T2_Soft_power_kollaps.png',
  'Cancel_Culture': 'Intervention_T2_Cancel Culture.png',
  'Lobby_Leak': 'Intervention_T2_Lobby_Leak.png',
  'Maulwurf': 'Intervention_T3_Maulwurf.png',
  'Skandalspirale': 'Intervention_T2_Skandalspirale.png',
  'Tunnelvision': 'Intervention_T2_Tunnelvision.png',
  'Satire_Show': 'Intervention_T2_Satire_Show.png',
};

// Helper function to get card image path
export function getCardImagePath(
  card: { kind: 'pol' | 'spec'; baseId: number },
  size: 'ui' | 'modal' = 'ui'
): string {
  if (card.kind === 'pol') {
    const pol = Pols.find(p => p.id === card.baseId);
    const filename = pol ? FILENAME_MAPPING[pol.key] : 'default.png';
    const assetPath = size === 'ui' ? ASSETS.politicians_256 : ASSETS.politicians;
    return `${assetPath}/${filename}`;
  } else {
    const spec = Specials.find(s => s.id === card.baseId);
    const filename = spec ? FILENAME_MAPPING[spec.key] : 'default.png';

    // Public cards (Öffentlichkeitskarten) use politician images
    if (spec && spec.type === 'Öffentlichkeitskarte') {
      const assetPath = size === 'ui' ? ASSETS.politicians_256 : ASSETS.politicians;
      return `${assetPath}/${filename}`;
    }

    // Other special cards use special images
    const assetPath = size === 'ui' ? ASSETS.specials_256 : ASSETS.specials;
    return `${assetPath}/${filename}`;
  }
}

// UI Configuration
export const UI_ZONES: Record<string, { x: number; y: number; w: number; h: number }> = {
  DECK_LIST: { x: 0, y: 0, w: 200, h: 600 },
  GAME_AREA: { x: 200, y: 0, w: 800, h: 600 },
  MODAL: { x: 100, y: 100, w: 600, h: 400 }
};

// Preset deck configurations based on Vorgefertigte_Decks.md
export const PRESET_DECKS = {
  INITIATIVE_TEST_DECK: [
    // 🧪 INITIATIVE TEST DECK: Phase 1 - Alle 4 implementierten Sofort-Initiativen
    // Minimaler Deck für fokussiertes Testing der neuen Engine

    // Regierungskarten (4 Karten) - Verschiedene Stärken für Spin Doctor Test
    { kind: 'pol' as const, baseId: 21, count: 1 }, // Karl Rove (Berater, 6 I) - SCHWÄCHSTE
    { kind: 'pol' as const, baseId: 20, count: 1 }, // Robert Gates (Minister, 6 I)
    { kind: 'pol' as const, baseId: 16, count: 1 }, // Olaf Scholz (Regierungschef, 7 I) - STÄRKSTE
    { kind: 'pol' as const, baseId: 14, count: 1 }, // Joschka Fischer (Diplomat, 7 I) - Think-tank Test

    // Alle 4 Phase-1-Initiativen (4 Karten)
    { kind: 'spec' as const, baseId: 12, count: 1 }, // Symbolpolitik (1 BP) - DRAW_1
    { kind: 'spec' as const, baseId: 6, count: 1 },  // Verzögerungsverfahren (1 BP) - AP_PLUS_1
    { kind: 'spec' as const, baseId: 8, count: 1 },  // Think-tank (2 BP) - THINK_TANK
    { kind: 'spec' as const, baseId: 2, count: 1 },  // Spin Doctor (2 BP) - SPIN_DOCTOR

    // Support-Karten (2 Karten) - Zum Testen der Kombinationen
    { kind: 'spec' as const, baseId: 69, count: 1 }, // George Soros (7 BP) - Autoritär-Bonus
    { kind: 'spec' as const, baseId: 70, count: 1 }, // Greta Thunberg (4 BP) - Gov kostet 0 AP
  ],

  TEST_DECK_WITH_DRAW_EFFECTS: [
    // 🧪 TEST DECK: "Ziehe 1 Karte" Effekt-Testing für alle 6 Karten + Shadow Lobbying
    // Regierungskarten (3 Karten)
    { kind: 'pol' as const, baseId: 14, count: 1 }, // Joschka Fischer (Diplomat, 7 M) - NGO BOOST EFFEKT
    { kind: 'pol' as const, baseId: 21, count: 1 }, // Karl Rove (Berater, 6 M)
    { kind: 'pol' as const, baseId: 20, count: 1 }, // Robert Gates (Minister, 6 M)

    // Öffentlichkeitskarten (8 Karten) - Alle "Ziehe 1 Karte" Effekte
    { kind: 'spec' as const, baseId: 64, count: 1 }, // Elon Musk (8 BP) - ZIEHE 1 KARTE + erste Initiative -1 AP
    { kind: 'spec' as const, baseId: 65, count: 1 }, // Bill Gates (7 BP) - ZIEHE 1 KARTE + nächste Initiative -1 AP
    { kind: 'spec' as const, baseId: 78, count: 1 }, // Jeff Bezos (6 BP) - ZIEHE 1 KARTE + bei Plattform +1 AP
    { kind: 'spec' as const, baseId: 87, count: 1 }, // Warren Buffett (7 BP) - ZIEHE 1 KARTE + bei Wirtschafts-Initiative +1 Effect
    { kind: 'spec' as const, baseId: 88, count: 1 }, // Gautam Adani (6 BP) - ZIEHE 1 KARTE + bei Infrastruktur-Initiative +1 Effect
    { kind: 'spec' as const, baseId: 80, count: 1 }, // Zhang Yiming (6 BP) - ZIEHE 1 KARTE + bei Medien -1 AP nächste Initiative
    { kind: 'spec' as const, baseId: 69, count: 1 }, // George Soros (7 BP) - AP BEI AUTORITÄR EFFEKT (für NGO-Synergie)
    { kind: 'spec' as const, baseId: 86, count: 1 }, // Anthony Fauci (5 BP) - Gesundheits-Initiative +1 Effect (für NGO-Synergie)

    // Initiativen (1 Karte) - Shadow Lobbying für Effekt-Testing
    { kind: 'spec' as const, baseId: 1, count: 1 }, // Shadow Lobbying (2 BP) - ÖFFENTLICHKEITS-EFFEKTE ZÄHLEN DOPPELT
  ],

  TEST_DECK_5_CARDS: [
    // 🧪 TEST DECK: 5 Karten für isoliertes Effekt-Testing (Legacy)
    // Regierungskarten (3 Karten)
    { kind: 'pol' as const, baseId: 14, count: 1 }, // Joschka Fischer (Diplomat, 7 M) - NGO BOOST EFFEKT
    { kind: 'pol' as const, baseId: 21, count: 1 }, // Karl Rove (Berater, 6 M)
    { kind: 'pol' as const, baseId: 20, count: 1 }, // Robert Gates (Minister, 6 M)

    // Öffentlichkeitskarten (2 Karten)
    { kind: 'spec' as const, baseId: 65, count: 1 }, // Bill Gates (7 BP) - ZIEHE 1 KARTE + AP EFFEKT
    { kind: 'spec' as const, baseId: 69, count: 1 }, // George Soros (7 BP) - AP BEI AUTORITÄR EFFEKT
  ],

  NEOLIBERAL_TECHNOKRAT: [
    // Regierungskarten (8 Karten, 52 HP) - mit Joschka Fischer für NGO-Test!
    { kind: 'pol' as const, baseId: 4, count: 1 },   // Justin Trudeau (13 HP)
    { kind: 'pol' as const, baseId: 5, count: 1 },   // Volodymyr Zelenskyy (13 HP)
    { kind: 'pol' as const, baseId: 14, count: 1 },  // Joschka Fischer (11 HP) - NGO BOOST!
    { kind: 'pol' as const, baseId: 16, count: 1 },  // Olaf Scholz (7 HP)
    { kind: 'pol' as const, baseId: 18, count: 1 },  // Pedro Sánchez (5 HP)
    { kind: 'pol' as const, baseId: 19, count: 1 },  // Keir Starmer (5 HP)
    { kind: 'pol' as const, baseId: 20, count: 1 },  // Robert Gates (5 HP)
    { kind: 'pol' as const, baseId: 21, count: 1 },  // Karl Rove (5 HP)

    // Öffentlichkeitskarten (10 Karten, 51 HP) - mit NGOs für Joschka Fischer Test!
    { kind: 'spec' as const, baseId: 64, count: 1 },  // Elon Musk (8 HP)
    { kind: 'spec' as const, baseId: 65, count: 1 },  // Bill Gates (7 HP)
    { kind: 'spec' as const, baseId: 66, count: 1 },  // Mark Zuckerberg (5 HP)
    { kind: 'spec' as const, baseId: 67, count: 1 },  // Oprah Winfrey (5 HP)
    { kind: 'spec' as const, baseId: 68, count: 1 },  // Sam Altman (6 HP)
    { kind: 'spec' as const, baseId: 94, count: 1 },  // Greenpeace (3 HP) - NGO TEST!
    { kind: 'spec' as const, baseId: 95, count: 1 },  // Amnesty International (4 HP) - NGO TEST!
    { kind: 'spec' as const, baseId: 69, count: 1 },  // George Soros (7 HP)
    { kind: 'spec' as const, baseId: 70, count: 1 },  // Greta Thunberg (4 HP)

    // Initiativen (9 Karten, 12 HP)
    { kind: 'spec' as const, baseId: 6, count: 1 },  // Verzögerungsverfahren (1 HP)
    { kind: 'spec' as const, baseId: 12, count: 1 }, // Symbolpolitik (1 HP)
    { kind: 'spec' as const, baseId: 1, count: 1 },  // Shadow Lobbying (2 HP)
    { kind: 'spec' as const, baseId: 2, count: 1 },  // Spin Doctor (2 HP)
    { kind: 'spec' as const, baseId: 8, count: 1 },  // Think-tank (2 HP)
    { kind: 'spec' as const, baseId: 10, count: 1 }, // Influencer-Kampagne (2 HP)
    { kind: 'spec' as const, baseId: 11, count: 1 }, // Systemrelevant (2 HP)
  ],

  AUTORITAERER_REALIST: [
    // Regierungskarten (7 Karten, 45 HP)
    { kind: 'pol' as const, baseId: 1, count: 1 },   // Vladimir Putin (17 HP)
    { kind: 'pol' as const, baseId: 2, count: 1 },   // Xi Jinping (17 HP)
    { kind: 'pol' as const, baseId: 3, count: 1 },   // Recep Tayyip Erdoğan (17 HP)
    { kind: 'pol' as const, baseId: 14, count: 1 },  // Joschka Fischer (11 HP)

    // Öffentlichkeitskarten (6 Karten, 30 HP)
    { kind: 'spec' as const, baseId: 75, count: 1 },  // Roman Abramovich (6 HP)
    { kind: 'spec' as const, baseId: 79, count: 1 },  // Alisher Usmanov (6 HP)
    { kind: 'spec' as const, baseId: 80, count: 1 },  // Zhang Yiming (6 HP)
    { kind: 'spec' as const, baseId: 71, count: 1 },  // Jack Ma (7 HP)
    { kind: 'spec' as const, baseId: 77, count: 1 },  // Mukesh Ambani (6 HP)

    // Initiativen (6 Karten, 18 HP)
    { kind: 'spec' as const, baseId: 4, count: 1 },  // Partei-Offensive (3 HP)
    { kind: 'spec' as const, baseId: 5, count: 1 },  // Oppositionsblockade (4 HP)
    { kind: 'spec' as const, baseId: 7, count: 1 },  // Opportunist (3 HP)
    { kind: 'spec' as const, baseId: 13, count: 1 }, // Koalitionszwang (2 HP)
    { kind: 'spec' as const, baseId: 15, count: 1 }, // Wirtschaftlicher Druck (2 HP)
    { kind: 'spec' as const, baseId: 19, count: 1 }, // Napoleon Komplex (2 HP)

    // Interventionen (6 Karten, 15 HP)
    { kind: 'spec' as const, baseId: 21, count: 1 }, // Fake News-Kampagne (2 HP)
    { kind: 'spec' as const, baseId: 22, count: 1 }, // Whistleblower (3 HP)
    { kind: 'spec' as const, baseId: 23, count: 1 }, // Strategische Enthüllung (3 HP)
    { kind: 'spec' as const, baseId: 24, count: 1 }, // Interne Fraktionskämpfe (2 HP)
    { kind: 'spec' as const, baseId: 25, count: 1 }, // Boykott-Kampagne (2 HP)
    { kind: 'spec' as const, baseId: 33, count: 1 }, // "Unabhängige" Untersuchung (2 HP)
  ],

  PROGRESSIVER_AKTIVISMUS: [
    // Regierungskarten (8 Karten, 56 HP)
    { kind: 'pol' as const, baseId: 8, count: 1 },   // Luiz Inácio Lula da Silva (13 HP)
    { kind: 'pol' as const, baseId: 6, count: 1 },   // Ursula von der Leyen (15 HP)
    { kind: 'pol' as const, baseId: 43, count: 1 },  // Emmanuel Macron (15 HP)
    { kind: 'pol' as const, baseId: 14, count: 1 },  // Joschka Fischer (11 HP)
    { kind: 'pol' as const, baseId: 16, count: 1 },  // Olaf Scholz (7 HP)

    // Öffentlichkeitskarten (8 Karten, 47 HP)
    { kind: 'spec' as const, baseId: 70, count: 1 },  // Greta Thunberg (4 HP)
    { kind: 'spec' as const, baseId: 73, count: 1 },  // Malala Yousafzai (4 HP)
    { kind: 'spec' as const, baseId: 65, count: 1 },  // Bill Gates (7 HP)
    { kind: 'spec' as const, baseId: 69, count: 1 },  // George Soros (7 HP)
    { kind: 'spec' as const, baseId: 74, count: 1 },  // Noam Chomsky (5 HP)
    { kind: 'spec' as const, baseId: 86, count: 1 },  // Anthony Fauci (5 HP)
    { kind: 'spec' as const, baseId: 84, count: 1 },  // Ai Weiwei (5 HP)
    { kind: 'spec' as const, baseId: 85, count: 1 },  // Alexei Navalny (5 HP)

    // Initiativen (9 Karten, 12 HP)
    { kind: 'spec' as const, baseId: 6, count: 1 },  // Verzögerungsverfahren (1 HP)
    { kind: 'spec' as const, baseId: 12, count: 1 }, // Symbolpolitik (1 HP)
    { kind: 'spec' as const, baseId: 1, count: 1 },  // Shadow Lobbying (2 HP)
    { kind: 'spec' as const, baseId: 2, count: 1 },  // Spin Doctor (2 HP)
    { kind: 'spec' as const, baseId: 8, count: 1 },  // Think-tank (2 HP)
    { kind: 'spec' as const, baseId: 10, count: 1 }, // Influencer-Kampagne (2 HP)
    { kind: 'spec' as const, baseId: 11, count: 1 }, // Systemrelevant (2 HP)
  ],

  POPULISTISCHER_OPPORTUNIST: [
    // Regierungskarten (7 Karten, 49 HP)
    { kind: 'pol' as const, baseId: 41, count: 1 },  // Donald Trump (17 HP)
    { kind: 'pol' as const, baseId: 39, count: 1 },  // Benjamin Netanyahu (15 HP)
    { kind: 'pol' as const, baseId: 13, count: 1 },  // Javier Milei (11 HP)
    { kind: 'pol' as const, baseId: 40, count: 1 },  // Dick Cheney (13 HP)

    // Öffentlichkeitskarten (8 Karten, 48 HP)
    { kind: 'spec' as const, baseId: 67, count: 1 },  // Oprah Winfrey (5 HP)
    { kind: 'spec' as const, baseId: 64, count: 1 },  // Elon Musk (8 HP)
    { kind: 'spec' as const, baseId: 71, count: 1 },  // Jack Ma (7 HP)
    { kind: 'spec' as const, baseId: 80, count: 1 },  // Zhang Yiming (6 HP)
    { kind: 'spec' as const, baseId: 78, count: 1 },  // Jeff Bezos (6 HP)
    { kind: 'spec' as const, baseId: 87, count: 1 },  // Warren Buffett (7 HP)
    { kind: 'spec' as const, baseId: 88, count: 1 },  // Gautam Adani (6 HP)
    { kind: 'spec' as const, baseId: 83, count: 1 },  // Yuval Noah Harari (5 HP)

    // Initiativen (10 Karten, 11 HP)
    { kind: 'spec' as const, baseId: 6, count: 1 },  // Verzögerungsverfahren (1 HP)
    { kind: 'spec' as const, baseId: 12, count: 1 }, // Symbolpolitik (1 HP)
    { kind: 'spec' as const, baseId: 1, count: 1 },  // Shadow Lobbying (2 HP)
    { kind: 'spec' as const, baseId: 2, count: 1 },  // Spin Doctor (2 HP)
    { kind: 'spec' as const, baseId: 8, count: 1 },  // Think-tank (2 HP)
    { kind: 'spec' as const, baseId: 10, count: 1 }, // Influencer-Kampagne (2 HP)
    { kind: 'spec' as const, baseId: 11, count: 1 }, // Systemrelevant (2 HP)
    { kind: 'spec' as const, baseId: 9, count: 1 },  // Whataboutism (2 HP)
  ]
};
