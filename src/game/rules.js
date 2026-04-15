// 掼蛋出牌规则与牌型判断
import { HAND_TYPES } from './constants.js';

// ========== 牌型识别 ==========

function countByRank(cards) {
  const counts = {};
  for (const c of cards) {
    counts[c.rank] = (counts[c.rank] || 0) + 1;
  }
  return counts;
}

function getRanks(cards) {
  return cards.map(c => c.rank);
}

// 判断是否为大小王
function isJoker(card) {
  return card.rank === 'BJ' || card.rank === 'SJ';
}

// 判断所有牌是否同一花色
function allSameSuit(cards) {
  return cards.every(c => c.suit === cards[0].suit);
}

// 判断是否所有牌为同一点数
function allSameRank(cards) {
  return cards.every(c => c.rank === cards[0].rank);
}

// 牌型识别主函数
export function identifyHandType(cards, currentLevel) {
  if (!cards || cards.length === 0) return null;

  const n = cards.length;
  const counts = countByRank(cards);
  const uniqueRanks = Object.keys(counts);
  const maxCount = Math.max(...Object.values(counts));
  const jokerCount = cards.filter(c => isJoker(c)).length;

  // --- 四王炸弹 ---
  if (n === 4 && jokerCount === 4) {
    return { type: HAND_TYPES.FOUR_JOKER, size: 4, strength: 100 };
  }

  // --- 单张 ---
  if (n === 1) {
    return { type: HAND_TYPES.SINGLE, size: 1, rank: cards[0].rank };
  }

  // --- 对子 ---
  if (n === 2 && uniqueRanks.length === 1) {
    return { type: HAND_TYPES.PAIR, size: 2, rank: uniqueRanks[0] };
  }

  // --- 三条 ---
  if (n === 3 && maxCount === 3) {
    return { type: HAND_TYPES.TRIPLE, size: 3, rank: uniqueRanks[0] };
  }

  // --- 三带一 ---
  if (n === 4) {
    const tripleRank = uniqueRanks.find(r => counts[r] === 3);
    if (tripleRank) {
      return { type: HAND_TYPES.TRIPLE_WITH_ONE, size: 4, rank: tripleRank };
    }
  }

  // --- 三带二（三带对）---
  if (n === 5) {
    const tripleRank = uniqueRanks.find(r => counts[r] === 3);
    const pairRank = uniqueRanks.find(r => counts[r] === 2);
    if (tripleRank && pairRank) {
      return { type: HAND_TYPES.TRIPLE_WITH_PAIR, size: 5, rank: tripleRank };
    }
  }

  // --- 顺子（>=5张连续单牌）---
  if (n >= 5 && maxCount === 1 && jokerCount === 0) {
    const result = checkStraight(cards, currentLevel);
    if (result) return result;
  }

  // --- 连对（>=3对连续对子，即>=6张）---
  if (n >= 6 && n % 2 === 0 && maxCount === 2) {
    const result = checkConsecutivePairs(cards, counts, currentLevel);
    if (result) return result;
    // 也可能是钢板（连续三条）
  }

  // --- 钢板（连续三条，即两个连续的三条 = 6张）---
  if (n === 6 && maxCount === 3) {
    const result = checkSteelPlate(cards, counts, currentLevel);
    if (result) return result;
  }

  // --- 炸弹 ---
  // 4炸
  if (n === 4 && maxCount === 4 && uniqueRanks.length === 1) {
    return { type: HAND_TYPES.BOMB_4, size: 4, rank: uniqueRanks[0] };
  }
  // 级牌炸弹（4张级牌）
  if (n === 4 && cards.every(c => c.rank === currentLevel)) {
    return { type: HAND_TYPES.BOMB_4, size: 4, rank: currentLevel, isLevelBomb: true };
  }

  // 5炸
  if (n === 5 && maxCount === 5 && uniqueRanks.length === 1) {
    return { type: HAND_TYPES.BOMB_5, size: 5, rank: uniqueRanks[0] };
  }

  // 6炸
  if (n === 6 && maxCount === 6 && uniqueRanks.length === 1) {
    return { type: HAND_TYPES.BOMB_6, size: 6, rank: uniqueRanks[0] };
  }

  // 7炸及以上
  if (n >= 7 && maxCount === n && uniqueRanks.length === 1) {
    const typeMap = { 7: HAND_TYPES.BOMB_7 };
    return { type: typeMap[n] || HAND_TYPES.BOMB_7, size: n, rank: uniqueRanks[0] };
  }

  // --- 同花顺（顺子 + 同花色）---
  if (n >= 5 && allSameSuit(cards)) {
    const result = checkStraight(cards, currentLevel);
    if (result) {
      return { ...result, type: HAND_TYPES.STRAIGHT_FLUSH };
    }
  }

  return null; // 不合法出牌
}

