// 掼蛋游戏引擎 - 核心状态管理
import {
  createDeck, shuffleDeck, dealCards, sortHand, RANKS,
  PLAYERS, PLAYER_NAMES, PHASES, HAND_TYPES
} from './constants.js';
import { identifyHandType, canBeat, aiChoosePlay } from './rules.js';
import { generateAnalysis } from './analysis.js';

const PLAYER_ORDER = ['south', 'west', 'north', 'east']; // 逆时针出牌顺序

// 创建初始游戏状态
export function createGameState() {
  const deck = shuffleDeck(createDeck());
  const rawHands = dealCards(deck);
  const level = '2'; // 起始级别

  // 排序手牌
  const hands = {};
  for (const p of PLAYERS) {
    hands[p] = sortHand(rawHands[p], level);
  }

  return {
    phase: PHASES.ANALYSIS,
    level,
    hands,
    currentTurn: 'south', // 首局南方先出
    lastPlay: null,        // { type, cards, player, size }
    consecutivePasses: 0,
    playHistory: [],       // 历史出牌记录
    selectedCards: [],     // 玩家选中的牌（index数组）
    analysisData: null,    // 分析数据
    winner: null,
    roundResults: null,    // [{ player, rank, outOrder }]
    message: '掼蛋思维训练 — 分析当前牌局信息，然后出牌！',
    levelWins: { teamA: 0, teamB: 0 }, // A=南北, B=东西
  };
}

// 获取当前分析数据
export function getAnalysis(gameState) {
  return generateAnalysis(gameState);
}

// 玩家确认分析（从分析阶段进入出牌阶段）
export function confirmAnalysis(state) {
  return {
    ...state,
    phase: PHASES.PLAYER_TURN,
    message: '选择要出的牌，然后点"出牌"（或点"过"跳过）',
  };
}

// 切换牌的选中状态
export function toggleCard(state, cardIndex) {
  const hand = state.hands.south;
  if (cardIndex < 0 || cardIndex >= hand.length) return state;

  const selected = state.selectedCards.includes(cardIndex)
    ? state.selectedCards.filter(i => i !== cardIndex)
    : [...state.selectedCards, cardIndex];

  return { ...state, selectedCards: selected };
}

// 玩家出牌
export function playerPlay(state) {
  if (state.phase !== PHASES.PLAYER_TURN) return state;

  const hand = state.hands.south;
  const selectedCards = state.selectedCards.map(i => hand[i]);
  
  if (selectedCards.length === 0) {
    return { ...state, message: '请先选择要出的牌！' };
  }

  const playType = identifyHandType(selectedCards, state.level);
  if (!playType) {
    return { ...state, message: '❌ 牌型不合法，请重新选择' };
  }

  const playWithCards = { ...playType, cards: selectedCards, player: 'south' };

  // 检查是否能打过上一手
  if (state.lastPlay && state.lastPlay.player !== 'south') {
    if (!canBeat(state.lastPlay, playWithCards, state.level)) {
      return { ...state, message: '❌ 打不过上一手牌，请重新选择' };
    }
  }

  // 出牌成功
  const newHand = hand.filter((_, i) => !state.selectedCards.includes(i));
  const newHands = { ...state.hands, south: newHand };

  // 记录出牌历史
  const newHistory = [...state.playHistory, playWithCards];

  // 检查是否出完
  if (newHand.length === 0) {
    return handleRoundEnd({ ...state, hands: newHands, playHistory: newHistory }, 'south');
  }

  // 下一个玩家
  const nextTurn = getNextPlayer('south');
  const isFreeLead = true; // 刚出完牌，下家需要跟

  return {
    ...state,
    hands: newHands,
    playHistory: newHistory,
    lastPlay: playWithCards,
    currentTurn: nextTurn,
    selectedCards: [],
    consecutivePasses: 0,
    phase: PHASES.AI_PLAYING,
    message: formatPlayMessage('south', playWithCards),
  };
}

