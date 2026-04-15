// 掼蛋游戏引擎 - 核心状态管理
import {
  createDeck, shuffleDeck, dealCards, sortHand, RANKS,
  PLAYERS, PLAYER_NAMES, PHASES, HAND_TYPES
} from './constants.js';
import { identifyHandType, canBeat, aiChoosePlay } from './rules.js';
import { generateAnalysis } from './analysis.js';

const PLAYER_ORDER = ['south', 'west', 'north', 'east'];

// ========== 手牌分组 ==========
export function groupHand(hand, level) {
  const groups = [];
  const used = new Set();

  // 按 rank 统计
  const byRank = {};
  hand.forEach((c, i) => {
    if (!byRank[c.rank]) byRank[c.rank] = [];
    byRank[c.rank].push(i);
  });

  // 1. 四王炸弹（正好4张大小王）
  const jokerIndices = hand.reduce((acc, c, i) => {
    if (c.rank === 'BJ' || c.rank === 'SJ') acc.push(i);
    return acc;
  }, []);
  if (jokerIndices.length === 4) {
    groups.push({ label: '⚡四王炸', cards: [...jokerIndices], type: 'four_joker' });
    jokerIndices.forEach(i => used.add(i));
  }

  // 2. 炸弹（正好4张同rank，多余的牌拆出来）
  Object.entries(byRank).forEach(([rank, indices]) => {
    const free = indices.filter(i => !used.has(i));
    if (free.length >= 4) {
      const bomb = free.slice(0, 4);
      groups.push({ label: `💣${rank}炸`, cards: bomb, type: 'bomb' });
      bomb.forEach(i => used.add(i));
      // >4张的部分在散牌阶段处理
    }
  });

  // 3. 三条（3张同rank）
  Object.entries(byRank).forEach(([rank, indices]) => {
    const free = indices.filter(i => !used.has(i));
    if (free.length >= 3) {
      const triple = free.slice(0, 3);
      groups.push({ label: `×${rank}`, cards: triple, type: 'triple' });
      triple.forEach(i => used.add(i));
    }
  });

  // 4. 对子（2张同rank）
  Object.entries(byRank).forEach(([rank, indices]) => {
    const free = indices.filter(i => !used.has(i));
    if (free.length >= 2) {
      const pair = free.slice(0, 2);
      groups.push({ label: `${rank}${rank}`, cards: pair, type: 'pair' });
      pair.forEach(i => used.add(i));
    }
  });

  // 5. 散牌
  const singles = [];
  hand.forEach((_, i) => {
    if (!used.has(i)) singles.push(i);
  });
  if (singles.length > 0) {
    groups.push({ label: `散牌(${singles.length})`, cards: singles, type: 'singles' });
  }

  return groups;
}

// ========== 状态管理 ==========

export function createGameState() {
  return {
    phase: PHASES.DEALING,
    level: '2',
    hands: { north: [], south: [], west: [], east: [] },
    currentTurn: 'south',
    lastPlay: null,
    consecutivePasses: 0,
    playHistory: [],
    selectedCards: [],
    cardGroups: [],
    analysisData: null,
    winner: null,
    message: '点击「开始发牌」开始新牌局',
    levelWins: { teamA: 0, teamB: 0 },
  };
}

export function startNewRound(state) {
  const deck = shuffleDeck(createDeck());
  const rawHands = dealCards(deck);
  const level = state.level || '2';
  const hands = {};
  for (const p of PLAYERS) hands[p] = sortHand(rawHands[p], level);
  const groups = groupHand(hands.south, level);

  return {
    ...state,
    phase: PHASES.ANALYSIS,
    hands,
    currentTurn: 'south',
    lastPlay: null,
    consecutivePasses: 0,
    playHistory: [],
    selectedCards: [],
    cardGroups: groups,
    winner: null,
    message: '轮到你了！先分析牌局信息',
  };
}

export function getAnalysis(gameState) {
  return generateAnalysis(gameState);
}

export function confirmAnalysis(state) {
  return {
    ...state,
    phase: PHASES.PLAYER_TURN,
    message: '选择要出的牌，然后点"出牌"（或点"过"跳过）',
  };
}

