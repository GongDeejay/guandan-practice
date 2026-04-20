/**
 * 学习进度管理模块
 * 
 * 功能：
 * 1. 保存学习进度到本地存储
 * 2. 记录统计数据
 * 3. 分析学习曲线
 */

const STORAGE_KEY = 'guandan_practice_progress';

/**
 * 进度管理器
 */
export class ProgressManager {
  constructor() {
    this.progress = this.load();
  }

  /**
   * 从本地存储加载进度
   */
  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load progress:', e);
    }
    
    // 默认进度
    return this.getDefaultProgress();
  }

  /**
   * 获取默认进度
   */
  getDefaultProgress() {
    return {
      // 基本统计
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      
      // 按模式统计
      byMode: {
        beginner: { games: 0, wins: 0, tips: 0 },
        intermediate: { games: 0, wins: 0, tips: 0 },
        advanced: { games: 0, wins: 0, tips: 0 },
        free: { games: 0, wins: 0, tips: 0 },
      },
      
      // 技能评估
      skills: {
        grouping: 50,      // 组牌能力 (0-100)
        counting: 50,      // 记牌能力
        strategy: 50,      // 策略能力
        teamwork: 50,      // 配合能力
        timing: 50,        // 时机把握
      },
      
      // 学习记录
      recentGames: [],     // 最近的游戏记录
      achievements: [],    // 成就
      
      // 时间统计
      totalTime: 0,        // 总练习时间（分钟）
      lastPlayed: null,    // 上次练习时间
      streakDays: 0,       // 连续练习天数
    };
  }

  /**
   * 保存进度
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.warn('Failed to save progress:', e);
    }
  }

  /**
   * 记录游戏结果
   */
  recordGame(result) {
    const { mode, won, tips, duration, score } = result;
    
    // 更新基本统计
    this.progress.totalGames++;
    if (won) {
      this.progress.totalWins++;
    } else {
      this.progress.totalLosses++;
    }
    
    // 更新模式统计
    if (this.progress.byMode[mode]) {
      this.progress.byMode[mode].games++;
      if (won) this.progress.byMode[mode].wins++;
      this.progress.byMode[mode].tips += tips || 0;
    }
    
    // 更新时间统计
    this.progress.totalTime += duration || 0;
    this.progress.lastPlayed = new Date().toISOString();
    
    // 更新连续天数
    this.updateStreak();
    
    // 记录游戏详情
    this.progress.recentGames.push({
      date: new Date().toISOString(),
      mode,
      won,
      score,
      tips,
    });
    
    // 只保留最近20条记录
    if (this.progress.recentGames.length > 20) {
      this.progress.recentGames = this.progress.recentGames.slice(-20);
    }
    
    // 更新技能评估
    this.updateSkills(result);
    
    // 检查成就
    this.checkAchievements();
    
    // 保存
    this.save();
  }

  /**
   * 更新连续天数
   */
  updateStreak() {
    const lastPlayed = this.progress.lastPlayed;
    if (!lastPlayed) {
      this.progress.streakDays = 1;
      return;
    }

    const lastDate = new Date(lastPlayed);
    const today = new Date();
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // 今天已经练习过
      return;
    } else if (diffDays === 1) {
      // 连续练习
      this.progress.streakDays++;
    } else {
      // 中断了
      this.progress.streakDays = 1;
    }
  }

  /**
   * 更新技能评估
   */
  updateSkills(result) {
    const { won, tips, mode } = result;
    const skills = this.progress.skills;
    
    // 根据游戏结果调整技能值
    const adjustment = won ? 2 : -1;
    const tipPenalty = (tips || 0) * 0.5; // 使用提示会降低技能评分
    
    // 组牌能力
    skills.grouping = Math.max(0, Math.min(100, 
      skills.grouping + adjustment - tipPenalty * 0.3
    ));
    
    // 记牌能力（中级以上模式更看重）
    if (mode === 'intermediate' || mode === 'advanced') {
      skills.counting = Math.max(0, Math.min(100,
        skills.counting + adjustment * 1.5
      ));
    }
    
    // 策略能力
    skills.strategy = Math.max(0, Math.min(100,
      skills.strategy + adjustment - tipPenalty * 0.5
    ));
    
    // 配合能力（队友配合好会提升）
    if (won) {
      skills.teamwork = Math.max(0, Math.min(100,
        skills.teamwork + 1
      ));
    }
    
    // 时机把握
    skills.timing = Math.max(0, Math.min(100,
      skills.timing + adjustment * 0.8
    ));
  }

  /**
   * 检查成就
   */
  checkAchievements() {
    const achievements = this.progress.achievements;
    const stats = this.progress;
    
    const newAchievements = [];
    
    // 首胜成就
    if (stats.totalWins === 1 && !achievements.includes('first_win')) {
      achievements.push('first_win');
      newAchievements.push({ id: 'first_win', name: '首胜', desc: '赢得第一场练习' });
    }
    
    // 10连胜
    if (this.checkStreak(10) && !achievements.includes('streak_10')) {
      achievements.push('streak_10');
      newAchievements.push({ id: 'streak_10', name: '连胜达人', desc: '连续赢得10场练习' });
    }
    
    // 练习100场
    if (stats.totalGames >= 100 && !achievements.includes('games_100')) {
      achievements.push('games_100');
      newAchievements.push({ id: 'games_100', name: '坚持不懈', desc: '完成100场练习' });
    }
    
    // 连续7天练习
    if (stats.streakDays >= 7 && !achievements.includes('streak_7')) {
      achievements.push('streak_7');
      newAchievements.push({ id: 'streak_7', name: '每日练习', desc: '连续7天练习' });
    }
    
    // 技能全满
    const allSkillsAbove80 = Object.values(stats.skills).every(s => s >= 80);
    if (allSkillsAbove80 && !achievements.includes('all_skills_80')) {
      achievements.push('all_skills_80');
      newAchievements.push({ id: 'all_skills_80', name: '全能选手', desc: '所有技能达到80分' });
    }
    
    return newAchievements;
  }

  /**
   * 检查连胜
   */
  checkStreak(count) {
    const recent = this.progress.recentGames.slice(-count);
    return recent.length === count && recent.every(g => g.won);
  }

  /**
   * 获取进度报告
   */
  getReport() {
    const p = this.progress;
    
    return {
      // 基本统计
      totalGames: p.totalGames,
      winRate: p.totalGames > 0 ? (p.totalWins / p.totalGames * 100).toFixed(1) : 0,
      
      // 技能雷达图数据
      skills: { ...p.skills },
      
      // 学习曲线
      learningCurve: this.calculateLearningCurve(),
      
      // 成就
      achievements: p.achievements,
      
      // 时间统计
      totalTime: p.totalTime,
      streakDays: p.streakDays,
      
      // 建议
      suggestions: this.getSuggestions(),
    };
  }

  /**
   * 计算学习曲线
   */
  calculateLearningCurve() {
    const games = this.progress.recentGames;
    if (games.length < 5) return null;
    
    // 计算最近5场和之前5场的胜率对比
    const recent5 = games.slice(-5);
    const previous5 = games.slice(-10, -5);
    
    const recentWinRate = recent5.filter(g => g.won).length / 5;
    const previousWinRate = previous5.length === 5 
      ? previous5.filter(g => g.won).length / 5 
      : null;
    
    return {
      recent: recentWinRate,
      previous: previousWinRate,
      trend: previousWinRate !== null 
        ? (recentWinRate > previousWinRate ? 'improving' : 
           recentWinRate < previousWinRate ? 'declining' : 'stable')
        : 'insufficient_data',
    };
  }

  /**
   * 获取学习建议
   */
  getSuggestions() {
    const suggestions = [];
    const skills = this.progress.skills;
    
    // 找出最弱的技能
    const sortedSkills = Object.entries(skills)
      .sort(([,a], [,b]) => a - b);
    
    const weakest = sortedSkills[0];
    
    if (weakest[1] < 50) {
      suggestions.push({
        skill: weakest[0],
        message: this.getSkillAdvice(weakest[0]),
        priority: 'high',
      });
    }
    
    // 检查是否需要换模式
    const beginnerStats = this.progress.byMode.beginner;
    if (beginnerStats.games > 20 && beginnerStats.wins / beginnerStats.games > 0.7) {
      suggestions.push({
        skill: 'mode',
        message: '你在初级模式已经很熟练了，建议尝试中级模式！',
        priority: 'medium',
      });
    }
    
    return suggestions;
  }

  /**
   * 获取技能建议
   */
  getSkillAdvice(skill) {
    const advice = {
      grouping: '建议多练习组牌，注意识别炸弹、顺子、连对等牌型。',
      counting: '建议开启记牌器，养成记牌的习惯，关注关键牌的出现。',
      strategy: '建议多思考出牌顺序，考虑何时保留实力、何时全力出击。',
      teamwork: '建议多观察队友的出牌，学会送牌和接牌配合。',
      timing: '建议多练习判断何时出炸弹、何时过牌等待机会。',
    };
    return advice[skill] || '继续练习提升技能！';
  }

  /**
   * 重置进度
   */
  reset() {
    this.progress = this.getDefaultProgress();
    this.save();
  }

  /**
   * 导出进度数据
   */
  export() {
    return JSON.stringify(this.progress, null, 2);
  }

  /**
   * 导入进度数据
   */
  import(data) {
    try {
      this.progress = JSON.parse(data);
      this.save();
      return true;
    } catch (e) {
      console.error('Failed to import progress:', e);
      return false;
    }
  }
}

/**
 * 成就定义
 */
export const ACHIEVEMENTS = {
  first_win: { name: '首胜', icon: '🏆', desc: '赢得第一场练习' },
  streak_10: { name: '连胜达人', icon: '🔥', desc: '连续赢得10场练习' },
  games_100: { name: '坚持不懈', icon: '💪', desc: '完成100场练习' },
  streak_7: { name: '每日练习', icon: '📅', desc: '连续7天练习' },
  all_skills_80: { name: '全能选手', icon: '⭐', desc: '所有技能达到80分' },
  no_tips_win: { name: '独立自主', icon: '🎯', desc: '不使用提示赢得比赛' },
  bomb_master: { name: '炸弹大师', icon: '💣', desc: '使用炸弹赢得10场比赛' },
};
