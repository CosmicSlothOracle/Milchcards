#!/usr/bin/env node
const fs = require('fs');

// Simplified self-play simulator that approximates game flow for AI evaluation.
// This is intentionally lightweight and self-contained to avoid importing the full codebase.

function makePol(name, influence, tag=''){
  return { kind: 'pol', name, influence, tag };
}

function makeSpec(name, type='Intervention'){
  return { kind: 'spec', name, type };
}

function buildPresetDeck(preset){
  // simple presets: mix of pol cards with varying influence and some interventions
  const deck = [];
  for(let i=0;i<14;i++) deck.push(makePol(`${preset}_Pol_${i}`, 1 + Math.floor(Math.random()*5)));
  const specs = ['Fake News-Kampagne','Whistleblower','Oppositionsblockade','Think-tank','Symbolpolitik'];
  for(let s of specs) deck.push(makeSpec(s, s==='Fake News-Kampagne' || s==='Whistleblower' ? 'Intervention' : 'Sofort-Initiative'));
  // fill up
  while(deck.length < 25) deck.push(makePol(`${preset}_Pol_extra_${deck.length}`, 1 + Math.floor(Math.random()*5)));
  // shuffle
  for(let i=deck.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]] }
  return deck;
}

function draw(deck, hand, n){
  for(let i=0;i<n;i++) if(deck.length) hand.push(deck.shift());
}

function evaluateCandidates(state, player, hand, ap, difficulty){
  const opp = player===1?2:1;
  const candidates = [];
  for(let idx=0; idx<hand.length; idx++){
    const card = hand[idx];
    const apCost = 1;
    if(apCost>ap) continue;
    let base=0; let lane;
    if(card.kind==='pol'){
      lane = 'aussen';
      const myGov = state.board[player].aussen.length;
      const myPub = state.board[player].innen.length;
      base = (card.influence||0)*2 + (lane==='aussen'? Math.max(0,3-myGov)*10 : Math.max(0,3-myPub)*6);
      // opponent influence diff
      const oppInf = state.board[opp].aussen.reduce((s,c)=>s+(c.influence||0),0);
      const myInf = state.board[player].aussen.reduce((s,c)=>s+(c.influence||0),0);
      const diff = oppInf - myInf;
      if(diff>5) base += (card.influence||0)*1.5;
    } else {
      const spec = card;
      if(spec.type==='Intervention'){
        base = 50;
        const opponentHasMedia = state.board[opp].innen.some(c=>c.name.includes('Zuckerberg')||c.name.includes('Oprah'));
        if(spec.name && spec.name.includes('Fake News') && opponentHasMedia) base += 30;
      } else if(spec.type==='Dauerhaft-Initiative') base = 55;
      else base = 35;
    }
    if(difficulty==='medium') base += Math.floor(Math.random()*10)-3;
    if(difficulty==='hard') base += 12;
    candidates.push({index: idx, card, score: base, lane});
  }
  candidates.sort((a,b)=>b.score-a.score);
  if(candidates.length===0) return { type: 'pass' };
  if(difficulty==='hard'){
    // light rollout: simulate immediate placement and measure gov influence diff
    const top = candidates.slice(0,Math.min(4,candidates.length));
    let best = top[0]; let bestScore = -Infinity;
    for(const c of top){
      let acc=0; const trials=6;
      for(let t=0;t<trials;t++){
        const sim = JSON.parse(JSON.stringify(state));
        // apply
        // remove card
        sim.hands[player].splice(c.index,1);
        if(c.card.kind==='pol') sim.board[player].aussen.push(c.card);
        else if(c.card.kind==='spec' && c.card.type==='Intervention') sim.traps[player].push(c.card);
        const myInf = sim.board[player].aussen.reduce((s,x)=>s+(x.influence||0),0);
        const oppInf = sim.board[(player===1?2:1)].aussen.reduce((s,x)=>s+(x.influence||0),0);
        acc += myInf-oppInf;
      }
      const avg = acc/6 + c.score;
      if(avg>bestScore){ bestScore=avg; best=c; }
    }
    return { type: 'play', index: best.index };
  }
  return { type: 'play', index: candidates[0].index };
}