// 将牌从一个分组移到另一个分组
export function moveCardGroup(state, fromGroupIdx, cardIdx, toGroupIdx) {
  const groups = state.cardGroups.map(g => ({ ...g, cards: [...g.cards] }));
  if (!groups[fromGroupIdx] || !groups[toGroupIdx]) return state;
  const ci = groups[fromGroupIdx].cards.indexOf(cardIdx);
  if (ci === -1) return state;
  groups[fromGroupIdx].cards.splice(ci, 1);
  if (groups[fromGroupIdx].cards.length === 0) groups.splice(fromGroupIdx, 1);
  // 更新 toGroupIdx（可能因删除而偏移）
  const toIdx = toGroupIdx >= fromGroupIdx && groups.length < state.cardGroups.length ? toGroupIdx - 1 : toGroupIdx;
  if (groups[toIdx]) groups[toIdx].cards.push(cardIdx);
  return { ...state, cardGroups: groups };
}

// 自动重新分组
export function regroupHand(state) {
  return {
    ...state,
    cardGroups: groupHand(state.hands.south, state.level),
    selectedCards: [],
  };
}

export function toggleCard(state, cardIndex) {
  const hand = state.hands.south;
  if (cardIndex < 0 || cardIndex >= hand.length) return state;
  const selected = state.selectedCards.includes(cardIndex)
    ? state.selectedCards.filter(i => i !== cardIndex)
    : [...state.selectedCards, cardIndex];
  return { ...state, selectedCards: selected };
}

export function playerPlay(state) {
  if (state.phase !== PHASES.PLAYER_TURN) return state;
  const hand = state.hands.south;
  const selectedCards = state.selectedCards.map(i => hand[i]);
  if (selectedCards.length === 0) return { ...state, message: '请先选择要出的牌！' };

  const playType = identifyHandType(selectedCards, state.level);
  if (!playType) return { ...state, message: '❌ 牌型不合法，请重新选择' };

  const playWithCards = { ...playType, cards: selectedCards, player: 'south' };

  if (state.lastPlay && state.lastPlay.player !== 'south') {
    if (!canBeat(state.lastPlay, playWithCards, state.level)) {
      return { ...state, message: '❌ 打不过上一手牌，请重新选择' };
    }
  }

  const newHand = hand.filter((_, i) => !state.selectedCards.includes(i));
  const newHands = { ...state.hands, south: newHand };
  const newHistory = [...state.playHistory, playWithCards];
  const newGroups = groupHand(newHand, state.level);

  if (newHand.length === 0) {
    return handleRoundEnd({
      ...state, hands: newHands, playHistory: newHistory, cardGroups: newGroups
    }, 'south');
  }

  return {
    ...state,
    hands: newHands,
    playHistory: newHistory,
    lastPlay: playWithCards,
    currentTurn: getNextPlayer('south'),
    selectedCards: [],
    cardGroups: newGroups,
    consecutivePasses: 0,
    phase: PHASES.AI_PLAYING,
    message: formatPlayMessage('south', playWithCards),
  };
}

export function playerPass(state) {
  if (state.phase !== PHASES.PLAYER_TURN) return state;
  if (!state.lastPlay || state.lastPlay.player === 'south' || state.consecutivePasses >= 3) {
    return { ...state, message: '当前可以自由出牌，不能"过"！请选择出牌' };
  }

  const nextTurn = getNextPlayer('south');
  const newPasses = state.consecutivePasses + 1;

  if (newPasses >= 3) {
    const lastPlayer = state.lastPlay.player;
    return {
      ...state,
      currentTurn: lastPlayer,
      consecutivePasses: 0,
      lastPlay: null,
      selectedCards: [],
      phase: lastPlayer === 'south' ? PHASES.ANALYSIS : PHASES.AI_PLAYING,
      message: `三家都过！${PLAYER_NAMES[lastPlayer]}获得出牌权`,
    };
  }

  return {
    ...state,
    currentTurn: nextTurn,
    consecutivePasses: newPasses,
    selectedCards: [],
    phase: PHASES.AI_PLAYING,
    message: '你选择过牌',
  };
}

