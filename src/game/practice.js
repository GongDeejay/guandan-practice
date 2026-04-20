/**
 * 掼蛋练习功能核心模块
 * 
 * 功能设计：
 * 1. 暂停功能 - 到玩家出牌时暂停，玩家也可以随时暂停
 * 2. 初级学习阶段 - 系统教学，给出组牌建议和原因分析
 * 3. 初级学习阶段 - 行牌过程中，系统给出当前应关注的牌局变化点
 * 4. 中级阶段 - 智能提示，不直接给出答案
 */

// 练习模式
export const PRACTICE_MODES = {
  BEGINNER: 'beginner',     // 初级模式：系统直接给出建议
  INTERMEDIATE: 'intermediate', // 中级模式：智能提示
  ADVANCED: 'advanced',     // 高级模式：只在关键时刻提示
  FREE: 'free',             // 自由模式：无提示
};

// 暂停类型
export const PAUSE_TYPES = {
  PLAYER_TURN: 'player_turn',   // 玩家出牌时暂停
  PLAYER_REQUEST: 'player_request', // 玩家主动暂停
  SYSTEM: 'system',             // 系统暂停（教学）
};

// 教学提示类型
export const TIP_TYPES = {
  GROUP_CARDS: 'group_cards',       // 组牌建议
  PLAY_SUGGESTION: 'play_suggestion', // 出牌建议
  WATCH_POINT: 'watch_point',       // 关注点提示
  OPPONENT_HINT: 'opponent_hint',   // 对手提示
  BOMB_WARNING: 'bomb_warning',     // 炸弹警告
  LEVEL_CARD: 'level_card',         // 级牌提示
};

/**
 * 练习管理器
 */
export class PracticeManager {
  constructor(mode = PRACTICE_MODES.BEGINNER) {
    this.mode = mode;
    this.isPaused = false;
    this.pauseType = null;
    this.tips = [];
    this.watchedCards = []; // 需要关注的牌
    this.history = []; // 练习历史
  }

  /**
   * 设置练习模式
   */
  setMode(mode) {
    this.mode = mode;
    this.tips = [];
  }

  /**
   * 暂停游戏
   */
  pause(type = PAUSE_TYPES.PLAYER_REQUEST) {
    this.isPaused = true;
    this.pauseType = type;
    return {
      paused: true,
      type: type,
      message: this.getPauseMessage(type),
    };
  }

  /**
   * 继续游戏
   */
  resume() {
    this.isPaused = false;
    this.pauseType = null;
    return { paused: false };
  }

  /**
   * 获取暂停提示信息
   */
  getPauseMessage(type) {
    switch (type) {
      case PAUSE_TYPES.PLAYER_TURN:
        return '轮到你出牌了！请仔细分析当前牌局。';
      case PAUSE_TYPES.PLAYER_REQUEST:
        return '游戏已暂停。点击继续恢复游戏。';
      case PAUSE_TYPES.SYSTEM:
        return '系统提示：';
      default:
        return '游戏已暂停。';
    }
  }

  /**
   * 分析当前牌局，生成教学提示
   */
  analyzePosition(gameState) {
    const tips = [];
    const { hands, lastPlay, currentTurn, level, playHistory } = gameState;
    const myHand = hands.south;

    // 1. 组牌建议（初级模式）
    if (this.mode === PRACTICE_MODES.BEGINNER) {
      const groupTips = this.analyzeGroups(myHand, level);
      tips.push(...groupTips);
    }

    // 2. 出牌建议
    if (currentTurn === 'south') {
      const playTips = this.suggestPlay(myHand, lastPlay, level, playHistory);
      tips.push(...playTips);
    }

    // 3. 关注点提示
    const watchTips = this.getWatchPoints(gameState);
    tips.push(...watchTips);

    this.tips = tips;
    return tips;
  }