// 检查顺子
function checkStraight(cards, currentLevel) {
  const n = cards.length;
  // 顺子不能包含大小王
  if (cards.some(c => isJoker(c))) return null;

  const effRanks = cards.map(c => {
    if (c.rank === currentLevel) return 15;
    if (c.rank === 'A') return 14;
    if (c.rank === 'K') return 13;
    if (c.rank === 'Q') return 12;
    if (c.rank === 'J') return 11;
    if (c.rank === '10') return 10;
    return parseInt(c.rank);
  }).sort((a, b) => a - b);

  // 检查连续（允许级牌在中间作为通配）
  const hasLevelCard = cards.some(c => c.rank === currentLevel);
  
  if (!hasLevelCard) {
    // 无级牌：必须严格连续
    for (let i = 1; i < n; i++) {
      if (effRanks[i] !== effRanks[i-1] + 1) return null;
    }
    return { type: HAND_TYPES.STRAIGHT, size: n, length: n, minRank: effRanks[0], maxRank: effRanks[n-1] };
  }
  
  // 有级牌：级牌可以当任意牌使用，简化处理：检查去掉gap后是否合理
  // 简化版：检查非级牌部分是否连续，级牌填补空缺
  const nonLevelRanks = effRanks.filter(r => r !== 15);
  const levelCount = effRanks.filter(r => r === 15).length;
  
  if (nonLevelRanks.length <= 1) {
    return { type: HAND_TYPES.STRAIGHT, size: n, length: n };
  }
  
  // 计算需要填补的空缺
  let gaps = 0;
  for (let i = 1; i < nonLevelRanks.length; i++) {
    gaps += nonLevelRanks[i] - nonLevelRanks[i-1] - 1;
  }
  
  if (gaps <= levelCount && nonLevelRanks[nonLevelRanks.length-1] - nonLevelRanks[0] + 1 <= n) {
    return { type: HAND_TYPES.STRAIGHT, size: n, length: n };
  }
  
  return null;
}

// 检查连对
function checkConsecutivePairs(cards, counts, currentLevel) {
  const pairRanks = Object.entries(counts)
    .filter(([_, count]) => count === 2)
    .map(([rank]) => rank);
  
  if (pairRanks.length < 3) return null;
  
  const effRanks = pairRanks.map(r => {
    if (r === currentLevel) return 15;
    if (r === 'A') return 14;
    if (r === 'K') return 13;
    if (r === 'Q') return 12;
    if (r === 'J') return 11;
    if (r === '10') return 10;
    return parseInt(r);
  }).sort((a, b) => a - b);
  
  for (let i = 1; i < effRanks.length; i++) {
    if (effRanks[i] !== effRanks[i-1] + 1) return null;
  }
  
  return { type: HAND_TYPES.CONSECUTIVE_PAIRS, size: cards.length, pairs: effRanks.length, minRank: effRanks[0] };
}

// 检查钢板（连续三条）
function checkSteelPlate(cards, counts, currentLevel) {
  const tripleRanks = Object.entries(counts)
    .filter(([_, count]) => count === 3)
    .map(([rank]) => rank);
  
  if (tripleRanks.length !== 2) return null;
  
  const effRanks = tripleRanks.map(r => {
    if (r === currentLevel) return 15;
    if (r === 'A') return 14;
    return parseInt(r);
  }).sort((a, b) => a - b);
  
  if (effRanks[1] === effRanks[0] + 1) {
    return { type: HAND_TYPES.STEEL_PLATE, size: 6, minRank: effRanks[0] };
  }
  
  return null;
}

// ========== 牌力比较 ==========

// 获取炸弹的大小权重（用于排序）
function getBombStrength(type) {
  const map = {
    [HAND_TYPES.BOMB_4]: 1,
    [HAND_TYPES.BOMB_5]: 2,
    [HAND_TYPES.BOMB_6]: 3,
    [HAND_TYPES.BOMB_7]: 4,
    [HAND_TYPES.STRAIGHT_FLUSH]: 5,
    [HAND_TYPES.FOUR_JOKER]: 6,
  };
  return map[type] || 0;
}

