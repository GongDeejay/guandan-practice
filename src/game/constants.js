// 掼蛋牌局常量
export const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
export const SUITS = ['♠','♥','♦','♣'];
export const PLAYERS = ['east', 'south', 'west', 'north'];
export const PLAYER_NAMES = { east: '东', south: '南（你）', west: '西', north: '北' };
export const DIRECTIONS = { east: 'right', south: 'bottom', west: 'left', north: 'top' };

// 牌型枚举
export const HAND_TYPES = {
  PASS: 'pass',
  SINGLE: 'single',
  PAIR: 'pair',
  TRIPLE: 'triple',
  TRIPLE_WITH_ONE: 'triple+1',
  TRIPLE_WITH_PAIR: 'triple+2',
  STRAIGHT: 'straight',
  CONSECUTIVE_PAIRS: 'consecutive_pairs',
  STEEL_PLATE: 'steel_plate',
  BOMB_4: 'bomb_4',
  BOMB_5: 'bomb_5',
  BOMB_6: 'bomb_6',
  BOMB_7: 'bomb_7',
  STRAIGHT_FLUSH: 'straight_flush',
  SUPER_BOMB: 'super_bomb',
  FOUR_JOKER: 'four_joker',
};

// 游戏阶段
export const PHASES = {
  DEALING: 'dealing',
  ANALYSIS: 'analysis',      // 等待玩家思考分析
  PLAYER_TURN: 'player_turn', // 玩家选择出牌
  AI_PLAYING: 'ai_playing',   // AI 出牌
  ROUND_END: 'round_end',
};

// 生成一副 108 张牌（两副牌含大小王）
export function createDeck() {
  const deck = [];
  let id = 0;
  // 两副牌
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ id: id++, rank, suit, points: rank === '5' ? 5 : rank === '10' || rank === 'K' ? 10 : 0 });
      }
    }
    deck.push({ id: id++, rank: 'SJ', suit: '🃏', points: 0 }); // 小王
    deck.push({ id: id++, rank: 'BJ', suit: '🂿', points: 0 }); // 大王
  }
  return deck;
}

// 洗牌
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 发牌（4人各27张）
export function dealCards(deck) {
  const hands = { north: [], south: [], west: [], east: [] };
  PLAYERS.forEach((player, pi) => {
    hands[player] = deck.slice(pi * 27, (pi + 1) * 27);
  });
  return hands;
}

// 排序手牌：按 rankIndex 降序，同 rank 按花色
export function sortHand(cards, level) {
  return [...cards].sort((a, b) => {
    const ra = getEffectiveRank(a, level);
    const rb = getEffectiveRank(b, level);
    if (rb !== ra) return rb - ra;
    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  });
}

// 获取牌的有效等级值（用于排序和比较）
export function getEffectiveRank(card, level) {
  if (card.rank === 'BJ') return 17;
  if (card.rank === 'SJ') return 16;
  if (isLevelCard(card, level)) return 15;
  if (card.rank === 'A') return 14;
  if (card.rank === 'K') return 13;
  if (card.rank === 'Q') return 12;
  if (card.rank === 'J') return 11;
  if (card.rank === '10') return 10;
  return parseInt(card.rank);
}

// 是否为级牌
export function isLevelCard(card, level) {
  return card.rank === level;
}

// 是否为任意类型的级牌（包括作为配牌的级牌）
export function isWildCard(card, level) {
  return isLevelCard(card, level);
}

// 显示牌面文字
export function cardToString(card) {
  if (card.rank === 'BJ') return '大王';
  if (card.rank === 'SJ') return '小王';
  return `${card.suit}${card.rank}`;
}

// 短显示（用于紧凑区域）
export function cardToShort(card) {
  if (card.rank === 'BJ') return '大王';
  if (card.rank === 'SJ') return '小王';
  return `${card.suit}${card.rank}`;
}

// 判断牌是否为红色
export function isRed(card) {
  return card.suit === '♥' || card.suit === '♦';
}