  /**
   * 分析组牌情况，给出建议
   */
  analyzeGroups(hand, level) {
    const tips = [];
    const groups = this.groupCards(hand, level);

    // 检查炸弹
    if (groups.bombs.length > 0) {
      tips.push({
        type: TIP_TYPES.GROUP_CARDS,
        priority: 'high',
        title: '炸弹组合',
        message: `你有 ${groups.bombs.length} 个炸弹！这是最强牌型，建议保留到关键时刻使用。`,
        cards: groups.bombs[0],
      });
    }

    // 检查同花顺
    if (groups.straightFlushes.length > 0) {
      tips.push({
        type: TIP_TYPES.GROUP_CARDS,
        priority: 'high',
        title: '同花顺',
        message: '你有同花顺！同花顺是炸弹的一种，非常强力。',
        cards: groups.straightFlushes[0],
      });
    }

    // 检查顺子
    if (groups.straights.length > 0) {
      tips.push({
        type: TIP_TYPES.GROUP_CARDS,
        priority: 'medium',
        title: '顺子组合',
        message: `发现 ${groups.straights.length} 个顺子，可以考虑在适当时机出牌。`,
        cards: groups.straights[0],
      });
    }

    // 检查连对
    if (groups.consecutivePairs.length > 0) {
      tips.push({
        type: TIP_TYPES.GROUP_CARDS,
        priority: 'medium',
        title: '连对组合',
        message: '你有连对，这是不错的牌型。',
        cards: groups.consecutivePairs[0],
      });
    }

    // 检查钢板
    if (groups.steelPlates.length > 0) {
      tips.push({
        type: TIP_TYPES.GROUP_CARDS,
        priority: 'medium',
        title: '钢板组合',
        message: '你有钢板（三连对），这是较强的牌型。',
        cards: groups.steelPlates[0],
      });
    }

    // 检查级牌
    const levelCards = hand.filter(c => c.rank === level);
    if (levelCards.length > 0) {
      tips.push({
        type: TIP_TYPES.LEVEL_CARD,
        priority: 'high',
        title: '级牌提醒',
        message: `你有 ${levelCards.length} 张级牌${level}，这是百搭牌，可以替代任何牌（除大小王）。`,
        cards: levelCards,
      });
    }

    return tips;
  }

  /**
   * 分析牌组
   */
  groupCards(hand, level) {
    const groups = {
      bombs: [],
      straightFlushes: [],
      straights: [],
      consecutivePairs: [],
      steelPlates: [],
      triples: [],
      pairs: [],
      singles: [],
    };

    // 按点数分组
    const byRank = {};
    hand.forEach(card => {
      if (!byRank[card.rank]) byRank[card.rank] = [];
      byRank[card.rank].push(card);
    });

    // 检查炸弹（4张及以上同点数）
    Object.entries(byRank).forEach(([rank, cards]) => {
      if (cards.length >= 4 && rank !== level) {
        groups.bombs.push(cards.slice(0, cards.length));
      }
    });

    // 检查三条
    Object.entries(byRank).forEach(([rank, cards]) => {
      if (cards.length === 3 && rank !== level) {
        groups.triples.push(cards);
      }
    });

    // 检查对子
    Object.entries(byRank).forEach(([rank, cards]) => {
      if (cards.length === 2 && rank !== level) {
        groups.pairs.push(cards);
      }
    });

    return groups;
  }

  /**
   * 建议出牌
   */
  suggestPlay(hand, lastPlay, level, playHistory) {
    const tips = [];

    if (!lastPlay) {
      // 首轮出牌建议
      tips.push({
        type: TIP_TYPES.PLAY_SUGGESTION,
        priority: 'medium',
        title: '首出建议',
        message: '你是首出，建议出小牌或不太重要的牌型，保留实力。',
      });
    } else {
      // 跟牌建议
      const canFollow = this.checkCanFollow(hand, lastPlay, level);
      if (canFollow) {
        tips.push({
          type: TIP_TYPES.PLAY_SUGGESTION,
          priority: 'high',
          title: '跟牌建议',
          message: '你可以跟牌！考虑是否要压制对手。',
        });
      } else {
        tips.push({
          type: TIP_TYPES.PLAY_SUGGESTION,
          priority: 'low',
          title: '过牌建议',
          message: '当前无法跟牌，建议过牌等待机会。',
        });
      }
    }

    return tips;
  }

