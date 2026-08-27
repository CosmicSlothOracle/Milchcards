export interface QuizQuote {
  id: string;
  cardKey: string;
  /** Original-language wording. */
  text: string;
  /** English (same as `text` when the original is English). */
  textEn: string;
  year?: number;
  context?: string;
}

function q(
  cardKey: string,
  slug: string,
  text: string,
  textEn: string,
  year?: number,
  context?: string
): QuizQuote {
  return { id: `${cardKey}-${slug}`, cardKey, text, textEn, year, context };
}

export const QUIZ_QUOTES: QuizQuote[] = [
  // ── Government ──────────────────────────────────────────────
  q('Vladimir_Putin', 'ussr', 'Распад СССР стал крупнейшей геополитической катастрофой века.', 'The collapse of the USSR was the greatest geopolitical catastrophe of the century.', 2005, 'Federal Assembly, Moscow'),
  q('Vladimir_Putin', 'heart', 'Кто не жалеет о распаде Советского Союза, у того нет сердца. А у того, кто хочет его воссоздания в прежнем виде, нет головы.', 'Whoever does not regret the collapse of the Soviet Union has no heart. Whoever wants it restored in its former shape has no head.', 2005, 'widely cited Putin remark'),
  q('Vladimir_Putin', 'first-strike', 'Если драка неизбежна — бить надо первым.', 'If a fight is inevitable, you have to strike first.', 2015, 'Valdai / public remarks'),

  q('Xi_Jinping', 'iron', '打铁还需自身硬。', 'To forge iron, one must be strong oneself.', 2012, 'first remarks as General Secretary'),
  q('Xi_Jinping', 'waters', '绿水青山就是金山银山。', 'Lucid waters and lush mountains are invaluable assets.', 2005, 'Zhejiang; later national slogan'),
  q('Xi_Jinping', 'hegemony', '中国永远不称霸、永远不搞扩张。', 'China will never seek hegemony or expansion.', 2017, '19th Party Congress'),

  q('Recep_Tayyip_Erdogan', 'unequal', 'Kadın ile erkeğin eşit olması mümkün değil.', 'It is not possible for women and men to be equal.', 2014, 'Istanbul remarks on gender'),
  q('Recep_Tayyip_Erdogan', 'democracy', 'Demokrasi trenine binip istediğimiz yere kadar gider, sonra ineriz.', 'We will board the democracy train, ride it as far as we need, then get off.', 1996, 'widely cited early remark'),
  q('Recep_Tayyip_Erdogan', 'ottoman', 'Dünya beşten büyüktür.', 'The world is bigger than five.', 2013, 'UN Security Council critique'),

  q('Justin_Trudeau', '2015', "Because it's 2015.", "Because it's 2015.", 2015, 'on a gender-balanced cabinet'),
  q('Justin_Trudeau', 'postnational', 'There is no core identity, no mainstream in Canada. There are shared values — openness, respect, compassion, willingness to work hard, to be there for each other, to search for equality and justice. Those qualities are what make us the first postnational state.', 'There is no core identity, no mainstream in Canada. ... Those qualities are what make us the first postnational state.', 2015, 'New York Times Magazine'),
  q('Justin_Trudeau', 'welcome', 'To those fleeing persecution, terror & war, Canadians will welcome you, regardless of your faith. Diversity is our strength.', 'To those fleeing persecution, terror & war, Canadians will welcome you, regardless of your faith. Diversity is our strength.', 2017, 'tweet after the U.S. travel ban'),

  q('Volodymyr_Zelenskyy', 'ammo', 'I need ammunition, not a ride.', 'I need ammunition, not a ride.', 2022, 'reply to a U.S. evacuation offer'),
  q('Volodymyr_Zelenskyy', 'europe', 'We are fighting for our land and our freedom. And now we are fighting for Europe.', 'We are fighting for our land and our freedom. And now we are fighting for Europe.', 2022, 'European Parliament'),
  q('Volodymyr_Zelenskyy', 'ukraine', 'Я тут. Ми в Києві. Ми захищаємо нашу країну.', 'I am here. We are in Kyiv. We are defending our country.', 2022, 'street video, Kyiv'),

  q('Ursula_von_der_Leyen', 'garden', 'Europe is a garden. We have built a garden. Everything works. It is the best combination of political freedom, economic prosperity and social cohesion that the humankind has been able to build. The rest of the world is not exactly a garden. Most of the rest of the world is a jungle, and the jungle could invade the garden.', 'Europe is a garden. ... Most of the rest of the world is a jungle, and the jungle could invade the garden.', 2022, 'EU ambassadors conference, Brussels'),
  q('Ursula_von_der_Leyen', 'army', 'Europa braucht eine gemeinsame Armee.', 'Europe needs a common army.', 2015, 'CDU remarks as German defence minister'),
  q('Ursula_von_der_Leyen', 'green', 'This is Europe\'s man on the moon moment.', "This is Europe's man on the moon moment.", 2019, 'European Green Deal speech'),

  q('Narendra_Modi', 'min-gov', 'Minimum government, maximum governance.', 'Minimum government, maximum governance.', 2014, 'campaign / early PM slogan'),
  q('Narendra_Modi', 'make', 'Make in India.', 'Make in India.', 2014, 'industrial policy slogan'),
  q('Narendra_Modi', 'hindu', 'मैं हिंदू राष्ट्रवादी हूं, तो इसमें गलत क्या है?', 'I am a Hindu nationalist — what is wrong with that?', 2013, 'interview, Reuters / campaign trail'),

  q('Luiz_Inacio_Lula', 'hope', 'A esperança venceu o medo.', 'Hope defeated fear.', 2002, 'election night'),
  q('Luiz_Inacio_Lula', 'gardener', 'Um metalúrgico, filho de analfabetos, pode ser presidente deste país.', 'A metalworker, son of illiterate parents, can be president of this country.', 2002, 'campaign'),
  q('Luiz_Inacio_Lula', 'eat', 'O povo pobre tem que comer pelo menos três vezes ao dia.', 'Poor people have to eat at least three times a day.', 2003, 'Fome Zero / early presidency'),

  q('Sergey_Lavrov', 'sorry', 'Мы никому ничего не должны объяснять и тем более извиняться.', 'We do not owe anyone explanations, still less apologies.', 2014, 'Crimea-period remarks'),
  q('Sergey_Lavrov', 'lecture', 'Нас не надо учить демократии.', 'Do not lecture us about democracy.', 2012, 'recurring Lavrov line'),
  q('Sergey_Lavrov', 'attack', 'Россия ни на кого не собиралась нападать.', 'Russia was not going to attack anyone.', 2022, 'early-war briefings'),

  q('Wolfgang_Schaeuble', 'live', 'Man kann nicht auf Dauer über seine Verhältnisse leben.', 'You cannot live beyond your means forever.', 2010, 'eurozone / Greece crisis'),
  q('Wolfgang_Schaeuble', 'greece', 'Griechenland muss sparen — das ist keine Strafe, das ist Physik.', 'Greece must save — that is not punishment, that is physics.', 2012, 'eurocrisis interviews'),
  q('Wolfgang_Schaeuble', 'rules', 'Verträge müssen eingehalten werden. Pacta sunt servanda.', 'Treaties must be kept. Pacta sunt servanda.', 2015, 'eurogroup / Bundestag'),

  q('Jens_Stoltenberg', 'alliance', 'NATO is the strongest and most successful alliance in history.', 'NATO is the strongest and most successful alliance in history.', 2014, 'early Secretary General remarks'),
  q('Jens_Stoltenberg', 'price', 'The price of freedom is high, but the price of occupation is higher.', 'The price of freedom is high, but the price of occupation is higher.', 2022, 'after Russia\'s invasion of Ukraine'),
  q('Jens_Stoltenberg', 'weapons', 'Weapons are not a path away from peace. Weapons are a path to peace, because they enable Ukraine to defend itself.', 'Weapons are not a path away from peace. Weapons are a path to peace, because they enable Ukraine to defend itself.', 2023, 'NATO press conference'),

  q('Helmut_Schmidt', 'visions', 'Wer Visionen hat, sollte zum Arzt gehen.', 'Anyone who has visions should go to the doctor.', 1980, 'widely cited Schmidt line, Bonn'),
  q('Helmut_Schmidt', 'duty', 'In der Demokratie haben die Bürger die Regierung, die sie verdienen.', 'In a democracy, citizens have the government they deserve.', 1977, 'recurring Schmidt remark'),
  q('Helmut_Schmidt', 'duty2', 'Wir können uns Moral nicht leisten, wenn wir Verantwortung meinen.', 'We cannot afford morality when what we mean is responsibility.', 1977, 'German Autumn / state crisis interviews'),

  q('Javier_Milei', 'libertad', '¡Viva la libertad, carajo!', 'Long live freedom, damn it!', 2023, 'campaign rallying cry'),
  q('Javier_Milei', 'thief', 'El Estado es un ladrón. Es una organización criminal.', 'The state is a thief. It is a criminal organization.', 2023, 'campaign interviews'),
  q('Javier_Milei', 'plata', 'No hay plata.', 'There is no money.', 2023, 'austerity slogan after inauguration'),

  q('Joschka_Fischer', 'asshole', 'Mit Verlaub, Herr Präsident, Sie sind ein Arschloch.', 'With all due respect, Mr President, you are an asshole.', 1984, 'Bundestag, to Richard Stücklen'),
  q('Joschka_Fischer', 'auschwitz', 'Ich habe nicht nur gelernt, ich habe begriffen: Nie wieder Krieg. Nie wieder Auschwitz. Nie wieder Völkermord. Nie wieder Faschismus.', 'I did not only learn it, I understood it: never again war. Never again Auschwitz. Never again genocide. Never again fascism.', 1999, 'Greens debate on Kosovo'),
  q('Joschka_Fischer', 'power', 'Deutschland ist nicht mehr das Land der Dichter und Denker allein — wir müssen Macht auch ausüben können.', 'Germany is no longer only the land of poets and thinkers — we must also be able to exercise power.', 1999, 'Foreign Minister years'),

  q('Kamala_Harris', 'first', 'I may be the first woman in this office. I will not be the last.', 'I may be the first woman in this office. I will not be the last.', 2021, 'inauguration'),
  q('Kamala_Harris', 'coconut', "You think you just fell out of a coconut tree?", "You think you just fell out of a coconut tree?", 2023, 'White House remarks'),
  q('Kamala_Harris', 'unburdened', 'What can be, unburdened by what has been.', 'What can be, unburdened by what has been.', 2024, 'campaign refrain'),

  q('Olaf_Scholz', 'zeitenwende', 'Wir erleben eine Zeitenwende. Und das bedeutet: Die Welt danach ist nicht mehr dieselbe wie die Welt davor.', 'We are living through a historic turning point. And that means: the world afterwards is no longer the same as the world before.', 2022, 'Bundestag, 27 February'),
  q('Olaf_Scholz', 'wumms', 'Und deshalb jetzt dieser doppelte Wumms.', 'And that is why we now have this double wallop.', 2022, 'relief package press conference'),
  q('Olaf_Scholz', 'memory', 'Das ist nicht meine Erinnerung.', 'That is not my recollection.', 2022, 'Cum-ex / Warburg hearing'),

  q('Rishi_Sunak', 'boats', 'We will stop the boats.', 'We will stop the boats.', 2023, 'Downing Street five pledges'),
  q('Rishi_Sunak', 'plan', "I'm not going to leave the British people without a plan.", "I'm not going to leave the British people without a plan.", 2022, 'leadership campaign'),
  q('Rishi_Sunak', 'brexit', 'We will make Brexit work.', 'We will make Brexit work.', 2022, 'early premiership'),

  q('Pedro_Sanchez', 'feminist', 'España será feminista o no será.', 'Spain will be feminist, or it will not be.', 2018, 'early premiership'),
  q('Pedro_Sanchez', 'no', 'No es no.', 'No means no.', 2018, 'PSOE leadership fight / consent politics'),
  q('Pedro_Sanchez', 'hours', 'Hay que echarle más horas al día.', 'We have to put more hours into the day.', 2021, 'on workload / governing'),

  q('Keir_Starmer', 'toolmaker', 'My father was a toolmaker. My mother was a nurse.', 'My father was a toolmaker. My mother was a nurse.', 2023, 'conference biographical line'),
  q('Keir_Starmer', 'country', 'I love this country.', 'I love this country.', 2023, 'Labour conference'),
  q('Keir_Starmer', 'change', 'Country first, party second.', 'Country first, party second.', 2024, 'election campaign'),

  q('Robert_Gates', 'nato', 'The blunt reality is that there will be dwindling appetite and patience in the U.S. Congress — and in the American body politic generally — to expend increasingly precious funds on behalf of nations that are apparently unwilling to devote the necessary resources to be serious and capable partners in their own defense.', 'The blunt reality is that there will be dwindling appetite ... to expend increasingly precious funds on behalf of nations that are apparently unwilling to devote the necessary resources...', 2011, 'farewell NATO speech, Brussels'),
  q('Robert_Gates', 'iraq', 'Any future defense secretary who advises the president to again send a big American land army into Asia or into the Middle East or Africa should have his head examined.', 'Any future defense secretary who advises the president to again send a big American land army into Asia or into the Middle East or Africa should have his head examined.', 2011, 'West Point'),
  q('Robert_Gates', 'truth', 'The toughest thing in Washington is telling the truth.', 'The toughest thing in Washington is telling the truth.', 2014, 'Duty memoir tour'),

  q('Karl_Rove', 'reality', "We're an empire now, and when we act, we create our own reality.", "We're an empire now, and when we act, we create our own reality.", 2004, 'quoted by Ron Suskind as a senior Bush aide, widely identified as Rove'),
  q('Karl_Rove', 'math', "As people do the math, they are going to come to the conclusion that this doesn't add up.", "As people do the math, they are going to come to the conclusion that this doesn't add up.", 2012, 'Fox News on election night'),
  q('Karl_Rove', 'base', 'We have a dual strategy: energize the base and add to it.', 'We have a dual strategy: energize the base and add to it.', 2004, 'campaign interviews'),

  q('Shigeru_Ishiba', 'nato-asia', 'アジア版NATOが必要だ。', 'Asia needs its own version of NATO.', 2024, 'long-standing Ishiba proposal'),
  q('Shigeru_Ishiba', 'alliance', '日米同盟は日本外交の基軸である。', 'The U.S.–Japan alliance is the cornerstone of Japanese diplomacy.', 2014, 'LDP defence remarks'),
  q('Shigeru_Ishiba', 'defend', '自分の国は自分で守る気概がなければ、同盟も機能しない。', 'If we lack the will to defend our own country, the alliance will not function either.', 2013, 'defence-policy interviews'),

  q('Heidemarie_Wieczorek_Zeul', 'genocide', 'Die damaligen Gräueltaten waren das, was man heute Völkermord nennen würde.', 'The atrocities of that time were what we would call genocide today.', 2004, 'Namibia, Herero and Nama apology'),
  q('Heidemarie_Wieczorek_Zeul', 'alms', 'Entwicklungspolitik ist keine Almosenpolitik.', 'Development policy is not a policy of alms.', 2005, 'BMZ'),
  q('Heidemarie_Wieczorek_Zeul', 'peace', 'Armutsbekämpfung ist Friedenspolitik.', 'Fighting poverty is peace policy.', 2004, 'development-policy speeches'),

  q('Renate_Kuenast', 'ravioli', 'Wir brauchen weniger Dosenravioli und mehr Qualität auf dem Teller.', 'We need less canned ravioli and more quality on the plate.', 2001, 'as consumer-protection / agriculture minister'),
  q('Renate_Kuenast', 'agrar', 'Agrarwende heißt: Klasse statt Masse.', 'The agricultural turnaround means quality instead of quantity.', 2001, 'green agricultural policy'),
  q('Renate_Kuenast', 'future', 'Die Grünen sind die Partei, die Zukunft buchstabieren kann.', 'The Greens are the party that can spell the word future.', 2002, 'campaign'),

  q('Rudolf_Scharping', 'peace', 'Wir führen keinen Krieg, wir erzwingen den Frieden.', 'We are not waging war, we are enforcing peace.', 1999, 'Kosovo as defence minister'),
  q('Rudolf_Scharping', 'responsibility', 'Deutschland muss mehr Verantwortung übernehmen.', 'Germany must take on more responsibility.', 1999, 'NATO campaign'),
  q('Rudolf_Scharping', 'troops', 'Ich habe die Soldaten nicht belogen.', 'I did not lie to the soldiers.', 2001, 'defence-ministry controversies'),

  q('John_Ashcroft', 'liberty', 'To those who scare peace-loving people with phantoms of lost liberty, my message is this: Your tactics only aid terrorists, for they erode our national unity and diminish our resolve.', 'To those who scare peace-loving people with phantoms of lost liberty, my message is this: Your tactics only aid terrorists...', 2001, 'Senate testimony after 9/11'),
  q('John_Ashcroft', 'suicide', 'The Constitution is not a suicide pact.', 'The Constitution is not a suicide pact.', 2002, 'Justice Department / PATRIOT Act period'),
  q('John_Ashcroft', 'islam', 'Islam is a religion in which God requires you to send your son to die for him. Christianity is a faith in which God sends his son to die for you.', 'Islam is a religion in which God requires you to send your son to die for him. Christianity is a faith in which God sends his son to die for you.', 2002, 'controversial unguarded remark'),

  q('Tedros_Adhanom_Ghebreyesus', 'china', 'China is actually setting a new standard for outbreak response.', 'China is actually setting a new standard for outbreak response.', 2020, 'January 2020 WHO remarks'),
  q('Tedros_Adhanom_Ghebreyesus', 'politics', "I don't think it's right to politicize COVID.", "I don't think it's right to politicize COVID.", 2020, 'WHO briefings'),
  q('Tedros_Adhanom_Ghebreyesus', 'threat', 'The greatest threat we face now is not the virus itself. It\'s the lack of leadership and solidarity.', "The greatest threat we face now is not the virus itself. It's the lack of leadership and solidarity.", 2020, 'World Health Assembly'),

  q('Tom_Ridge', 'orange', 'We have raised the threat level to orange.', 'We have raised the threat level to orange.', 2003, 'Homeland Security colour-code alerts'),
  q('Tom_Ridge', 'terror', 'Terrorism is a clear and present danger to the American people.', 'Terrorism is a clear and present danger to the American people.', 2003, 'DHS briefings'),
  q('Tom_Ridge', 'ready', 'We must be ready, we must be resolved, and we must be united.', 'We must be ready, we must be resolved, and we must be united.', 2002, 'early DHS'),

  q('Henry_Paulson', 'monday', "If we don't do this, we may not have an economy on Monday.", "If we don't do this, we may not have an economy on Monday.", 2008, 'TARP / crisis weekend'),
  q('Henry_Paulson', 'tbtf', 'Some institutions are too big to fail.', 'Some institutions are too big to fail.', 2008, 'financial-crisis testimony'),
  q('Henry_Paulson', 'taxpayer', 'We must protect the taxpayer as we stabilize the system.', 'We must protect the taxpayer as we stabilize the system.', 2008, 'Congress'),

  q('Horst_köhler', 'trade', 'Ein Land unserer Größe und mit dieser Außenhandelsabhängigkeit muss wissen, dass im Zweifel, im Notfall auch militärischer Einsatz notwendig ist, um unsere Interessen zu wahren, zum Beispiel um Handelswege frei zu halten.', 'A country of our size and with this dependence on foreign trade must know that in an emergency military deployment may also be necessary to protect our interests, for example to keep trade routes open.', 2010, 'Deutschlandradio interview — the remark that triggered his resignation'),
  q('Horst_köhler', 'africa', 'Afrika braucht keine Almosen, Afrika braucht Chancen.', 'Africa does not need alms, Africa needs opportunities.', 2005, 'as IMF / later as President'),
  q('Horst_köhler', 'unify', 'Zusammenhalt ist keine Selbstverständlichkeit.', 'Cohesion is not something we can take for granted.', 2009, 'Berlin addresses'),

  q('Johannes_Rau', 'reconcile', 'Versöhnen statt spalten.', 'Reconcile rather than divide.', 1999, 'presidential motto'),
  q('Johannes_Rau', 'argue', 'Wir müssen uns streiten dürfen, ohne uns zu spalten.', 'We must be allowed to argue without splitting apart.', 2000, 'Berlin'),
  q('Johannes_Rau', 'christian', 'Unser Land ist vom Christentum geprägt — und es ist ein Land der Vielfalt.', 'Our country is shaped by Christianity — and it is a country of diversity.', 2000, 'Berlin speech on identity'),

  q('John_Snow', 'strong', 'The economy is strong and getting stronger.', 'The economy is strong and getting stronger.', 2006, 'Treasury briefings'),
  q('John_Snow', 'tax', 'Tax relief is working. It is doing what it was intended to do.', 'Tax relief is working. It is doing what it was intended to do.', 2004, 'Bush tax-cut defence'),
  q('John_Snow', 'deficit', 'The deficit is on a downward path.', 'The deficit is on a downward path.', 2006, 'Treasury'),

  q('Karl_Carstens', 'walk', 'Ich will das Land zu Fuß kennenlernen.', 'I want to get to know the country on foot.', 1979, 'his long-distance walks as President'),
  q('Karl_Carstens', 'freedom', 'Freiheit stirbt millimeterweise, wenn man sie nicht verteidigt.', 'Freedom dies millimetre by millimetre if it is not defended.', 1980, 'Bonn addresses'),
  q('Karl_Carstens', 'centre', 'Politik braucht die Mitte.', 'Politics needs the centre.', 1979, 'as Bundespräsident'),

  q('Hans_Eichel', 'zero', 'Die Null im Bundeshaushalt ist machbar.', 'A balanced federal budget is achievable.', 2000, 'as Finance Minister'),
  q('Hans_Eichel', 'save', 'Sparen ist nicht populär, aber es ist notwendig.', 'Saving is not popular, but it is necessary.', 2003, 'Hartz / budget years'),
  q('Hans_Eichel', 'stability', 'Stabilität ist keine Strafe, Stabilität ist die Voraussetzung für Wachstum.', 'Stability is not a punishment, stability is the precondition for growth.', 2002, 'euro stability-pact debates'),

  q('Walter_Scheel', 'ostpolitik', 'Ohne die neue Ostpolitik gibt es keine Entspannung in Europa.', 'Without the new Ostpolitik there is no détente in Europe.', 1970, 'as Foreign Minister'),
  q('Walter_Scheel', 'weimar', 'Bonn ist nicht Weimar — und darf es nie werden.', 'Bonn is not Weimar — and must never become it.', 1974, 'as President'),
  q('Walter_Scheel', 'sing', 'Man darf in diesem Amt auch einmal singen.', 'In this office one may also sing now and then.', 1974, 'on his public singing, including "Hoch soll er leben"'),

  q('Werner_Maihofer', 'wehrhaft', 'Der Rechtsstaat muss wehrhaft sein, oder er hört auf, Rechtsstaat zu sein.', 'The constitutional state must be capable of defending itself, or it ceases to be a constitutional state.', 1974, 'Interior Minister, Radikalenerlass era'),
  q('Werner_Maihofer', 'responsibility', 'Ich übernehme die politische Verantwortung.', 'I accept political responsibility.', 1978, 'resignation after the Traube bugging affair'),
  q('Werner_Maihofer', 'liberty', 'Freiheit und Sicherheit sind keine Gegensätze, aber sie stehen in Spannung.', 'Freedom and security are not opposites, but they are in tension.', 1976, 'Interior Ministry'),

  q('Andrzej_Duda', 'lgbt', 'LGBT is not people. It is an ideology.', 'LGBT is not people. It is an ideology.', 2020, 'presidential campaign, Poland'),
  q('Andrzej_Duda', 'heart', 'Polska jest sercem Europy.', 'Poland is the heart of Europe.', 2015, 'Warsaw'),
  q('Andrzej_Duda', 'eu', 'Europa potrzebuje Polski, a Polska potrzebuje Europy — ale na naszych warunkach.', 'Europe needs Poland, and Poland needs Europe — but on our terms.', 2016, 'EU debates'),

  q('Anthony_Albanese', 'held', 'No one held back, and no one left behind.', 'No one held back, and no one left behind.', 2022, 'election night'),
  q('Anthony_Albanese', 'ukraine', 'Australia stands with Ukraine.', 'Australia stands with Ukraine.', 2022, 'Canberra'),
  q('Anthony_Albanese', 'voice', 'This is a modest request, and it is a gracious request.', 'This is a modest request, and it is a gracious request.', 2023, 'Voice to Parliament referendum'),

  q('Benjamin_Netanyahu', 'democracy', 'Israel is the one and only Jewish state, and it will be the one and only Jewish state.', 'Israel is the one and only Jewish state, and it will be the one and only Jewish state.', 2015, 'Jerusalem / UN circuit'),
  q('Benjamin_Netanyahu', 'bomb', 'This is a bomb. This is a fuse. And this is what happens if you don\'t stop Iran.', "This is a bomb. This is a fuse. And this is what happens if you don't stop Iran.", 2012, 'UN General Assembly cartoon-bomb speech'),
  q('Benjamin_Netanyahu', 'hamas', 'Hamas is ISIS, and ISIS is Hamas.', 'Hamas is ISIS, and ISIS is Hamas.', 2023, 'after October 7'),

  q('Dick_Cheney', 'dark', "We also have to work, though, sort of the dark side, if you will. We've got to spend time in the shadows in the intelligence world.", "We also have to work, though, sort of the dark side, if you will. We've got to spend time in the shadows in the intelligence world.", 2001, 'Meet the Press, 16 September'),
  q('Dick_Cheney', 'deficits', 'Reagan proved deficits don\'t matter.', "Reagan proved deficits don't matter.", 2002, 'quoted by Treasury Secretary Paul O\'Neill'),
  q('Dick_Cheney', 'one-percent', "If there's a one percent chance that Pakistani scientists are helping al-Qaeda build or develop a nuclear weapon, we have to treat it as a certainty in terms of our response.", "If there's a one percent chance ... we have to treat it as a certainty in terms of our response.", 2001, 'the "one percent doctrine"'),

  q('Donald_Trump', 'pussy', "And when you're a star, they let you do it. You can do anything. Grab 'em by the pussy. You can do anything.", "And when you're a star, they let you do it. You can do anything. Grab 'em by the pussy. You can do anything.", 2005, 'Access Hollywood tape'),
  q('Donald_Trump', 'fifth', "I could stand in the middle of Fifth Avenue and shoot somebody, and I wouldn't lose any voters.", "I could stand in the middle of Fifth Avenue and shoot somebody, and I wouldn't lose any voters.", 2016, 'Sioux Center, Iowa'),
  q('Donald_Trump', 'rapists', "They're bringing drugs. They're bringing crime. They're rapists. And some, I assume, are good people.", "They're bringing drugs. They're bringing crime. They're rapists. And some, I assume, are good people.", 2015, 'campaign launch, Trump Tower'),

  q('Ebrahim_Raisi', 'west', 'غرب دشمن ملت‌های مستقل است.', 'The West is the enemy of independent nations.', 2021, 'Tehran, early presidency'),
  q('Ebrahim_Raisi', 'rights', 'حقوق بشر ابزار فشار سیاسی غرب است.', 'Human rights are a Western tool of political pressure.', 2021, 'UN / Tehran remarks'),
  q('Ebrahim_Raisi', 'israel', 'رژیم صهیونیستی یک غده سرطانی است.', 'The Zionist regime is a cancerous tumour.', 2022, 'standard hardline formulation he repeated in office'),

  q('Emmanuel_Macron', 'street', "Il y a beaucoup de gens qui n'ont qu'à traverser la rue pour trouver du travail.", 'There are a lot of people who only have to cross the street to find a job.', 2018, 'unscripted remark, Paris'),
  q('Emmanuel_Macron', 'garden', "Il n'y a pas une culture française, il y a une culture en France et elle est diverse.", 'There is not one French culture; there is culture in France, and it is diverse.', 2017, 'campaign'),
  q('Emmanuel_Macron', 'jupiter', "Je suis un président jupitérien.", 'I am a Jupiterian president.', 2017, 'early Élysée self-description'),

  q('Giorgia_Meloni', 'giorgia', 'Io sono Giorgia. Sono una donna, sono una madre, sono italiana, sono cristiana. E non me lo toglierete!', 'I am Giorgia. I am a woman, I am a mother, I am Italian, I am a Christian. And you will not take that away from me!', 2019, 'rally speech that became a meme'),
  q('Giorgia_Meloni', 'first', "L'Italia prima di tutto.", 'Italy first of all.', 2022, 'campaign'),
  q('Giorgia_Meloni', 'replace', 'Ci vogliono sostituire.', 'They want to replace us.', 2022, 'campaign rhetoric on migration / identity'),

  q('King_Charles_III', 'politician', 'I am not a politician.', 'I am not a politician.', 2022, 'accession-period remarks'),
  q('King_Charles_III', 'harmony', 'I have always believed that harmony with nature is not a luxury but a necessity.', 'I have always believed that harmony with nature is not a luxury but a necessity.', 2020, 'environmental speeches as Prince of Wales'),
  q('King_Charles_III', 'monstrous', 'A monstrous carbuncle on the face of a much-loved and elegant friend.', 'A monstrous carbuncle on the face of a much-loved and elegant friend.', 1984, 'on the proposed National Gallery extension'),

  q('Mohammed_bin_Salman', 'thirty', "We will not waste 30 years of our lives dealing with extremist ideas. We will destroy them now and immediately.", "We will not waste 30 years of our lives dealing with extremist ideas. We will destroy them now and immediately.", 2017, 'interview on Vision 2030 / religious police'),
  q('Mohammed_bin_Salman', 'normal', 'We want to live a normal life.', 'We want to live a normal life.', 2018, '60 Minutes / Davos circuit'),
  q('Mohammed_bin_Salman', 'vision', 'Saudi Arabia will be the new Europe in the Middle East.', 'Saudi Arabia will be the new Europe in the Middle East.', 2018, 'Vision 2030 interviews'),

  q('Alberto_Gonzales', 'quaint', "In my judgment, this new paradigm renders obsolete Geneva's strict limitations on questioning of enemy prisoners and renders quaint some of its provisions.", "In my judgment, this new paradigm renders obsolete Geneva's strict limitations on questioning of enemy prisoners and renders quaint some of its provisions.", 2002, 'White House counsel memo on the Geneva Conventions'),
  q('Alberto_Gonzales', 'torture', 'This administration does not torture.', 'This administration does not torture.', 2005, 'confirmation / AG period'),
  q('Alberto_Gonzales', 'memory', 'I have no recollection of that.', 'I have no recollection of that.', 2007, 'U.S. attorney firings hearings'),

  q('Annette_Schavan', 'plagiarism', 'Ich habe wissenschaftlich gearbeitet und nicht abgeschrieben.', 'I did scholarly work; I did not copy.', 2013, 'after her doctorate was revoked'),
  q('Annette_Schavan', 'pisa', 'PISA ist ein Weckruf, kein Todesurteil.', 'PISA is a wake-up call, not a death sentence.', 2006, 'as Education Minister'),
  q('Annette_Schavan', 'bildung', 'Bildung ist Bürgerrecht.', 'Education is a civil right.', 2008, 'KMK / federal education debates'),

  q('Edelgard_Bulmahn', 'elite', 'Deutschland braucht Eliteuniversitäten — und zwar ohne Angst vor dem Wort Elite.', 'Germany needs elite universities — without being afraid of the word elite.', 2004, 'Excellence Initiative'),
  q('Edelgard_Bulmahn', 'raw', 'Bildung ist der Rohstoff unseres Landes.', 'Education is the raw material of our country.', 2002, 'as Research / Education Minister'),
  q('Edelgard_Bulmahn', 'bologna', 'Der Bologna-Prozess ist keine Bedrohung, er ist eine Chance.', 'The Bologna Process is not a threat, it is an opportunity.', 2003, 'higher-education reform'),

  q('Erhard_Eppler', 'peace', 'Entwicklungspolitik ist Friedenspolitik.', 'Development policy is peace policy.', 1974, 'BMZ'),
  q('Erhard_Eppler', 'growth', 'Die Grenzen des Wachstums sind auch Grenzen der Politik.', 'The limits to growth are also limits of politics.', 1973, 'Club of Rome debate in the SPD'),
  q('Erhard_Eppler', 'north', 'Der Nord-Süd-Konflikt ist der soziale Konflikt der Weltgesellschaft.', 'The North–South conflict is the social conflict of world society.', 1977, 'development-policy writing'),

  q('Franz_Josef_Jung', 'civilians', 'Nach allem, was ich weiß, sind keine Zivilisten zu Schaden gekommen.', 'According to everything I know, no civilians were harmed.', 2009, 'Kunduz airstrike — a claim later shown to be false'),
  q('Franz_Josef_Jung', 'success', 'Der Einsatz in Afghanistan ist notwendig und er ist erfolgreich.', 'The Afghanistan mission is necessary and it is successful.', 2008, 'as Defence Minister'),
  q('Franz_Josef_Jung', 'bundeswehr', 'Die Bundeswehr verdient Rückhalt, nicht Häme.', 'The Bundeswehr deserves backing, not scorn.', 2007, 'Bundestag'),

  q('Friedrich_Merz', 'paschas', 'Das sind dann kleine Paschas.', 'Those are then little pashas.', 2023, 'on schoolboys with a migration background, ZDF'),
  q('Friedrich_Merz', 'sozialtourismus', 'Wir müssen den Sozialtourismus der Ukrainer begrenzen.', 'We have to limit social-benefits tourism by Ukrainians.', 2022, 'CDU remarks — later walked back'),
  q('Friedrich_Merz', 'blackrock', 'Ich war bei BlackRock, ja. Das ist kein Geheimnis und kein Makel.', 'I was at BlackRock, yes. That is not a secret and not a stain.', 2021, 'leadership interviews'),

  q('Georg_Leber', 'uniform', 'Die Bundeswehr ist eine Armee von Bürgern in Uniform.', 'The Bundeswehr is an army of citizens in uniform.', 1972, 'Innere Führung'),
  q('Georg_Leber', 'protect', 'Unmoralisch ist nicht das Militär, unmoralisch ist ein Staat, der seine Bürger nicht schützen kann.', 'It is not the military that is immoral; it is a state that cannot protect its citizens.', 1973, 'as Defence Minister'),
  q('Georg_Leber', 'nato', 'Ohne die NATO gibt es keine Sicherheit für dieses Land.', 'Without NATO there is no security for this country.', 1975, 'Bonn'),

  q('Gerhart_Baum', 'citizen', 'Der Staat ist für den Bürger da, nicht der Bürger für den Staat.', 'The state exists for the citizen, not the citizen for the state.', 1978, 'FDP Interior Minister'),
  q('Gerhart_Baum', 'surveil', 'Ein Überwachungsstaat ist das Gegenteil von innerer Sicherheit.', 'A surveillance state is the opposite of internal security.', 1979, 'civil-liberties fights after the German Autumn'),
  q('Gerhart_Baum', 'rights', 'Bürgerrechte sind unveräußerlich — auch in der Krise.', 'Civil rights are inalienable — even in a crisis.', 1978, 'Interior Ministry'),

  q('Hans_Apel', 'nato', 'Die NATO ist unser Schicksal, nicht unser Problem.', 'NATO is our fate, not our problem.', 1978, 'as Defence Minister, double-track debate'),
  q('Hans_Apel', 'budget', 'Man kann nicht mehr ausgeben, als man einnimmt. Auch der Bund nicht.', 'You cannot spend more than you take in. Not even the federal government.', 1975, 'as Finance Minister'),
  q('Hans_Apel', 'deterrence', 'Abschreckung ist unbequem. Frieden ohne sie ist Illusion.', 'Deterrence is uncomfortable. Peace without it is an illusion.', 1980, 'NATO'),

  q('Hans_Dietrich_Genscher', 'prague', 'Wir sind zu Ihnen gekommen, um Ihnen mitzuteilen, dass heute Ihre Ausreise möglich geworden ist.', 'We have come to tell you that your departure has become possible today.', 1989, 'West German embassy balcony, Prague'),
  q('Hans_Dietrich_Genscher', 'unity', 'Ziel unserer Politik ist es, die deutsche Teilung zu überwinden.', 'The goal of our policy is to overcome the division of Germany.', 1987, 'Ostpolitik continuity'),
  q('Hans_Dietrich_Genscher', 'neighbours', 'Wir wollen ein Volk der guten Nachbarn sein und werden, innen und außen.', 'We want to be a people of good neighbours, at home and abroad.', 1974, 'liberal foreign-policy line (with Heinemann)'),

  q('Otto_Schily', 'security', 'Die Sicherheit der Bürger hat Vorrang.', 'The security of citizens takes priority.', 2001, 'after 9/11, as Interior Minister'),
  q('Otto_Schily', 'rechtsstaat', 'Wer den Rechtsstaat will, muss ihn auch schützen können.', 'Anyone who wants the rule of law must also be able to protect it.', 2002, 'security-package debates'),
  q('Otto_Schily', 'raf', 'Ich habe Terroristen verteidigt. Das heißt nicht, dass ich den Terror verteidigt habe.', 'I defended terrorists. That does not mean I defended terror.', 2001, 'on his past as RAF defence lawyer'),

  q('Peter_Struck', 'hindu', 'Deutschland wird auch am Hindukusch verteidigt.', 'Germany is also being defended at the Hindu Kush.', 2002, 'Bundestag, December'),
  q('Peter_Struck', 'bundeswehr', 'Die Bundeswehr ist eine Armee im Einsatz, nicht im Manöver.', 'The Bundeswehr is an army on operations, not on manoeuvres.', 2003, 'as Defence Minister'),
  q('Peter_Struck', 'alliance', 'Bündnissolidarität ist kein Menü, aus dem man sich die Gänge heraussucht.', 'Alliance solidarity is not a menu from which you pick the courses you like.', 2003, 'NATO / Iraq-period Bundestag'),

  q('Rainer_Offergeld', 'invest', 'Entwicklungshilfe ist keine Wohltätigkeit, sie ist eine Investition in unsere gemeinsame Zukunft.', 'Development aid is not charity, it is an investment in our shared future.', 1980, 'BMZ'),
  q('Rainer_Offergeld', 'north-south', 'Der Nord-Süd-Dialog ist keine Konferenzlyrik, er ist Überlebenspolitik.', 'The North–South dialogue is not conference poetry, it is survival politics.', 1981, 'as Development Minister'),
  q('Rainer_Offergeld', 'raw2', 'Rohstoffe, Märkte und Frieden hängen zusammen. Wer das leugnet, betreibt Provinzpolitik.', 'Raw materials, markets and peace are connected. Anyone who denies that is doing parish-pump politics.', 1982, 'SPD development debates'),

  q('Colin_Powell', 'un', 'Saddam Hussein has biological weapons and the capability to produce more, many more.', 'Saddam Hussein has biological weapons and the capability to produce more, many more.', 2003, 'UN Security Council, 5 February'),
  q('Colin_Powell', 'fooled', 'There were some people in the intelligence community who knew at that time that some of these sources were not good, and shouldn\'t be relied upon, and they didn\'t speak up. That devastated me.', "There were some people in the intelligence community who knew at that time that some of these sources were not good ... and they didn't speak up. That devastated me.", 2005, 'later interviews on the WMD case'),
  q('Colin_Powell', 'pottery', "You break it, you own it.", "You break it, you own it.", 2002, 'the "Pottery Barn rule", quoted before Iraq'),

  q('Condoleezza_Rice', 'mushroom', "We don't want the smoking gun to be a mushroom cloud.", "We don't want the smoking gun to be a mushroom cloud.", 2002, 'CNN, 8 September'),
  q('Condoleezza_Rice', 'predict', "I don't think anybody could have predicted that they would try to use an airplane as a missile, a hijacked airplane as a missile.", "I don't think anybody could have predicted that they would try to use an airplane as a missile, a hijacked airplane as a missile.", 2002, 'May 2002 — later heavily contested'),
  q('Condoleezza_Rice', 'weapons', "We don't know where they are. We don't know what happened to them.", "We don't know where they are. We don't know what happened to them.", 2004, 'on missing WMD stockpiles'),

  q('Donald_Rumsfeld', 'unknowns', 'Reports that say that something hasn\'t happened are always interesting to me, because as we know, there are known knowns; there are things we know we know. We also know there are known unknowns; that is to say we know there are some things we do not know. But there are also unknown unknowns — the ones we don\'t know we don\'t know.', "Reports that say that something hasn't happened are always interesting to me, because as we know, there are known knowns ... there are also unknown unknowns — the ones we don't know we don't know.", 2002, 'DoD press briefing, 12 February'),
  q('Donald_Rumsfeld', 'army', 'You go to war with the army you have, not the army you might want or wish to have at a later time.', 'You go to war with the army you have, not the army you might want or wish to have at a later time.', 2004, 'town hall with troops in Kuwait'),
  q('Donald_Rumsfeld', 'stuff', 'Stuff happens.', 'Stuff happens.', 2003, 'on the looting of Baghdad'),

  q('Christine_Lagarde', 'taxes', "As far as Athens is concerned, I also think about all those people who are trying to escape tax all the time. I think they should also help themselves collectively.", "As far as Athens is concerned, I also think about all those people who are trying to escape tax all the time. I think they should also help themselves collectively.", 2012, 'Guardian interview during the Greek crisis'),
  q('Christine_Lagarde', 'spreads', 'We are not here to close spreads. We are here to preserve the transmission of monetary policy.', 'We are not here to close spreads. We are here to preserve the transmission of monetary policy.', 2019, 'early ECB presidency'),
  q('Christine_Lagarde', 'women', 'If Lehman Brothers had been Lehman Sisters, today\'s economic crisis would look quite different.', "If Lehman Brothers had been Lehman Sisters, today's economic crisis would look quite different.", 2010, 'as French finance minister / IMF circuit'),

  // ── Öffentlichkeit ──────────────────────────────────────────
  q('Elon_Musk', 'funding', 'Am considering taking Tesla private at $420. Funding secured.', 'Am considering taking Tesla private at $420. Funding secured.', 2018, 'tweet, 7 August — SEC case'),
  q('Elon_Musk', 'pedo', 'You don\'t think it\'s strange he hasn\'t SEEN the cave? ... Sorry pedo guy, you really did ask for it.', "You don't think it's strange he hasn't SEEN the cave? ... Sorry pedo guy, you really did ask for it.", 2018, 'Thai cave rescue feud with Vernon Unsworth'),
  q('Elon_Musk', 'mars', 'I want to die on Mars. Just not on impact.', 'I want to die on Mars. Just not on impact.', 2013, 'interview circuit / South by Southwest'),

  q('Bill_Gates', 'vaccine', "The world didn't spend anything like what was needed to be ready for a pandemic. ... We need to spend billions to prevent trillions in damage.", "The world didn't spend anything like what was needed to be ready for a pandemic. ... We need to spend billions to prevent trillions in damage.", 2020, 'TED / pandemic preparedness'),
  q('Bill_Gates', 'polio', 'We cannot end polio without ending the conspiracy theories that surround the vaccine.', 'We cannot end polio without ending the conspiracy theories that surround the vaccine.', 2011, 'foundation'),
  q('Bill_Gates', 'poor', "If you think about it, a child in a poor country is 50 times more likely to die than a child in a rich country. That's the most unjust thing I can imagine.", "If you think about it, a child in a poor country is 50 times more likely to die than a child in a rich country. That's the most unjust thing I can imagine.", 2015, 'Gates Notes / foundation talks'),

  q('Mark_Zuckerberg', 'privacy', 'Privacy is no longer a social norm.', 'Privacy is no longer a social norm.', 2010, 'Crunchies awards, San Francisco'),
  q('Mark_Zuckerberg', 'dumb', "They trust me. Dumb fucks.", "They trust me. Dumb fucks.", 2004, 'IM to a friend about early Facebook users, later leaked'),
  q('Mark_Zuckerberg', 'move', 'Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.', 'Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.', 2012, 'Facebook hacker culture'),

  q('Oprah_Winfrey', 'truth', "What I know for sure is that speaking your truth is the most powerful tool we all have.", "What I know for sure is that speaking your truth is the most powerful tool we all have.", 2018, 'Golden Globes'),
  q('Oprah_Winfrey', 'best', 'You become what you believe.', 'You become what you believe.', 2005, 'recurring Oprah line'),
  q('Oprah_Winfrey', 'wagon', "I finally realized that being grateful to my body was the key to my weight-loss success.", "I finally realized that being grateful to my body was the key to my weight-loss success.", 2005, 'O magazine / show era'),

  q('Sam_Altman', 'wipe', 'AI will probably most likely lead to the end of the world, but in the meantime, there\'ll be great companies.', "AI will probably most likely lead to the end of the world, but in the meantime, there'll be great companies.", 2015, 'earlier interview, later recirculated'),
  q('Sam_Altman', 'light', 'It is a mistake to think that AGI will be just another tool. It will be more like a new species.', 'It is a mistake to think that AGI will be just another tool. It will be more like a new species.', 2023, 'OpenAI blog / interviews'),
  q('Sam_Altman', 'slow', 'We have to get this right. Getting this wrong could be very bad.', 'We have to get this right. Getting this wrong could be very bad.', 2023, 'Congressional testimony'),

  q('George_Soros', 'reflex', 'Financial markets, far from accurately reflecting all the available information, always provide a distorted view of reality.', 'Financial markets, far from accurately reflecting all the available information, always provide a distorted view of reality.', 1987, 'The Alchemy of Finance'),
  q('George_Soros', 'open', 'The sovereignty of states must be subordinated to international law and international institutions.', 'The sovereignty of states must be subordinated to international law and international institutions.', 1998, 'The Crisis of Global Capitalism'),
  q('George_Soros', 'nazi', 'I was 14. I did not do anything wrong. I was just a spectator.', 'I was 14. I did not do anything wrong. I was just a spectator.', 1998, '60 Minutes, on surviving Nazi-occupied Budapest'),

  q('Greta_Thunberg', 'dare', 'How dare you! You have stolen my dreams and my childhood with your empty words.', 'How dare you! You have stolen my dreams and my childhood with your empty words.', 2019, 'UN Climate Action Summit, New York'),
  q('Greta_Thunberg', 'house', 'I want you to act as if our house is on fire. Because it is.', 'I want you to act as if our house is on fire. Because it is.', 2019, 'World Economic Forum, Davos'),
  q('Greta_Thunberg', 'blah', 'Blah, blah, blah.', 'Blah, blah, blah.', 2021, 'Youth4Climate, Milan — on empty climate pledges'),

  q('Jack_Ma', '996', '996是福报。你不付出更多的时间和精力，怎么能实现想要的成功？', '996 is a huge blessing. How do you achieve the success you want without paying extra effort and time?', 2019, 'Alibaba internal / public defence of 9am–9pm, 6 days'),
  q('Jack_Ma', 'bank', 'The pawnshop mentality of the banks must be changed.', 'The pawnshop mentality of the banks must be changed.', 2020, 'Bund Summit speech that preceded the Ant IPO halt'),
  q('Jack_Ma', 'never', 'Never give up. Today is hard, tomorrow will be worse, but the day after tomorrow will be sunshine.', 'Never give up. Today is hard, tomorrow will be worse, but the day after tomorrow will be sunshine.', 2015, 'startup talks'),

  q('Jennifer_Doudna', 'crispr', 'The power to control our species\' genetic future is awesome and terrifying. Deciding how to handle it may be the biggest challenge we have ever faced.', "The power to control our species' genetic future is awesome and terrifying. Deciding how to handle it may be the biggest challenge we have ever faced.", 2017, 'A Crack in Creation'),
  q('Jennifer_Doudna', 'edit', 'We have the tools to rewrite the code of life. The question is not whether we can, but whether we should.', 'We have the tools to rewrite the code of life. The question is not whether we can, but whether we should.', 2015, 'CRISPR ethics summit circuit'),
  q('Jennifer_Doudna', 'babies', 'I was horrified that the first use of CRISPR in human embryos for reproduction happened the way it did.', 'I was horrified that the first use of CRISPR in human embryos for reproduction happened the way it did.', 2018, 'after He Jiankui\'s gene-edited babies'),

  q('Malala_Yousafzai', 'child', 'One child, one teacher, one book, one pen can change the world.', 'One child, one teacher, one book, one pen can change the world.', 2013, 'UN Youth Assembly, New York'),
  q('Malala_Yousafzai', 'gun', 'They thought that the bullets would silence us. But they failed.', 'They thought that the bullets would silence us. But they failed.', 2013, 'UN speech after the Taliban shooting'),
  q('Malala_Yousafzai', 'weak', 'Let us pick up our books and our pens. They are our most powerful weapons.', 'Let us pick up our books and our pens. They are our most powerful weapons.', 2013, 'UN'),

  q('Noam_Chomsky', 'terror', 'If the Nuremberg laws were applied, then every post-war American president would have been hanged.', 'If the Nuremberg laws were applied, then every post-war American president would have been hanged.', 1990, 'widely cited Chomsky remark on U.S. foreign policy'),
  q('Noam_Chomsky', 'media', 'The smart way to keep people passive and obedient is to strictly limit the spectrum of acceptable opinion, but allow very lively debate within that spectrum.', 'The smart way to keep people passive and obedient is to strictly limit the spectrum of acceptable opinion, but allow very lively debate within that spectrum.', 1998, 'The Common Good'),
  q('Noam_Chomsky', 'usa', 'The United States is the world\'s leading terrorist state.', "The United States is the world's leading terrorist state.", 2001, 'post-9/11 interviews / 9-11'),

  q('Roman_Abramovich', 'chelsea', 'I don\'t buy a football club to make money. I buy it because I love football.', "I don't buy a football club to make money. I buy it because I love football.", 2003, 'Chelsea takeover'),
  q('Roman_Abramovich', 'politics', 'I am not a politician. I am a businessman.', 'I am not a politician. I am a businessman.', 2005, 'recurring Abramovich line'),
  q('Roman_Abramovich', 'money', 'Money is not the most important thing. But it helps.', 'Money is not the most important thing. But it helps.', 2003, 'London interviews after Chelsea'),

  q('Tim_Cook', 'privacy', 'Privacy is a fundamental human right.', 'Privacy is a fundamental human right.', 2016, 'speech after the FBI / San Bernardino fight'),
  q('Tim_Cook', 'fbi', 'We have a responsibility to protect your data. We don\'t know how to backdoor a system only for the good guys.', "We have a responsibility to protect your data. We don't know how to backdoor a system only for the good guys.", 2016, 'customer letter / FBI iPhone case'),
  q('Tim_Cook', 'better', 'We believe that we are on the face of the earth to make great products and that\'s not changing.', "We believe that we are on the face of the earth to make great products and that's not changing.", 2015, 'Apple shareholder / values letters'),

  q('Mukesh_Ambani', 'digital', 'India will be a digital society, and data will be the new oil.', 'India will be a digital society, and data will be the new oil.', 2016, 'Reliance Jio launch era'),
  q('Mukesh_Ambani', 'jio', 'Voice will be free. Data will be affordable for every Indian.', 'Voice will be free. Data will be affordable for every Indian.', 2016, 'Jio'),
  q('Mukesh_Ambani', 'superpower', 'The 21st century belongs to India.', 'The 21st century belongs to India.', 2020, 'AGM speeches'),

  q('Jeff_Bezos', 'underwear', 'Your margin is my opportunity.', 'Your margin is my opportunity.', 2013, 'widely cited Bezos line on retail competition'),
  q('Jeff_Bezos', 'regret', 'I knew that when I was 80 I was not going to regret having tried this. I knew that if I didn\'t try, I would regret it.', "I knew that when I was 80 I was not going to regret having tried this. I knew that if I didn't try, I would regret it.", 1997, 'the "regret minimization framework"'),
  q('Jeff_Bezos', 'wages', "We don't pay people high wages because we're nice. We pay people high wages because it makes the business better.", "We don't pay people high wages because we're nice. We pay people high wages because it makes the business better.", 2018, '$15 minimum-wage announcement'),

  q('Alisher_Usmanov', 'russia', 'Россия — нормальная европейская страна, и я этим горжусь.', 'Russia is a normal European country, and I am proud of that.', 2012, 'London / Moscow interviews'),
  q('Alisher_Usmanov', 'arsenal', 'I am a fan first and an investor second.', 'I am a fan first and an investor second.', 2007, 'Arsenal shareholding'),
  q('Alisher_Usmanov', 'sanctions', 'These sanctions are politics, not justice.', 'These sanctions are politics, not justice.', 2022, 'after being sanctioned'),

  q('Zhang_Yiming', 'tiktok', 'ByteDance is not a Chinese company in the way people think. We are a global company.', 'ByteDance is not a Chinese company in the way people think. We are a global company.', 2020, 'TikTok / Trump-ban period letters'),
  q('Zhang_Yiming', 'algorithm', 'The machine will recommend better than editors. That is the point.', 'The machine will recommend better than editors. That is the point.', 2018, 'Toutiao / ByteDance interviews'),
  q('Zhang_Yiming', 'leave', 'I will step down. I want to spend more time on long-term things, like the company\'s social responsibility.', "I will step down. I want to spend more time on long-term things, like the company's social responsibility.", 2021, 'resignation letter'),

  q('Edward_Snowden', 'watch', 'I don\'t want to live in a world where everything I say, everything I do, everyone I talk to, every expression of creativity or love or friendship is recorded.', "I don't want to live in a world where everything I say, everything I do, everyone I talk to, every expression of creativity or love or friendship is recorded.", 2013, 'Hong Kong interview with The Guardian'),
  q('Edward_Snowden', 'nsa', 'The NSA has built an infrastructure that allows it to intercept almost everything.', 'The NSA has built an infrastructure that allows it to intercept almost everything.', 2013, 'Hong Kong'),
  q('Edward_Snowden', 'traitor', 'I am not a traitor. I am an American. I am a citizen. And I have a duty.', 'I am not a traitor. I am an American. I am a citizen. And I have a duty.', 2014, 'later interviews from Russia'),

  q('Julian_Assange', 'truth', 'If wars can be started by lies, they can be stopped by truth.', 'If wars can be started by lies, they can be stopped by truth.', 2010, 'WikiLeaks / Iraq, Afghanistan logs period'),
  q('Julian_Assange', 'secret', 'The only way to keep a secret is to never have one.', 'The only way to keep a secret is to never have one.', 2011, 'interviews'),
  q('Julian_Assange', 'coward', 'Courage is not the absence of fear. Being unafraid of a government that is unafraid of you is a different thing.', 'Courage is not the absence of fear. Being unafraid of a government that is unafraid of you is a different thing.', 2012, 'embassy period'),

  q('Yuval_Noah_Harari', 'useless', 'The most important question in 21st-century economics may well be: what do we need humans for?', 'The most important question in 21st-century economics may well be: what do we need humans for?', 2018, '21 Lessons / Davos'),
  q('Yuval_Noah_Harari', 'hack', 'Humans are now hackable animals. You can hack people.', 'Humans are now hackable animals. You can hack people.', 2018, 'Davos / AI interviews'),
  q('Yuval_Noah_Harari', 'stories', 'You could never convince a monkey to give you a banana by promising him limitless bananas after death in monkey heaven.', 'You could never convince a monkey to give you a banana by promising him limitless bananas after death in monkey heaven.', 2011, 'Sapiens'),

  q('Ai_Weiwei', 'art', 'Everything is art. Everything is politics.', 'Everything is art. Everything is politics.', 2011, 'interviews around his detention'),
  q('Ai_Weiwei', 'lie', 'The Chinese authorities are so used to lying that they believe their own lies.', 'The Chinese authorities are so used to lying that they believe their own lies.', 2012, 'after release'),
  q('Ai_Weiwei', 'freedom', 'Without freedom of speech there is no modern world, just a barbaric one.', 'Without freedom of speech there is no modern world, just a barbaric one.', 2011, 'blog / interviews'),

  q('Alexei_Navalny', 'thieves', 'Партия жуликов и воров.', 'The party of crooks and thieves.', 2011, 'label for United Russia'),
  q('Alexei_Navalny', 'putin', 'Путин — это не президент, это вор.', 'Putin is not a president, he is a thief.', 2017, 'anti-corruption films / rallies'),
  q('Alexei_Navalny', 'fear', 'Страх — это их единственное оружие. Не бойтесь.', 'Fear is their only weapon. Do not be afraid.', 2021, 'return to Russia / courtroom remarks'),

  q('Anthony_Fauci', 'science', "I represent science. If you attack me, you're attacking science.", "I represent science. If you attack me, you're attacking science.", 2021, 'CBS / Meet the Press circuit — often shortened to "I am the science"'),
  q('Anthony_Fauci', 'masks', "There's no reason to be walking around with a mask.", "There's no reason to be walking around with a mask.", 2020, '60 Minutes, March — later reversed as guidance changed'),
  q('Anthony_Fauci', 'shot', 'I think we should be honest and humble and admit when we don\'t know.', "I think we should be honest and humble and admit when we don't know.", 2020, 'early COVID briefings'),

  q('Warren_Buffett', 'tax', 'My friends and I have been coddled long enough by a billionaire-friendly Congress. It\'s time for our government to get serious about shared sacrifice.', "My friends and I have been coddled long enough by a billionaire-friendly Congress. It's time for our government to get serious about shared sacrifice.", 2011, 'New York Times op-ed, the "Buffett rule"'),
  q('Warren_Buffett', 'secretary', 'I pay a lower tax rate than my secretary.', 'I pay a lower tax rate than my secretary.', 2011, 'on the Buffett rule'),
  q('Warren_Buffett', 'fear', 'Be fearful when others are greedy, and greedy when others are fearful.', 'Be fearful when others are greedy, and greedy when others are fearful.', 1986, 'Berkshire letter / investment maxim'),

  q('Gautam_Adani', 'india', 'India will be the growth engine of the 21st century, and we will be a part of that engine.', 'India will be the growth engine of the 21st century, and we will be a part of that engine.', 2022, 'Adani Group / Mumbai'),
  q('Gautam_Adani', 'hindenburg', 'This is an attack on India. We will not be distracted.', 'This is an attack on India. We will not be distracted.', 2023, 'after the Hindenburg Research report'),
  q('Gautam_Adani', 'nation', 'Nation building is not a slogan for us. It is a business model.', 'Nation building is not a slogan for us. It is a business model.', 2022, 'AGM / infrastructure speeches'),
];