function playAction(state, player, action){
  if(action.type==='pass'){ state.passed[player]=true; return; }
  const idx = action.index;
  const card = state.hands[player].splice(idx,1)[0];
  if(card.kind==='pol') state.board[player].aussen.push(card);
  else if(card.kind==='spec'){ if(card.type==='Intervention') state.traps[player].push(card); else state.board[player].sofort.push(card); }
}

function resolveRound(state){
  const s1 = state.board[1].aussen.reduce((s,c)=>s+(c.influence||0),0);
  const s2 = state.board[2].aussen.reduce((s,c)=>s+(c.influence||0),0);
  let winner = null;
  if(s1>s2) winner=1; else if(s2>s1) winner=2; else winner = (state.passed[1] && !state.passed[2])?1:2;
  state.roundsWon[winner]++;
  return { winner, s1, s2 };
}

function simulateOneGame(difficultyP2='medium'){ // P1 baseline random/easy, P2 AI
  const deck1 = buildPresetDeck('P1');
  const deck2 = buildPresetDeck('P2');
  const state = {
    round:1, current:1, passed:{1:false,2:false}, actionPoints:{1:2,2:2},
    decks:{1:deck1,2:deck2}, hands:{1:[],2:[]}, traps:{1:[],2:[]},
    board:{1:{innen:[],aussen:[],sofort:[]},2:{innen:[],aussen:[],sofort:[]}},
    roundsWon:{1:0,2:0}
  };
  draw(state.decks[1], state.hands[1], 5); draw(state.decks[2], state.hands[2], 5);

  while(state.roundsWon[1]<2 && state.roundsWon[2]<2){
    // play one round until both passed
    state.passed = {1:false,2:false};
    state.board = {1:{innen:[],aussen:[],sofort:[]},2:{innen:[],aussen:[],sofort:[]}};
    while(!(state.passed[1] && state.passed[2])){
      const player = state.current;
      state.actionPoints[player]=2;
      // player plays until AP 0
      while(state.actionPoints[player]>0){
        const ap = state.actionPoints[player];
        let action;
        if(player===2){ action = evaluateCandidates(state, player, state.hands[player], ap, difficultyP2); }
        else { // simple baseline: play highest influence pol if any else pass
          const polIdx = state.hands[player].findIndex(c=>c.kind==='pol');
          action = polIdx>=0?{type:'play',index:polIdx}:{type:'pass'};
        }
        if(action.type==='pass'){ state.passed[player]=true; break; }
        playAction(state, player, action);
        state.actionPoints[player]-=1;
      }
      // switch player
      state.current = player===1?2:1;
    }
    const res = resolveRound(state);
    // draw up to 5
    [1,2].forEach(p=> draw(state.decks[p], state.hands[p], Math.min(5-state.hands[p].length, state.decks[p].length)));
    state.round++;
  }
  const winner = state.roundsWon[1]>state.roundsWon[2]?1:2;
  return { winner, roundsWon: state.roundsWon };
}

function runBatch(n){
  const results = [];
  for(let i=0;i<n;i++){
    results.push(simulateOneGame('hard'));
  }
  const stats = { total:n, p1wins:results.filter(r=>r.winner===1).length, p2wins:results.filter(r=>r.winner===2).length };
  return { stats, results };
}

if(require.main===module){
  const num = parseInt(process.argv[2]||'100',10);
  const out = runBatch(num);
  const path = `./tmp/sim_simple_${Date.now()}.json`;
  try{ fs.mkdirSync('./tmp',{recursive:true}); fs.writeFileSync(path, JSON.stringify(out,null,2)); console.log('Saved results to',path); }catch(e){console.warn('Could not save:',e);}
  console.log('Summary:', out.stats);
}