export function processAITurn(state) {
  if (state.phase !== PHASES.AI_PLAYING) return state;
  const currentPlayer = state.currentTurn;
  if (currentPlayer === 'south') {
    return {
      ...state,
      phase: PHASES.ANALYSIS,
      selectedCards: [],
      message: '轮到你了！先分析牌局信息',
    };
  }

  const hand = state.hands[currentPlayer];
  if (hand.length === 0) return handleRoundEnd(state, currentPlayer);

  const strategy = currentPlayer === 'east' ? 'aggressive'
    : currentPlayer === 'west' ? 'conservative' : 'balanced';
  const play = aiChoosePlay(hand, state.lastPlay, state.level, strategy);

  if (!play) {
    const nextTurn = getNextPlayer(currentPlayer);
    const newPasses = state.consecutivePasses + 1;
    if (newPasses >= 3) {
      const lastPlayer = state.lastPlay?.player || 'south';
      return {
        ...state, currentTurn: lastPlayer, consecutivePasses: 0, lastPlay: null,
        phase: lastPlayer === 'south' ? PHASES.ANALYSIS : PHASES.AI_PLAYING,
        message: `${PLAYER_NAMES[currentPlayer]}过牌 — 三家都过！${PLAYER_NAMES[lastPlayer]}出牌`,
      };
    }
    return { ...state, currentTurn: nextTurn, consecutivePasses: newPasses, message: `${PLAYER_NAMES[currentPlayer]}过牌` };
  }

  const playedCards = play.cards;
  const newHand = hand.filter(c => !playedCards.find(pc => pc.id === c.id));
  const newHands = { ...state.hands, [currentPlayer]: newHand };
  const playRecord = { ...play, cards: playedCards, player: currentPlayer };
  const newHistory = [...state.playHistory, playRecord];

  if (newHand.length === 0) {
    return handleRoundEnd({ ...state, hands: newHands, playHistory: newHistory }, currentPlayer);
  }

  return {
    ...state, hands: newHands, playHistory: newHistory, lastPlay: playRecord,
    currentTurn: getNextPlayer(currentPlayer), consecutivePasses: 0,
    message: formatPlayMessage(currentPlayer, playRecord),
  };
}

function getNextPlayer(current) {
  const idx = PLAYER_ORDER.indexOf(current);
  return PLAYER_ORDER[(idx + 1) % 4];
}

function handleRoundEnd(state, winner) {
  const isTeamA = winner === 'south' || winner === 'north';
  return {
    ...state,
    phase: PHASES.ROUND_END,
    winner,
    message: `🎉 ${PLAYER_NAMES[winner]}最先出完！${isTeamA ? '南北队' : '东西队'}获胜！`,
    levelWins: {
      ...state.levelWins,
      teamA: state.levelWins.teamA + (isTeamA ? 1 : 0),
      teamB: state.levelWins.teamB + (!isTeamA ? 1 : 0),
    },
  };
}

function formatPlayMessage(player, play) {
  const typeNames = {
    single: '单张', pair: '对子', triple: '三条',
    'triple+1': '三带一', 'triple+2': '三带二',
    straight: '顺子', consecutive_pairs: '连对',
    steel_plate: '钢板', straight_flush: '同花顺',
    bomb_4: '四炸', bomb_5: '五炸', bomb_6: '六炸', bomb_7: '七炸',
    four_joker: '四王炸',
  };
  const typeName = typeNames[play.type] || play.type;
  const cards = (play.cards || []).map(c => {
    if (c.rank === 'BJ') return '大王';
    if (c.rank === 'SJ') return '小王';
    return `${c.suit}${c.rank}`;
  }).join(' ');
  let msg = `${PLAYER_NAMES[player]}出了 [${typeName}] ${cards}`;
  if (play.type?.startsWith('bomb')) msg = '💣 ' + msg;
  if (play.type === 'straight_flush') msg = '🔥 ' + msg;
  if (play.type === 'four_joker') msg = '⚡ ' + msg;
  return msg;
}

export function nextGame(state) {
  const cur = parseInt(state.level);
  const next = cur >= 14 ? '2' : String(RANKS[cur - 1] || 'A');
  return { ...createGameState(), level: next, levelWins: state.levelWins };
}
