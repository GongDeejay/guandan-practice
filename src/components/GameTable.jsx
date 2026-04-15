import { useMemo } from 'react';
import { PHASES, PLAYER_NAMES, HAND_TYPES } from '../game/constants';
import { identifyHandType, canBeat } from '../game/rules';
import Card from './Card';

export default function GameTable({ game, onToggleCard, onPlay, onPass }) {
  const { hands, lastPlay, currentTurn, phase, selectedCards, playHistory, cardGroups } = game;

  const recentPlays = useMemo(() => {
    const result = { east: null, south: null, west: null, north: null };
    for (let i = playHistory.length - 1; i >= 0; i--) {
      const p = playHistory[i];
      if (!result[p.player]) result[p.player] = p;
    }
    return result;
  }, [playHistory]);

  const isPlayerTurn = phase === PHASES.PLAYER_TURN;

  const selectedType = useMemo(() => {
    if (selectedCards.length === 0) return null;
    return identifyHandType(selectedCards.map(i => hands.south[i]), game.level);
  }, [selectedCards, hands.south, game.level]);

  // 按 rank 将牌分组成竖排
  const groupedByRank = useMemo(() => {
    const map = {};
    hands.south.forEach((card, idx) => {
      if (!map[card.rank]) map[card.rank] = [];
      map[card.rank].push({ card, idx });
    });
    // 排序：级牌>A>K>...>2
    const order = Object.keys(map).sort((a, b) => {
      const va = getRankSortValue(a, game.level);
      const vb = getRankSortValue(b, game.level);
      return vb - va;
    });
    return order.map(rank => map[rank]);
  }, [hands.south, game.level]);

  return (
    <div className="game-table">
      {/* 北 */}
      <div className="player-area north">
        <PlayerLabel name={PLAYER_NAMES.north} count={hands.north.length} active={currentTurn === 'north'} />
        <div className="hand-compact">
          {hands.north.map((_, i) => <div key={i} className="card-back-small" />)}
        </div>
        <div className="played-zone">{recentPlays.north && <PlayedCardsDisplay play={recentPlays.north} />}</div>
      </div>

      {/* 西 */}
      <div className="player-area west">
        <PlayerLabel name={PLAYER_NAMES.west} count={hands.west.length} active={currentTurn === 'west'} />
        <div className="hand-compact vertical">
          {hands.west.map((_, i) => <div key={i} className="card-back-small v" />)}
        </div>
        <div className="played-zone">{recentPlays.west && <PlayedCardsDisplay play={recentPlays.west} />}</div>
      </div>

      {/* 中 */}
      <div className="table-center">
        <div className="level-indicator"><span>级牌</span><strong>{game.level}</strong></div>
        {lastPlay?.type && (
          <div className="last-play-display">
            <span className="last-play-label">当前牌面</span>
            <div className="last-play-cards">
              {(lastPlay.cards || []).map((c, i) => <Card key={i} card={c} compact />)}
            </div>
            <span className="last-play-type">{PLAYER_NAMES[lastPlay.player]} · {getTypeName(lastPlay.type)}</span>
          </div>
        )}
      </div>

      {/* 东 */}
      <div className="player-area east">
        <PlayerLabel name={PLAYER_NAMES.east} count={hands.east.length} active={currentTurn === 'east'} />
        <div className="hand-compact vertical">
          {hands.east.map((_, i) => <div key={i} className="card-back-small v" />)}
        </div>
        <div className="played-zone">{recentPlays.east && <PlayedCardsDisplay play={recentPlays.east} />}</div>
      </div>

      {/* 南（玩家手牌） */}
      <div className="player-area south">
        <PlayerLabel name={PLAYER_NAMES.south} count={hands.south.length} active={currentTurn === 'south'} />

        {/* 分组标签 */}
        {phase !== PHASES.DEALING && cardGroups && cardGroups.length > 0 && (
          <div className="group-tags">
            {cardGroups.map((g, gi) => {
              const isBomb = g.type === 'bomb' || g.type === 'four_joker';
              return (
                <span key={gi} className={`group-tag ${isBomb ? 'bomb' : g.type}`}>
                  {g.label}
                </span>
              );
            })}
          </div>
        )}

        {/* 手牌：同rank竖排叠放 */}
        <div className="player-hand">
          {groupedByRank.map((sameRankCards, gi) => (
            <div key={gi} className="rank-stack">
              {sameRankCards.map(({ card, idx }) => (
                <Card
                  key={card.id}
                  card={card}
                  selected={selectedCards.includes(idx)}
                  onClick={() => isPlayerTurn && onToggleCard(idx)}
                  disabled={!isPlayerTurn}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="played-zone">{recentPlays.south && <PlayedCardsDisplay play={recentPlays.south} />}</div>
      </div>
    </div>
  );
}

function PlayerLabel({ name, count, active }) {
  return (
    <div className={`player-label ${active ? 'active' : ''}`}>
      {name} <span className="card-count">{count}张</span>
    </div>
  );
}

function PlayedCardsDisplay({ play }) {
  const isBomb = play.type?.startsWith('bomb') || play.type === 'straight_flush' || play.type === 'four_joker';
  return (
    <div className={`played-cards ${isBomb ? 'bomb' : ''}`}>
      {(play.cards || []).map((c, i) => <Card key={i} card={c} compact />)}
    </div>
  );
}

function getTypeName(type) {
  const map = {
    single: '单张', pair: '对子', triple: '三条',
    'triple+1': '三带一', 'triple+2': '三带二',
    straight: '顺子', consecutive_pairs: '连对', steel_plate: '钢板',
    straight_flush: '同花顺', bomb_4: '四炸', bomb_5: '五炸',
    bomb_6: '六炸', bomb_7: '七炸', four_joker: '四王炸',
  };
  return map[type] || type;
}

function getRankSortValue(rank, level) {
  if (rank === 'BJ') return 17;
  if (rank === 'SJ') return 16;
  if (rank === level) return 15;
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  if (rank === '10') return 10;
  return parseInt(rank) || 0;
}
