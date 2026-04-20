/**
 * 记牌器模块
 * 
 * 功能：
 * 1. 记录已出的牌
 * 2. 统计剩余牌张数
 * 3. 分析对手可能持有的牌
 * 4. 概率计算
 */

import { RANKS, SUITS } from './constants';

/**
 * 记牌器类
 */
export class CardTracker {
  constructor() {
    this.reset();
  }

  /**
   * 重置记牌器
   */
  reset() {
    // 初始化所有牌（两副牌共108张）
    this.totalCards = {};
    this.playedCards = [];
    this.playedByPlayer = { north: [], south: [], west: [], east: [] };
    
    // 每种牌8张（两副牌）
    const allRanks = [...RANKS, 'SJ', 'BJ'];
    allRanks.forEach(rank => {
      this.totalCards[rank] = rank === 'SJ' || rank === 'BJ' ? 2 : 8;
    });
  }

  /**
   * 记录出牌
   */
  trackPlay(cards, player) {
    cards.forEach(card => {
      this.playedCards.push(card);
      this.playedByPlayer[player].push(card);
      
      // 减少该牌的剩余数量
      if (this.totalCards[card.rank] > 0) {
        this.totalCards[card.rank]--;
      }
    });
  }

  /**
   * 获取某张牌的剩余数量
   */
  getRemaining(rank) {
    return this.totalCards[rank] || 0;
  }

  /**
   * 获取所有牌的剩余情况
   */
  getAllRemaining() {
    return { ...this.totalCards };
  }

  /**
   * 获取某玩家已出的牌
   */
  getPlayerPlayed(player) {
    return [...this.playedByPlayer[player]];
  }

  /**
   * 分析某玩家可能持有的牌
   */
  analyzePossibleCards(player, knownCards) {
    const possibleCards = [];
    const playerPlayed = this.playedByPlayer[player];
    
    // 排除已出的牌和已知的手牌
    const excludedRanks = new Set();
    playerPlayed.forEach(c => excludedRanks.add(c.rank));
    knownCards.forEach(c => excludedRanks.add(c.rank));
    
    // 剩余的牌都是可能持有的
    Object.entries(this.totalCards).forEach(([rank, count]) => {
      if (count > 0 && !excludedRanks.has(rank)) {
        for (let i = 0; i < count; i++) {
          possibleCards.push({ rank, remaining: count });
        }
      }
    });
    
    return possibleCards;
  }

  /**
   * 计算某玩家持有特定牌的概率
   */
  getProbability(player, targetRank, playerHandSize) {
    const remaining = this.getRemaining(targetRank);
    if (remaining === 0) return 0;
    
    // 计算其他玩家手中剩余的牌数
    const otherPlayersCards = 27 * 3; // 其他三人各27张
    const totalRemaining = Object.values(this.totalCards).reduce((a, b) => a + b, 0);
    
    // 简化概率计算
    const probability = Math.min(1, (remaining * playerHandSize) / totalRemaining);
    return probability;
  }

  /**
   * 检查某玩家是否可能有炸弹
   */
  checkPossibleBomb(player, targetRank) {
    const remaining = this.getRemaining(targetRank);
    const playerPlayed = this.playedByPlayer[player].filter(c => c.rank === targetRank).length;
    
    // 如果剩余牌数 >= 4 且该玩家未出过该牌，可能有炸弹
    return remaining >= 4 && playerPlayed === 0;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      totalPlayed: this.playedCards.length,
      remaining: Object.values(this.totalCards).reduce((a, b) => a + b, 0),
      byPlayer: {},
      possibleBombs: [],
    };

    // 每个玩家出牌数
    Object.entries(this.playedByPlayer).forEach(([player, cards]) => {
      stats.byPlayer[player] = cards.length;
    });

    // 可能的炸弹
    Object.entries(this.totalCards).forEach(([rank, count]) => {
      if (count >= 4) {
        stats.possibleBombs.push({ rank, count });
      }
    });

    return stats;
  }
}

/**
 * 概率分析器
 */
export class ProbabilityAnalyzer {
  constructor(cardTracker) {
    this.tracker = cardTracker;
  }

  /**
   * 分析出牌成功率
   */
  analyzePlaySuccess(myCards, playCards, lastPlay) {
    if (!lastPlay) return { success: true, probability: 1 };

    const playType = identifyPlayType(playCards);
    const lastType = lastPlay.type;

    // 类型不同无法跟
    if (playType.type !== lastType.type && playType.type !== 'bomb') {
      return { success: false, probability: 0 };
    }

    // 炸弹可以打任何牌
    if (playType.type === 'bomb' && lastType.type !== 'bomb') {
      return { success: true, probability: 1 };
    }

    // 同类型比较大小
    if (playType.type === lastType.type) {
      const isLarger = this.comparePlays(playCards, lastPlay.cards, playType);
      return { 
        success: isLarger, 
        probability: isLarger ? 1 : 0 
      };
    }

    return { success: false, probability: 0 };
  }

