// 牌局分析逻辑 —— 生成需要玩家关注的关键信息
import { RANKS, SUITS, cardToShort, isRed } from './constants.js';

// 生成牌局分析信息
export function generateAnalysis(gameState) {
  const { hands, playHistory, currentLevel, currentTurn, lastPlay, consecutivePasses } = gameState;
  const playerHand = hands.south;
  const infoItems = [];
  const keyItems = [];

  // 1. 各玩家剩余牌数
  const remaining = {
    东: hands.east.length,
    南: hands.south.length,
    西: hands.west.length,
    北: hands.north.length,
  };
  infoItems.push({
    category: '剩余牌数',
    icon: '🃏',
    detail: `东:${remaining.东} | 南:${remaining.南} | 西:${remaining.西} | 北:${remaining.北}`,
    importance: Math.max(...Object.values(remaining)) <= 5 ? 'high' : 'normal',
  });

  // 2. 已出大牌追踪（A / 级牌 / 大小王）
  const playedCards = playHistory.flatMap(p => p.cards || []);
  const bigCards = trackBigCards(playedCards, currentLevel);
  infoItems.push({
    category: '大牌状态',
    icon: '👑',
    items: bigCards,
    importance: 'normal',
  });

  // 3. 已出炸弹统计
  const playedBombs = playHistory.filter(p => p.type && p.type.startsWith('bomb'));
  if (playedBombs.length > 0) {
    infoItems.push({
      category: '已出炸弹',
      icon: '💣',
      detail: `已出现 ${playedBombs.length} 个炸弹`,
      items: playedBombs.map(b => {
        const cards = b.cards || [];
        return cards.map(c => cardToShort(c)).join(' ');
      }),
      importance: 'high',
    });
  }

  // 4. 自己手牌分析
  const handAnalysis = analyzeOwnHand(playerHand, currentLevel);
  infoItems.push({
    category: '你的手牌',
    icon: '🎯',
    items: handAnalysis,
    importance: 'normal',
  });

  // 5. 当前出牌信息
  if (lastPlay && lastPlay.type) {
    const leaderName = getLeaderName(lastPlay, gameState);
    infoItems.push({
      category: '当前牌面',
      icon: '📋',
      detail: `${leaderName} 出了 ${formatPlay(lastPlay)}`,
      importance: 'high',
    });
  }

  // 6. 是否自由出牌
  const isFreeLead = !lastPlay || lastPlay.type === null || consecutivePasses >= 3;
  if (isFreeLead) {
    infoItems.push({
      category: '出牌状态',
      icon: '🆓',
      detail: '当前可以自由出牌（上一轮你最大）',
      importance: 'high',
    });
  }

  // 7. 对手可能的大牌（基于未出现的牌）
  const unseenCards = inferUnseenCards(playHistory, playerHand, currentLevel);
  if (unseenCards.length > 0) {
    infoItems.push({
      category: '未出现的关键牌',
      icon: '⚠️',
      items: unseenCards.slice(0, 6),
      importance: 'normal',
    });
  }

  // 标记关键项
  const finalKeyItems = infoItems.filter(i => i.importance === 'high');

  return { allInfo: infoItems, keyInfo: finalKeyItems };
}

// 追踪大牌出现情况
function trackBigCards(playedCards, level) {
  const results = [];
  
  // 大小王
  const bigJokers = playedCards.filter(c => c.rank === 'BJ').length;
  const smallJokers = playedCards.filter(c => c.rank === 'SJ').length;
  results.push(`大王: 已出${bigJokers}/2`);
  results.push(`小王: 已出${smallJokers}/2`);

  // 级牌
  const levelCards = playedCards.filter(c => c.rank === level).length;
  results.push(`${level}级牌: 已出${levelCards}/8`);

  // A
  const aces = playedCards.filter(c => c.rank === 'A').length;
  results.push(`A: 已出${aces}/8`);

  return results;
}

// 分析自己手牌
function analyzeOwnHand(hand, level) {
  const results = [];
  const counts = {};
  for (const c of hand) {
    counts[c.rank] = (counts[c.rank] || 0) + 1;
  }

  // 炸弹
  for (const [rank, count] of Object.entries(counts)) {
    if (count >= 4) {
      results.push(`💣 ${rank}炸弹 ×${count}张`);
    }
  }

  // 级牌
  const levelCount = hand.filter(c => c.rank === level).length;
  if (levelCount > 0) {
    results.push(`⭐ 级牌${level} ×${levelCount}张`);
  }

  // 牌组
  const pairs = Object.entries(counts).filter(([_, c]) => c >= 2).length;
  const singles = Object.entries(counts).filter(([_, c]) => c === 1).length;
  results.push(`📊 散牌${singles}张 | 对子${pairs}组`);

  // 大牌
  const bigCards = hand.filter(c => c.rank === 'A' || c.rank === 'K').length;
  if (bigCards > 0) {
    results.push(`👑 AK 共${bigCards}张`);
  }

  return results;
}

// 推断未出现的关键牌
function inferUnseenCards(playHistory, myHand, level) {
  const allCards = [];
  // 生成全部108张牌的简化标识
  const deck = [];
  for (let d = 0; d < 2; d++) {
    for (const rank of RANKS) {
      deck.push(rank);
    }
    deck.push('SJ');
    deck.push('BJ');
  }

  const played = playHistory.flatMap(p => p.cards || []).map(c => c.rank);
  const inHand = myHand.map(c => c.rank);
  
  const playedCounts = {};
  for (const r of played) playedCounts[r] = (playedCounts[r] || 0) + 1;
  const handCounts = {};
  for (const r of inHand) handCounts[r] = (handCounts[r] || 0) + 1;

  const unseen = [];
  const totalInDeck = {};
  for (const r of deck) totalInDeck[r] = (totalInDeck[r] || 0) + 1;

  for (const [rank, total] of Object.entries(totalInDeck)) {
    const remaining = total - (playedCounts[rank] || 0) - (handCounts[rank] || 0);
    if (remaining > 0 && ['A','K','Q','BJ','SJ', level].includes(rank)) {
      unseen.push(`${rank} 还有${remaining}张未出现`);
    }
  }

  return unseen;
}

// 获取出牌者的名称
function getLeaderName(play, gameState) {
  const idx = playHistoryIndex(play, gameState);
  const names = { east: '东', west: '西', north: '北', south: '南' };
  return names[idx] || '?';
}

function playHistoryIndex(play, gameState) {
  // 简化处理，从 lastPlay 出牌者信息获取
  return play.player || '?';
}

// 格式化出牌描述
function formatPlay(play) {
  if (!play || !play.cards) return '未知';
  const cards = play.cards.map(c => cardToShort(c)).join(' ');
  const typeNames = {
    single: '单张', pair: '对子', triple: '三条',
    'triple+1': '三带一', 'triple+2': '三带二',
    straight: '顺子', consecutive_pairs: '连对',
    steel_plate: '钢板', straight_flush: '同花顺',
    bomb_4: '四炸', bomb_5: '五炸', bomb_6: '六炸', bomb_7: '七炸',
    four_joker: '四王炸', super_bomb: '超级炸弹',
  };
  return `[${typeNames[play.type] || play.type}] ${cards}`;
}