// 比较两手牌，返回 true 表示 newPlay 能打过 currentPlay
export function canBeat(currentPlay, newPlay, currentLevel) {
  if (!newPlay || !newPlay.type || newPlay.type === HAND_TYPES.PASS) return false;
  if (!currentPlay || !currentPlay.type) return true; // 自由出牌

  const newIsBomb = isBombType(newPlay.type);
  const curIsBomb = isBombType(currentPlay.type);

  // 炸弹打非炸弹
  if (newIsBomb && !curIsBomb) return true;
  // 非炸弹打炸弹
  if (!newIsBomb && curIsBomb) return false;

  // 都是炸弹：比较炸弹大小
  if (newIsBomb && curIsBomb) {
    const newStr = getBombStrength(newPlay.type);
    const curStr = getBombStrength(currentPlay.type);
    if (newStr !== curStr) return newStr > curStr;
    // 同类型炸弹：比较牌面大小
    return compareRank(newPlay, currentPlay, currentLevel);
  }

  // 非炸弹：必须同类型且张数相同
  if (newPlay.type !== currentPlay.type) return false;
  if (getCardCount(newPlay) !== getCardCount(currentPlay)) return false;

  return compareRank(newPlay, currentPlay, currentLevel);
}

// 比较牌面大小
function compareRank(play1, play2, currentLevel) {
  const r1 = getPlayMainRank(play1, currentLevel);
  const r2 = getPlayMainRank(play2, currentLevel);
  return r1 > r2;
}

// 获取牌型的主要等级值
function getPlayMainRank(play, currentLevel) {
  if (play.rank) {
    if (play.rank === 'BJ') return 17;
    if (play.rank === 'SJ') return 16;
    if (play.rank === currentLevel) return 15;
    if (play.rank === 'A') return 14;
    if (play.rank === 'K') return 13;
    if (play.rank === 'Q') return 12;
    if (play.rank === 'J') return 11;
    if (play.rank === '10') return 10;
    return parseInt(play.rank);
  }
  if (play.minRank !== undefined) return play.minRank;
  return 0;
}

function getCardCount(play) {
  if (play.cards) return play.cards.length;
  return play.size || 0;
}

function isBombType(type) {
  return [
    HAND_TYPES.BOMB_4, HAND_TYPES.BOMB_5, HAND_TYPES.BOMB_6,
    HAND_TYPES.BOMB_7, HAND_TYPES.STRAIGHT_FLUSH, HAND_TYPES.FOUR_JOKER
  ].includes(type);
}

// ========== AI 出牌逻辑 ==========

// AI 选择出牌
export function aiChoosePlay(hand, lastPlay, currentLevel, strategy = 'balanced') {
  if (!lastPlay || lastPlay.type === HAND_TYPES.PASS) {
    // 自由出牌：按策略选择
    return aiLead(hand, currentLevel, strategy);
  }
  // 跟牌：找能打过的最小牌
  return aiFollow(hand, lastPlay, currentLevel, strategy);
}

// 自由出牌（上一轮自己赢了或者首出）
function aiLead(hand, level, strategy) {
  // 策略：aggressive 出小牌，conservative 出大牌
  const sorted = hand.slice().sort((a, b) => getEffectiveRankValue(a, level) - getEffectiveRankValue(b, level));
  
  // 优先出单张/对子（保留炸弹）
  const singles = [];
  const pairs = [];
  const counts = countByRank(hand);
  for (const [rank, count] of Object.entries(counts)) {
    const cards = hand.filter(c => c.rank === rank);
    if (count >= 4 && !hand.some(c => c.rank === rank && isJoker(c))) continue; // 保留炸弹
    if (count === 1) singles.push(cards[0]);
    if (count === 2) pairs.push(cards[0]); // 只拿一张代表
  }

  if (strategy === 'conservative') {
    // 保守：先出大单张
    if (singles.length > 0) {
      singles.sort((a, b) => getEffectiveRankValue(b, level) - getEffectiveRankValue(a, level));
      return { type: HAND_TYPES.SINGLE, size: 1, rank: singles[0].rank, cards: [singles[0]] };
    }
  }

  // 默认：出最小的单张
  if (singles.length > 0) {
    singles.sort((a, b) => getEffectiveRankValue(a, level) - getEffectiveRankValue(b, level));
    return { type: HAND_TYPES.SINGLE, size: 1, rank: singles[0].rank, cards: [singles[0]] };
  }
  
  // 没有单张，出对子
  if (pairs.length > 0) {
    const pairCards = hand.filter(c => c.rank === pairs[0].rank).slice(0, 2);
    return { type: HAND_TYPES.PAIR, size: 2, rank: pairs[0].rank, cards: pairCards };
  }

  // 兜底：出最小的一张
  return { type: HAND_TYPES.SINGLE, size: 1, rank: sorted[0].rank, cards: [sorted[0]] };
}

