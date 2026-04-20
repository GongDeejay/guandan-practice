import { useMemo } from 'react';
import { RANKS } from '../game/constants';

/**
 * 记牌器组件
 * 
 * 显示：
 * 1. 各牌剩余数量
 * 2. 已出牌统计
 * 3. 可能的炸弹预警
 */
export default function CardTracker({ tracker, compact = false }) {
  // 获取剩余牌统计
  const remaining = useMemo(() => {
    if (!tracker) return null;
    return tracker.getAllRemaining();
  }, [tracker]);

  // 获取统计信息
  const stats = useMemo(() => {
    if (!tracker) return null;
    return tracker.getStats();
  }, [tracker]);

  if (!remaining || !stats) return null;

  // 定义牌的显示顺序
  const displayOrder = ['BJ', 'SJ', 'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

  // 获取牌的显示颜色
  const getCardColor = (rank, count) => {
    if (count === 0) return 'depleted'; // 已出完
    if (rank === 'BJ') return 'black-joker';
    if (rank === 'SJ') return 'small-joker';
    if (count >= 4) return 'possible-bomb'; // 可能有炸弹
    if (count >= 2) return 'normal';
    return 'low';
  };

  // 获取牌的显示文本
  const getRankDisplay = (rank) => {
    if (rank === 'BJ') return '大王';
    if (rank === 'SJ') return '小王';
    return rank;
  };

  if (compact) {
    // 紧凑模式 - 只显示关键信息
    return (
      <div className="card-tracker-compact">
        <div className="tracker-header">
          <span>📊 记牌器</span>
          <span className="tracker-stats">
            已出 {stats.totalPlayed} | 剩余 {stats.remaining}
          </span>
        </div>
        <div className="tracker-grid-compact">
          {displayOrder.map(rank => {
            const count = remaining[rank] || 0;
            const colorClass = getCardColor(rank, count);
            return (
              <div 
                key={rank} 
                className={`tracker-item-compact ${colorClass}`}
                title={`${getRankDisplay(rank)}: 剩余${count}张`}
              >
                <span className="rank">{getRankDisplay(rank)}</span>
                <span className="count">{count}</span>
              </div>
            );
          })}
        </div>
        {stats.possibleBombs.length > 0 && (
          <div className="bomb-warning">
            💣 可能炸弹: {stats.possibleBombs.map(b => getRankDisplay(b.rank)).join('、')}
          </div>
        )}
      </div>
    );
  }

  // 完整模式
  return (
    <div className="card-tracker">
      <div className="tracker-header">
        <h3>📊 记牌器</h3>
        <div className="tracker-stats">
          <span>已出: {stats.totalPlayed}张</span>
          <span>剩余: {stats.remaining}张</span>
        </div>
      </div>

      {/* 剩余牌数量 */}
      <div className="tracker-section">
        <h4>剩余牌数</h4>
        <div className="tracker-grid">
          {displayOrder.map(rank => {
            const count = remaining[rank] || 0;
            const colorClass = getCardColor(rank, count);
            return (
              <div key={rank} className={`tracker-item ${colorClass}`}>
                <div className="rank-display">{getRankDisplay(rank)}</div>
                <div className="count-display">{count}</div>
                <div className="count-bar">
                  <div 
                    className="count-fill" 
                    style={{ width: `${(count / 8) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 各玩家出牌统计 */}
      <div className="tracker-section">
        <h4>出牌统计</h4>
        <div className="player-stats">
          {Object.entries(stats.byPlayer).map(([player, count]) => (
            <div key={player} className="player-stat">
              <span className="player-name">
                {player === 'south' ? '你' : 
                 player === 'north' ? '队友' : 
                 player === 'east' ? '东' : '西'}
              </span>
              <span className="player-count">{count}张</span>
            </div>
          ))}
        </div>
      </div>

      {/* 炸弹预警 */}
      {stats.possibleBombs.length > 0 && (
        <div className="tracker-section bomb-alert">
          <h4>💣 炸弹预警</h4>
          <div className="bomb-list">
            {stats.possibleBombs.map(bomb => (
              <div key={bomb.rank} className="bomb-item">
                <span className="bomb-rank">{getRankDisplay(bomb.rank)}</span>
                <span className="bomb-count">剩余{bomb.count}张</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