// 玩家过牌
export function playerPass(state) {
  if (state.phase !== PHASES.PLAYER_TURN) return state;

  // 自由出牌时不能过
  if (!state.lastPlay || state.lastPlay.player === 'south' || state.consecutivePasses >= 3) {
    return { ...state, message: '当前可以自由出牌，不能"过"！请选择出牌' };
  }

  const nextTurn = getNextPlayer('south');
  const newPasses = state.consecutivePasses + 1;

  // 检查是否三家都过
  if (newPasses >= 3) {
    // 上一个出牌者获得新一轮出牌权
    const lastPlayer = state.lastPlay.player;
    return {
      ...state,
      currentTurn: lastPlayer,
      consecutivePasses: 0,
      lastPlay: null, // 新一轮自由出牌
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

// AI 回合处理（外部调用，一步步来）
export function processAITurn(state) {
  if (state.phase !== PHASES.AI_PLAYING) return state;
  
  const currentPlayer = state.currentTurn;
  if (currentPlayer === 'south') {
    // 回到玩家
    return {
      ...state,
      phase: PHASES.ANALYSIS,
      selectedCards: [],
      message: '轮到你了！先分析牌局信息',
    };
  }

  const hand = state.hands[currentPlayer];
  if (hand.length === 0) {
    return handleRoundEnd(state, currentPlayer);
  }

  // AI 选择出牌
  const strategy = currentPlayer === 'east' ? 'aggressive'
    : currentPlayer === 'west' ? 'conservative' : 'balanced';
  
  const play = aiChoosePlay(hand, state.lastPlay, state.level, strategy);

  if (!play) {
    // AI 过牌
    const nextTurn = getNextPlayer(currentPlayer);
    const newPasses = state.consecutivePasses + 1;

    if (newPasses >= 3) {
      const lastPlayer = state.lastPlay?.player || 'south';
      return {
        ...state,
        currentTurn: lastPlayer,
        consecutivePasses: 0,
        lastPlay: null,
        phase: lastPlayer === 'south' ? PHASES.ANALYSIS : PHASES.AI_PLAYING,
        message: `${PLAYER_NAMES[currentPlayer]}过牌 — 三家都过！${PLAYER_NAMES[lastPlayer]}出牌`,
      };
    }

    return {
      ...state,
      currentTurn: nextTurn,
      consecutivePasses: newPasses,
      message: `${PLAYER_NAMES[currentPlayer]}过牌`,
    };
  }

  // AI 出牌
  const playedCards = play.cards;
  const newHand = hand.filter(c => !playedCards.find(pc => pc.id === c.id));
  const newHands = { ...state.hands, [currentPlayer]: newHand };
  const playRecord = { ...play, cards: playedCards, player: currentPlayer };
  const newHistory = [...state.playHistory, playRecord];

  // 检查是否出完
  if (newHand.length === 0) {
    return handleRoundEnd({ ...state, hands: newHands, playHistory: newHistory }, currentPlayer);
  }

  const nextTurn = getNextPlayer(currentPlayer);
  return {
    ...state,
    hands: newHands,
    playHistory: newHistory,
    lastPlay: playRecord,
    currentTurn: nextTurn,
    consecutivePasses: 0,
    message: formatPlayMessage(currentPlayer, playRecord),
  };
}

// 获取下一个玩家
function getNextPlayer(current) {
  const idx = PLAYER_ORDER.indexOf(current);
  return PLAYER_ORDER[(idx + 1) % 4];
}

// 处理一局结束
function handleRoundEnd(state, winner) {
  // 这里简化处理：显示结果，可以开始新局
  const isTeamA = winner === 'south' || winner === 'north';
  const team = isTeamA ? '南北队' : '东西队';
  
  return {
    ...state,
    phase: PHASES.ROUND_END,
    winner,
    message: `🎉 ${PLAYER_NAMES[winner]}最先出完！${team}获胜！`,
    levelWins: {
      ...state.levelWins,
      teamA: state.levelWins.teamA + (isTeamA ? 1 : 0),
      teamB: state.levelWins.teamB + (!isTeamA ? 1 : 0),
    },
  };
}

// 格式化出牌消息
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
  if (play.type && play.type.startsWith('bomb')) msg = '💣 ' + msg;
  if (play.type === 'straight_flush') msg = '🔥 ' + msg;
  if (play.type === 'four_joker') msg = '⚡ ' + msg;
  return msg;
}

// 开始新局
export function newGame(state) {
  const newLevel = parseInt(state.level);
  // 如果上一局赢了提升级别（简化）
  const nextLevel = newLevel >= 14 ? 2 : newLevel + 1;
  
  const deck = shuffleDeck(createDeck());
  const rawHands = dealCards(deck);
  const level = String(RANKS[nextLevel - 2] || 'A');
  
  const hands = {};
  for (const p of PLAYERS) {
    hands[p] = sortHand(rawHands[p], level);
  }

  return {
    phase: PHASES.ANALYSIS,
    level,
    hands,
    currentTurn: 'south',
    lastPlay: null,
    consecutivePasses: 0,
    playHistory: [],
    selectedCards: [],
    analysisData: null,
    winner: null,
    roundResults: null,
    message: `新局开始 — 级别：${level}！分析牌局，然后出牌！`,
    levelWins: state.levelWins,
  };
}
