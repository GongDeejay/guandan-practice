import { useState, useEffect } from 'react';
import { PRACTICE_MODES, PAUSE_TYPES, TIP_TYPES, PracticeManager, BeginnerTutorial } from '../game/practice';

/**
 * 练习面板组件
 * 
 * 功能：
 * 1. 显示练习模式选择
 * 2. 显示教学提示
 * 3. 暂停/继续控制
 * 4. 初级教学引导
 */
export default function PracticePanel({ 
  game, 
  practiceManager, 
  onPause, 
  onResume, 
  onModeChange,
  isPaused 
}) {
  const [tutorial, setTutorial] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tips, setTips] = useState([]);

  // 分析当前牌局
  useEffect(() => {
    if (practiceManager && game) {
      const newTips = practiceManager.analyzePosition(game);
      setTips(newTips);
    }
  }, [game, practiceManager]);

  // 开始初级教学
  const startTutorial = () => {
    const tut = new BeginnerTutorial();
    setTutorial(tut);
    setShowTutorial(true);
  };

  // 下一步教学
  const nextTutorialStep = () => {
    if (tutorial && tutorial.nextStep()) {
      setTutorial({ ...tutorial });
    } else {
      setShowTutorial(false);
      setTutorial(null);
    }
  };

  // 获取提示图标
  const getTipIcon = (type) => {
    switch (type) {
      case TIP_TYPES.GROUP_CARDS: return '🃏';
      case TIP_TYPES.PLAY_SUGGESTION: return '💡';
      case TIP_TYPES.WATCH_POINT: return '👁️';
      case TIP_TYPES.BOMB_WARNING: return '💣';
      case TIP_TYPES.LEVEL_CARD: return '⭐';
      default: return '📌';
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#e53935';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#888';
    }
  };

  return (
    <div className="practice-panel">
      {/* 模式选择 */}
      <div className="practice-modes">
        <span className="mode-label">练习模式：</span>
        <select 
          value={practiceManager?.mode || PRACTICE_MODES.BEGINNER}
          onChange={(e) => onModeChange(e.target.value)}
          className="mode-select"
        >
          <option value={PRACTICE_MODES.BEGINNER}>初级（详细提示）</option>
          <option value={PRACTICE_MODES.INTERMEDIATE}>中级（智能提示）</option>
          <option value={PRACTICE_MODES.ADVANCED}>高级（关键提示）</option>
          <option value={PRACTICE_MODES.FREE}>自由（无提示）</option>
        </select>
        
        <button 
          className="btn-tutorial"
          onClick={startTutorial}
        >
          📚 教学
        </button>
      </div>

      {/* 暂停控制 */}
      <div className="pause-controls">
        {isPaused ? (
          <button className="btn-resume" onClick={onResume}>
            ▶️ 继续
          </button>
        ) : (
          <button className="btn-pause" onClick={() => onPause(PAUSE_TYPES.PLAYER_REQUEST)}>
            ⏸️ 暂停
          </button>
        )}
      </div>

      {/* 初级教学弹窗 */}
      {showTutorial && tutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-card">
            <div className="tutorial-step">
              步骤 {tutorial.step + 1} / {tutorial.steps.length}
            </div>
            <h3>{tutorial.getCurrentStep().title}</h3>
            <p>{tutorial.getCurrentStep().content}</p>
            <div className="tutorial-actions">
              <button onClick={() => setShowTutorial(false)}>跳过</button>
              <button className="btn-primary" onClick={nextTutorialStep}>
                {tutorial.isComplete() ? '开始练习' : '下一步'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 教学提示列表 */}
      {tips.length > 0 && !isPaused && (
        <div className="tips-container">
          <div className="tips-header">
            <span>💡 系统提示</span>
            <span className="tips-count">{tips.length}</span>
          </div>
          <div className="tips-list">
            {tips.map((tip, index) => (
              <div 
                key={index} 
                className="tip-item"
                style={{ borderLeftColor: getPriorityColor(tip.priority) }}
              >
                <div className="tip-icon">{getTipIcon(tip.type)}</div>
                <div className="tip-content">
                  <div className="tip-title">{tip.title}</div>
                  <div className="tip-message">{tip.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 暂停时的教学提示 */}
      {isPaused && tips.length > 0 && (
        <div className="paused-tips">
          <div className="paused-header">
            <span>⏸️ 游戏暂停</span>
            <span>分析当前局面</span>
          </div>
          <div className="paused-tips-list">
            {tips.map((tip, index) => (
              <div 
                key={index} 
                className="paused-tip-item"
                style={{ borderLeftColor: getPriorityColor(tip.priority) }}
              >
                <div className="tip-icon">{getTipIcon(tip.type)}</div>
                <div className="tip-content">
                  <div className="tip-title">{tip.title}</div>
                  <div className="tip-message">{tip.message}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-resume-main" onClick={onResume}>
            ▶️ 继续游戏
          </button>
        </div>
      )}
    </div>
  );
}
