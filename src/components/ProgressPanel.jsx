import { useState, useEffect } from 'react';
import { ProgressManager, ACHIEVEMENTS } from '../game/progress';

/**
 * 学习进度面板组件
 * 
 * 显示：
 * 1. 基本统计
 * 2. 技能雷达图
 * 3. 学习曲线
 * 4. 成就
 * 5. 学习建议
 */
export default function ProgressPanel({ isOpen, onClose }) {
  const [manager] = useState(() => new ProgressManager());
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    if (isOpen) {
      setReport(manager.getReport());
    }
  }, [isOpen, manager]);

  if (!isOpen || !report) return null;

  // 技能名称映射
  const skillNames = {
    grouping: '组牌能力',
    counting: '记牌能力',
    strategy: '策略能力',
    teamwork: '配合能力',
    timing: '时机把握',
  };

  // 获取技能颜色
  const getSkillColor = (value) => {
    if (value >= 80) return '#4caf50';
    if (value >= 60) return '#ff9800';
    if (value >= 40) return '#ffc107';
    return '#e53935';
  };

  return (
    <div className="progress-overlay" onClick={onClose}>
      <div className="progress-panel" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="progress-header">
          <h2>📊 学习进度</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* 标签页 */}
        <div className="progress-tabs">
          <button 
            className={activeTab === 'stats' ? 'active' : ''} 
            onClick={() => setActiveTab('stats')}
          >
            统计
          </button>
          <button 
            className={activeTab === 'skills' ? 'active' : ''} 
            onClick={() => setActiveTab('skills')}
          >
            技能
          </button>
          <button 
            className={activeTab === 'achievements' ? 'active' : ''} 
            onClick={() => setActiveTab('achievements')}
          >
            成就
          </button>
          <button 
            className={activeTab === 'suggestions' ? 'active' : ''} 
            onClick={() => setActiveTab('suggestions')}
          >
            建议
          </button>
        </div>

        {/* 内容区域 */}
        <div className="progress-content">
          {/* 统计标签 */}
          {activeTab === 'stats' && (
            <div className="stats-tab">
              {/* 基本统计 */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{report.totalGames}</div>
                  <div className="stat-label">总场次</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{report.winRate}%</div>
                  <div className="stat-label">胜率</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{report.streakDays}</div>
                  <div className="stat-label">连续天数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{Math.floor(report.totalTime / 60)}</div>
                  <div className="stat-label">练习分钟</div>
                </div>
              </div>

              {/* 按模式统计 */}
              <div className="mode-stats">
                <h4>按模式统计</h4>
                {Object.entries(manager.progress.byMode).map(([mode, stats]) => (
                  <div key={mode} className="mode-stat-row">
                    <span className="mode-name">
                      {mode === 'beginner' ? '初级' :
                       mode === 'intermediate' ? '中级' :
                       mode === 'advanced' ? '高级' : '自由'}
                    </span>
                    <span className="mode-games">{stats.games}场</span>
                    <span className="mode-wins">
                      {stats.games > 0 ? Math.round(stats.wins / stats.games * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>

              {/* 学习曲线 */}
              {report.learningCurve && (
                <div className="learning-curve">
                  <h4>学习趋势</h4>
                  <div className={`trend-indicator ${report.learningCurve.trend}`}>
                    {report.learningCurve.trend === 'improving' && '📈 进步中'}
                    {report.learningCurve.trend === 'stable' && '➡️ 稳定'}
                    {report.learningCurve.trend === 'declining' && '📉 需要加强'}
                    {report.learningCurve.trend === 'insufficient_data' && '📊 数据不足'}
                  </div>
                  {report.learningCurve.recent !== null && (
                    <div className="trend-details">
                      <span>近期胜率: {Math.round(report.learningCurve.recent * 100)}%</span>
                      {report.learningCurve.previous !== null && (
                        <span>之前胜率: {Math.round(report.learningCurve.previous * 100)}%</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 技能标签 */}
          {activeTab === 'skills' && (
            <div className="skills-tab">
              <div className="skills-list">
                {Object.entries(report.skills).map(([skill, value]) => (
                  <div key={skill} className="skill-item">
                    <div className="skill-header">
                      <span className="skill-name">{skillNames[skill]}</span>
                      <span 
                        className="skill-value"
                        style={{ color: getSkillColor(value) }}
                      >
                        {value}
                      </span>
                    </div>
                    <div className="skill-bar">
                      <div 
                        className="skill-fill"
                        style={{ 
                          width: `${value}%`,
                          backgroundColor: getSkillColor(value)
                        }}
                      />
                    </div>
                    <div className="skill-level">
                      {value >= 80 ? '优秀' : 
                       value >= 60 ? '良好' : 
                       value >= 40 ? '一般' : '需提升'}
                    </div>
                  </div>
                ))}
              </div>

              {/* 技能雷达图（简化版） */}
              <div className="skills-radar">
                <h4>技能分布</h4>
                <div className="radar-chart">
                  {Object.entries(report.skills).map(([skill, value], index) => (
                    <div 
                      key={skill}
                      className="radar-bar"
                      style={{
                        '--value': `${value}%`,
                        '--color': getSkillColor(value),
                        '--delay': `${index * 0.1}s`
                      }}
                    >
                      <span className="radar-label">{skillNames[skill]}</span>
                      <div className="radar-fill" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 成就标签 */}
          {activeTab === 'achievements' && (
            <div className="achievements-tab">
              <div className="achievements-grid">
                {Object.entries(ACHIEVEMENTS).map(([id, achievement]) => {
                  const unlocked = report.achievements.includes(id);
                  return (
                    <div 
                      key={id} 
                      className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
                    >
                      <div className="achievement-icon">
                        {unlocked ? achievement.icon : '🔒'}
                      </div>
                      <div className="achievement-info">
                        <div className="achievement-name">{achievement.name}</div>
                        <div className="achievement-desc">{achievement.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="achievements-summary">
                已解锁: {report.achievements.length} / {Object.keys(ACHIEVEMENTS).length}
              </div>
            </div>
          )}

          {/* 建议标签 */}
          {activeTab === 'suggestions' && (
            <div className="suggestions-tab">
              {report.suggestions.length > 0 ? (
                <div className="suggestions-list">
                  {report.suggestions.map((suggestion, index) => (
                    <div 
                      key={index} 
                      className={`suggestion-item ${suggestion.priority}`}
                    >
                      <div className="suggestion-icon">
                        {suggestion.priority === 'high' ? '❗' : '💡'}
                      </div>
                      <div className="suggestion-content">
                        <div className="suggestion-skill">
                          {skillNames[suggestion.skill] || suggestion.skill}
                        </div>
                        <div className="suggestion-message">
                          {suggestion.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-suggestions">
                  <div className="no-suggestions-icon">✨</div>
                  <div className="no-suggestions-text">
                    表现很好！继续保持练习！
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="progress-footer">
          <button 
            className="btn-reset"
            onClick={() => {
              if (confirm('确定要重置所有学习进度吗？')) {
                manager.reset();
                setReport(manager.getReport());
              }
            }}
          >
            重置进度
          </button>
        </div>
      </div>
    </div>
  );
}
