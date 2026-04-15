import { useMemo } from 'react';
import { PHASES, PLAYER_NAMES, HAND_TYPES } from '../game/constants';
import { identifyHandType, canBeat } from '../game/rules';
import Card from './Card';

const POSITIONS = ['north', 'west', 'east', 'south'];

export default function GameTable({ game, onToggleCard, onPlay, onPass }) {
  const { hands, lastPlay, currentTurn, phase, selectedCards, playHistory } = game;

  // 计算每个位置最近一次出牌
  const recentPlays = useMemo(() => {
    const result = { east: null, south: null, west: null, north: null };
    for (let i = playHistory.length - 1; i >= 0; i--) {
      const play = playHistory[i];
      if (!result[play.player]) {
        result[play.player] = play;
      }
    }
    // 只保留新一轮内的出牌（清理后的上一轮）
    return result;
  }, [playHistory]);

  const isPlayerTurn = phase === PHASES.PLAYER_TURN;
  const canPlay = isPlayerTurn && selectedCards.length > 0;

  // 验证选中牌型
  const selectedType = useMemo(() => {
    if (selectedCards.length === 0) return null;
    const cards = selectedCards.map(i => hands.south[i]);
    return identifyHandType(cards, game.level);
  }, [selectedCards, hands.south, game.level]);

  const canBeatLast = useMemo(() => {
    if (!selectedType) return false;
    const cards = selectedCards.map(i => hands.south[i]);
    const play = { ...selectedType, cards };
    if (!lastPlay || !lastPlay.type || lastPlay.player === 'south') return true;
    return canBeat(lastPlay, play, game.level);
  }, [selectedType, selectedCards, hands.south, lastPlay, game.level]);

  return (
    <div className="game-table">
      {/* 北家 */}
      <div className="player-area north">
        <div className={`player-label ${currentTurn === 'north' ? 'active' : ''}`}>
          {PLAYER_NAMES.north} ({hands.north.length}张)
        </div>
        <div className="hand-compact">
          {hands.north.map((_, i) => (
            <div key={i} className="card-back-small" />
          ))}
        </div>
        <div className="played-zone">
          {recentPlays.north && <PlayedCardsDisplay play={recentPlays.north} />}
        </div>
      </div>

      {/* 西家 */}
      <div className="player-area west">
        <div className={`player-label ${currentTurn === 'west' ? 'active' : ''}`}>
          {PLAYER_NAMES.west} ({hands.west.length}张)
        </div>
        <div className="hand-compact vertical">
          {hands.west.map((_, i) => (
            <div key={i} className="card-back-small" />
          ))}
        </div>
        <div className="played-zone">
          {recentPlays.west && <PlayedCardsDisplay play={recentPlays.west} />}
        </div>
      </div>

      {/* 中央区域 */}
      <div className="table-center">
        <div className="level-indicator">
          <span>级牌</span>
          <strong>{game.level}</strong>
        </div>
        {lastPlay && lastPlay.type && (
          <div className="last-play-display">
            <span className="last-play-label">当前牌面</span>
            <div className="last-play-cards">
              {(lastPlay.cards || []).map((c, i) => (
                <Card key={i} card={c} compact />
              ))}
            </div>
            <span className="last-play-type">
              {PLAYER_NAMES[lastPlay.player]} · {getTypeName(lastPlay.type)}
            </span>
          </div>
        )}
      </div>

      {/* 东家 */}
      <div className="player-area east">
        <div className={`player-label ${currentTurn === 'east' ? 'active' : ''}`}>
          {PLAYER_NAMES.east} ({hands.east.length}张)
        </div>
        <div className="hand-compact vertical">
          {hands.east.map((_, i) => (
            <div key={i} className="card-back-small" />
          ))}
        </div>
        <div className="played-zone">
          {recentPlays.east && <PlayedCardsDisplay play={recentPlays.east} />}
        </div>
      </div>

      {/* 南家（玩家） */}
      <div className="player-area south">
        <div className={`player-label ${currentTurn === 'south' ? 'active' : ''}`}>
          {PLAYER_NAMES.south} ({hands.south.length}张)
        </div>
        <div className="player-hand">
          {hands.south.map((card, i) => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCards.includes(i)}
              onClick={() => isPlayerTurn && onToggleCard(i)}
              disabled={!isPlayerTurn}
            />
          ))}
        </div>
        <div className="played-zone">
          {recentPlays.south && <PlayedCardsDisplay play={recentPlays.south} />}
        </div>

        {/* 操作按钮 */}
        {isPlayerTurn && (
          <div className="action-buttons">
            <button
              className="btn-play"
              onClick={onPlay}
              disabled={selectedCards.length === 0}
            >
              出牌
              {selectedType && <span className="type-hint"> [{getTypeName(selectedType.type)}]</span>}
            </button>
            <button
              className="btn-pass"
              onClick={onPass}
              disabled={!lastPlay || lastPlay.player === 'south'}
            >
              过
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 显示已出的牌
function PlayedCardsDisplay({ play }) {
  return (
    <div className={`played-cards ${play.type === HAND_TYPES.BOMB_4 ? 'bomb' : ''}`}>
      {(play.cards || []).map((c, i) => (
        <Card key={i} card={c} compact />
      ))}
    </div>
  );
}

function getTypeName(type) {
  const map = {
    single: '单张', pair: '对子', triple: '三条',
    'triple+1': '三带一', 'triple+2': '三带二',
    straight: '顺子', consecutive_pairs: '连对',
    steel_plate: '钢板', straight_flush: '同花顺',
    bomb_4: '四炸', bomb_5: '五炸', bomb_6: '六炸', bomb_7: '七炸',
    four_joker: '四王炸',
  };
  return map[type] || type;
}