// 跟牌逻辑
function aiFollow(hand, lastPlay, level, strategy) {
  const target = identifyHandType(lastPlay.cards || [], level);
  if (!target) return null;

  // 找同类型的牌型中能打过的最小的一个
  const candidates = findAllMatchingPlays(hand, target, level);
  
  // 筛选能打过的
  const valid = candidates.filter(play => canBeat(lastPlay, play, level));

  if (valid.length === 0) {
    // 找不到同类型能打过的，尝试用炸弹
    if (strategy === 'aggressive' || hand.length <= 6) {
      const bombs = findBombs(hand, level);
      for (const bomb of bombs) {
        if (canBeat(lastPlay, bomb, level)) return bomb;
      }
    }
    return null; // 过
  }

  // 选最小的能打过的
  valid.sort((a, b) => getPlayMainRank(a, level) - getPlayMainRank(b, level));
  return valid[0];
}

// 找出手牌中所有匹配牌型的出法
function findAllMatchingPlays(hand, target, level) {
  const results = [];
  const counts = countByRank(hand);

  switch (target.type) {
    case HAND_TYPES.SINGLE: {
      for (const card of hand) {
        results.push({ type: HAND_TYPES.SINGLE, size: 1, rank: card.rank, cards: [card] });
      }
      break;
    }
    case HAND_TYPES.PAIR: {
      for (const [rank, count] of Object.entries(counts)) {
        if (count >= 2) {
          const pair = hand.filter(c => c.rank === rank).slice(0, 2);
          results.push({ type: HAND_TYPES.PAIR, size: 2, rank, cards: pair });
        }
      }
      break;
    }
    case HAND_TYPES.TRIPLE:
    case HAND_TYPES.TRIPLE_WITH_ONE:
    case HAND_TYPES.TRIPLE_WITH_PAIR: {
      for (const [rank, count] of Object.entries(counts)) {
        if (count >= 3) {
          const triple = hand.filter(c => c.rank === rank).slice(0, 3);
          if (target.type === HAND_TYPES.TRIPLE) {
            results.push({ type: HAND_TYPES.TRIPLE, size: 3, rank, cards: triple });
          } else if (target.type === HAND_TYPES.TRIPLE_WITH_ONE) {
            // 加一张散牌
            const kicker = hand.find(c => c.rank !== rank);
            if (kicker) {
              results.push({ type: HAND_TYPES.TRIPLE_WITH_ONE, size: 4, rank, cards: [...triple, kicker] });
            }
          } else {
            // 三带二
            const pairRank = Object.keys(counts).find(r => r !== rank && counts[r] >= 2);
            if (pairRank) {
              const pair = hand.filter(c => c.rank === pairRank).slice(0, 2);
              results.push({ type: HAND_TYPES.TRIPLE_WITH_PAIR, size: 5, rank, cards: [...triple, ...pair] });
            }
          }
        }
      }
      break;
    }
  }
  return results;
}

// 找出手牌中的炸弹
function findBombs(hand, level) {
  const bombs = [];
  const counts = countByRank(hand);
  
  for (const [rank, count] of Object.entries(counts)) {
    if (count >= 4) {
      const bombCards = hand.filter(c => c.rank === rank).slice(0, count);
      const typeMap = { 4: HAND_TYPES.BOMB_4, 5: HAND_TYPES.BOMB_5, 6: HAND_TYPES.BOMB_6, 7: HAND_TYPES.BOMB_7 };
      bombs.push({ type: typeMap[count] || HAND_TYPES.BOMB_7, size: count, rank, cards: bombCards });
    }
  }

  // 同花顺检查（简化）
  // 四王炸
  const jokers = hand.filter(c => isJoker(c));
  if (jokers.length === 4) {
    bombs.push({ type: HAND_TYPES.FOUR_JOKER, size: 4, cards: jokers });
  }

  return bombs;
}

function getEffectiveRankValue(card, level) {
  if (card.rank === 'BJ') return 17;
  if (card.rank === 'SJ') return 16;
  if (card.rank === level) return 15;
  if (card.rank === 'A') return 14;
  if (card.rank === 'K') return 13;
  if (card.rank === 'Q') return 12;
  if (card.rank === 'J') return 11;
  if (card.rank === '10') return 10;
  return parseInt(card.rank);
}

export { isJoker, countByRank };