  /**
   * 比较两手牌的大小
   */
  comparePlays(playCards, lastCards, playType) {
    // 简化比较：只比较最大牌
    const playMax = Math.max(...playCards.map(c => this.getCardValue(c)));
    const lastMax = Math.max(...lastCards.map(c => this.getCardValue(c)));
    return playMax > lastMax;
  }

  /**
   * 获取牌的数值（用于比较）
   */
  getCardValue(card) {
    if (card.rank === 'BJ') return 17;
    if (card.rank === 'SJ') return 16;
    if (card.rank === 'A') return 14;
    if (card.rank === 'K') return 13;
    if (card.rank === 'Q') return 12;
    if (card.rank === 'J') return 11;
    return parseInt(card.rank) || 0;
  }

  /**
   * 分析最佳出牌
   */
  suggestBestPlay(myCards, lastPlay, level) {
    const suggestions = [];

    if (!lastPlay) {
      // 首轮出牌建议
      suggestions.push(...this.suggestFirstPlay(myCards, level));
    } else {
      // 跟牌建议
      suggestions.push(...this.suggestFollowPlay(myCards, lastPlay, level));
    }

    return suggestions;
  }

  /**
   * 首轮出牌建议
   */
  suggestFirstPlay(cards, level) {
    const suggestions = [];
    const groups = this.groupCards(cards, level);

    // 优先出小单张
    if (groups.singles.length > 0) {
      const smallest = groups.singles[0];
      suggestions.push({
        type: 'single',
        cards: [smallest],
        reason: '出小单张，消耗对手大牌',
        priority: 3,
      });
    }

    // 或者出小对子
    if (groups.pairs.length > 0) {
      const smallestPair = groups.pairs[0];
      suggestions.push({
        type: 'pair',
        cards: smallestPair,
        reason: '出小对子，试探对手牌力',
        priority: 2,
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 跟牌建议
   */
  suggestFollowPlay(cards, lastPlay, level) {
    const suggestions = [];
    const lastType = lastPlay.type;
    const lastCards = lastPlay.cards;
    const groups = this.groupCards(cards, level);

    // 根据上家出牌类型找能跟的牌
    if (lastType === 'single') {
      const larger = cards.filter(c => this.getCardValue(c) > this.getCardValue(lastCards[0]));
      if (larger.length > 0) {
        // 找最小的能跟的牌
        larger.sort((a, b) => this.getCardValue(a) - this.getCardValue(b));
        suggestions.push({
          type: 'single',
          cards: [larger[0]],
          reason: '用最小的牌跟牌，保留大牌',
          priority: 3,
        });
      }
    }

    // 检查是否用炸弹
    if (groups.bombs.length > 0) {
      suggestions.push({
        type: 'bomb',
        cards: groups.bombs[0],
        reason: '用炸弹压制，但要考虑是否值得',
        priority: 1,
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 分析牌组
   */
  groupCards(cards, level) {
    const groups = {
      bombs: [],
      straights: [],
      pairs: [],
      singles: [],
    };

    // 按点数分组
    const byRank = {};
    cards.forEach(card => {
      if (!byRank[card.rank]) byRank[card.rank] = [];
      byRank[card.rank].push(card);
    });

    // 检查炸弹
    Object.entries(byRank).forEach(([rank, cardList]) => {
      if (cardList.length >= 4 && rank !== level) {
        groups.bombs.push(cardList);
      }
    });

    // 检查对子
    Object.entries(byRank).forEach(([rank, cardList]) => {
      if (cardList.length >= 2 && rank !== level) {
        groups.pairs.push(cardList.slice(0, 2));
      }
    });

    // 单张
    Object.entries(byRank).forEach(([rank, cardList]) => {
      if (cardList.length === 1) {
        groups.singles.push(cardList[0]);
      }
    });

    // 按大小排序
    groups.singles.sort((a, b) => this.getCardValue(a) - this.getCardValue(b));
    groups.pairs.sort((a, b) => this.getCardValue(a[0]) - this.getCardValue(b[0]));

    return groups;
  }
}

/**
 * 识别出牌类型
 */
function identifyPlayType(cards) {
  const num = cards.length;
  
  if (num === 1) return { type: 'single', length: 1 };
  if (num === 2) return { type: 'pair', length: 2 };
  if (num === 3) return { type: 'triple', length: 3 };
  if (num === 4) return { type: 'bomb', length: 4 };
  if (num === 5) return { type: 'straight', length: 5 };
  
  return { type: 'unknown', length: num };
}
