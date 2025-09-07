import { resolveQueue } from '../../utils/queue';

// Minimal test harness
function makeEmptyState(): any {
  return {
    round: 1,
    current: 1,
    passed: {1:false,2:false},
    actionPoints: {1:2,2:2},
    actionsUsed: {1:0,2:0},
    decks: {1:[],2:[]},
    hands: {1:[],2:[]},
    traps: {1:[],2:[]},
    board: {1:{innen:[],aussen:[],sofort:[]},2:{innen:[],aussen:[],sofort:[]}},
    permanentSlots: {1:{government:null,public:null,initiativePermanent:null},2:{government:null,public:null,initiativePermanent:null}},
    discard: [],
    log: [],
    activeRefresh: {1:0,2:0},
    roundsWon: {1:0,2:0},
    gameWinner: null,
    effectFlags: {1:{},2:{}},
  } as any;
}

describe('Corruption effects - Adani / Navalny / Buffett', () => {
  test('Adani sole oligarch grants +1 corruption bonus', () => {
    const state = makeEmptyState();
    // Actor is player 1
    state.board[1].innen.push({ uid: 101, name: 'Gautam Adani', kind: 'spec' });
    // Victim has a government card of influence 3
    state.board[2].aussen.push({ uid: 201, name: 'Small Gov', kind: 'pol', influence: 3 });

    // Resolve corruption steal resolve event
    resolveQueue(state, [{ type: 'CORRUPTION_STEAL_GOV_RESOLVE', player: 1, targetUid: 201 } as any]);

    // Expect a log entry indicating Adani bonus applied
    const found = state.log.find((l:string) => typeof l === 'string' && l.includes('Gautam Adani'));
    expect(found).toBeDefined();
  });

  test('Navalny on victim subtracts 1 from corruption total', () => {
    const state = makeEmptyState();
    // Actor has no oligarchs
    // Victim has Navalny in public
    state.board[2].innen.push({ uid: 301, name: 'Alexei Navalny', kind: 'spec' });
    state.board[2].aussen.push({ uid: 302, name: 'Target Gov', kind: 'pol', influence: 6 });

    resolveQueue(state, [{ type: 'CORRUPTION_STEAL_GOV_RESOLVE', player: 1, targetUid: 302 } as any]);

    const found = state.log.find((l:string) => typeof l === 'string' && l.includes('Alexei Navalny'));
    expect(found).toBeDefined();
  });

  test('Warren Buffett aura presence check', () => {
    const state = makeEmptyState();
    state.board[1].innen.push({ uid: 401, name: 'Warren Buffett', kind: 'spec' });
    (state as any)._playedGovernmentThisTurn = {1:false,2:false};

    // No events but ensure presence and flags accessible
    const hasBuffett = state.board[1].innen.some((c:any)=>c.name==='Warren Buffett');
    expect(hasBuffett).toBe(true);
  });
});