  /**
   * 检查是否能跟牌
   */
  checkCanFollow(hand, lastPlay, level) {
    // 简化版检查，实际需要完整实现
    if (!lastPlay || !lastPlay.cards) return true;
    
    const lastType = lastPlay.type;
    const lastCards = lastPlay.cards;
    
    // 检查是否有更大的同类型牌
    // 这里需要实现完整的牌型比较逻辑
    return false;
  }

  /**
   * 获取关注点提示
   */
  getWatchPoints(gameState) {
    const tips = [];
    const { playHistory, hands, level } = gameState;

    // 分析已出的牌
    const playedCards = playHistory.flatMap(p => p.cards || []);
    
    // 检查是否有人可能有炸弹
    const bombRanks = this.checkPossibleBombs(playedCards, level);
    if (bombRanks.length > 0) {
      tips.push({
        type: TIP_TYPES.BOMB_WARNING,
        priority: 'high',
        title: '炸弹预警',
        message: `注意：${bombRanks.join('、')} 可能存在炸弹！`,
      });
    }

    // 检查级牌出现情况
    const levelCardsPlayed = playedCards.filter(c => c.rank === level);
    if (levelCardsPlayed.length >= 2) {
      tips.push({
        type: TIP_TYPES.LEVEL_CARD,
        priority: 'medium',
        title: '级牌动态',
        message: `已有 ${levelCardsPlayed.length} 张级牌${level}出现，剩余级牌可能成为百搭牌。`,
      });
    }

    return tips;
  }

  /**
   * 检查可能的炸弹
   */
  checkPossibleBombs(playedCards, level) {
    const playedByRank = {};
    playedCards.forEach(card => {
      if (!playedByRank[card.rank]) playedByRank[card.rank] = 0;
      playedByRank[card.rank]++;
    });

    // 每种牌有8张（两副牌），如果某牌已出4张以上，不太可能有炸弹
    const possibleBombs = [];
    const allRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    allRanks.forEach(rank => {
      const played = playedByRank[rank] || 0;
      const remaining = 8 - played; // 两副牌共8张
      if (remaining >= 4) {
        possibleBombs.push(rank);
      }
    });

    return possibleBombs;
  }

  /**
   * 记录练习历史
   */
  recordAction(action) {
    this.history.push({
      ...action,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取练习统计
   */
  getStats() {
    return {
      mode: this.mode,
      totalActions: this.history.length,
      tipsGiven: this.tips.length,
      pauseCount: this.history.filter(a => a.type === 'pause').length,
    };
  }
}

/**
 * 初级教学模块
 */
export class BeginnerTutorial {
  constructor() {
    this.step = 0;
    this.steps = [
      {
        title: '欢迎来到掼蛋训练！',
        content: '掼蛋是一种4人扑克游戏，使用两副牌共108张。你和对家是一队，目标是先出完牌。',
      },
      {
        title: '认识牌型',
        content: '掼蛋有多种牌型：单张、对子、三条、三带二、顺子、连对、钢板、炸弹等。',
      },
      {
        title: '级牌和百搭',
        content: '每局有指定的级牌（如2、A等），级牌可以当作百搭牌，替代任何牌（除大小王）。',
      },
      {
        title: '炸弹规则',
        content: '4张及以上同点数牌是炸弹，同花顺也是炸弹。炸弹可以打任何非炸弹牌型。',
      },
      {
        title: '开始练习',
        content: '现在开始练习！系统会在关键时刻给你提示，帮助你学习掼蛋技巧。',
      },
    ];
  }

  /**
   * 获取当前教学步骤
   */
  getCurrentStep() {
    return this.steps[this.step];
  }

  /**
   * 下一步
   */
  nextStep() {
    if (this.step < this.steps.length - 1) {
      this.step++;
      return true;
    }
    return false;
  }

  /**
   * 是否完成教学
   */
  isComplete() {
    return this.step >= this.steps.length - 1;
  }
}
