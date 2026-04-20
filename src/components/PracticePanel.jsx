import { useState, useEffect } from 'react';
import { PRACTICE_MODES, PAUSE_TYPES, TIP_TYPES, PracticeManager, BeginnerTutorial } from '../game/practice';

/**
 * 练习面板组件 - 紧凑版
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
  const [expanded, setExpanded] = useState(false);

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

  // 获取最重要的提示
  const mainTip = tips.find(t => t.priority === 'high') || tips[0];

  return (
    <div className={`practice-panel ${expanded ? 'expanded' : 'compact'}`}>
      {/* 紧凑模式头部 */}
      <div className="panel-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-left">
          <span className="panel-icon">🎓</span>
          <span className="panel-title">练习模式</span>
        </div>
        <div className="header-right">
          {tips.length > 0 && (
            <span className="tips-badge">{tips.length}</span>
          )}
          <span className="expand-icon">{expanded ? '▼' : '▲'}</span>
        </div>
      </div>

      {/* 紧凑模式 - 只显示关键信息 */}
      {!expanded && (
        <div className="compact-content">
          {/* 模式选择 */}
          <div className="mode-compact">
            <select 
              value={practiceManager?.mode || PRACTICE_MODES.BEGINNER}
              onChange={(e) => onModeChange(e.target.value)}
              className="mode-select-compact"
              onClick={(e) => e.stopPropagation()}
            >
              <option value={PRACTICE_MODES.BEGINNER}>初级</option>
              <option value={PRACTICE_MODES.INTERMEDIATE}>中级</option>
              <option value={PRACTICE_MODES.ADVANCED}>高级</option>
              <option value={PRACTICE_MODES.FREE}>自由</option>
            </select>
          </div>

          {/* 暂停/继续按钮 */}
          <div className="pause-compact">
            {isPaused ? (
              <button className="btn-resume-compact" onClick={(e) => { e.stopPropagation(); onResume(); }}>
                ▶️ 继续
              </button>
            ) : (
              <button className="btn-pause-compact" onClick={(e) => { e.stopPropagation(); onPause(PAUSE_TYPES.PLAYER_REQUEST); }}>
                ⏸️ 暂停
              </button>
            )}
          </div>

          {/* 最重要的提示 */}
          {mainTip && !isPaused && (
            <div 
              className="main-tip"
              style={{ borderLeftColor: getPriorityColor(mainTip.priority) }}
            >
              <span className="tip-icon-small">{getTipIcon(mainTip.type)}</span>
              <span className="tip-text-small">{mainTip.title}</span>
            </div>
          )}
        </div>
      )}

      {/* 展开模式 - 显示完整信息 */}
      {expanded && (
        <div className="expanded-content">
          {/* 模式选择 */}
          <div className="mode-expanded">
            <span className="mode-label">练习模式：</span>
            <select 
              value={practiceManager?.mode || PRACTICE_MODES.BEGINNER}
              onChange={(e) => onModeChange(e.target.value)}
              className="mode-select-expanded"
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
          <div className="pause-expanded">
            {isPaused ? (
              <button className="btn-resume-expanded" onClick={onResume}>
                ▶️ 继续游戏
              </button>
            ) : (
              <button className="btn-pause-expanded" onClick={() => onPause(PAUSE_TYPES.PLAYER_REQUEST)}>
                ⏸️ 暂停游戏
              </button>
            )}
          </div>

          {/* 教学提示列表 */}
          {tips.length > 0 && (
            <div className="tips-container-expanded">
              <div className="tips-header-expanded">
                <span>💡 系统提示</span>
                <span className="tips-count">{tips.length}</span>
              </div>
              <div className="tips-list-expanded">
                {tips.map((tip, index) => (
                  <div 
                    key={index} 
                    className="tip-item-expanded"
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
        </div>
      )}

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
