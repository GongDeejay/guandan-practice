import { useMemo } from 'react';
import { PHASES, PLAYER_NAMES, HAND_TYPES } from '../game/constants';
import { identifyHandType } from '../game/rules';
import Card from './Card';

const SIDE_MAX_PLAYS = 4; // 左右侧玩家最多展示几轮出牌
const SOUTH_MAX_PLAYS = 5; // 南家最多展示几轮出牌

export default function GameTable({ game, onToggleCard }) {
  const { hands, lastPlay, currentTurn, phase, selectedCards, playHistory, cardGroups } = game;

  // 按玩家分组所有出牌历史
  const playsByPlayer = useMemo(() => {
    const r = { east: [], south: [], west: [], north: [] };
    playHistory.forEach(p => { if (r[p.player]) r[p.player].push(p); });
    return r;
  }, [playHistory]);

  const isPlayerTurn = phase === PHASES.PLAYER_TURN;

  // 按 rank 分组玩家手牌
  const groupedByRank = useMemo(() => {
    const map = {};
    hands.south.forEach((card, idx) => {
      if (!map[card.rank]) map[card.rank] = [];
      map[card.rank].push({ card, idx });
    });
    const order = Object.keys(map).sort((a, b) => getRankSortValue(b, game.level) - getRankSortValue(a, game.level));
    return order.map(rank => map[rank]);
  }, [hands.south, game.level]);

  return (
    <div className="game-table">
      {/* 北 */}
      <div className="player-area north">
        <PlayerLabel name={PLAYER_NAMES.north} count={hands.north.length} active={currentTurn === 'north'} />
        <HandBacks cards={hands.north} direction="h" />
        <PlayerPlayedStack plays={playsByPlayer.north} limit={SIDE_MAX_PLAYS} />
      </div>

      {/* 西 */}
      <div className="player-area west">
        <PlayerLabel name={PLAYER_NAMES.west} count={hands.west.length} active={currentTurn === 'west'} />
        <HandBacks cards={hands.west} direction="v" />
        <PlayerPlayedStack plays={playsByPlayer.west} limit={SIDE_MAX_PLAYS} />
      </div>

      {/* 中心 */}
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
        <HandBacks cards={hands.east} direction="v" />
        <PlayerPlayedStack plays={playsByPlayer.east} limit={SIDE_MAX_PLAYS} />
      </div>

      {/* 南（玩家） */}
      <div className="player-area south">
        <PlayerLabel name={PLAYER_NAMES.south} count={hands.south.length} active={currentTurn === 'south'} />

        {/* 分组标签 */}
        {phase !== PHASES.DEALING && cardGroups?.length > 0 && (
          <div className="group-tags">
            {cardGroups.map((g, gi) => (
              <span key={gi} className={`group-tag ${g.type}`}>{g.label}</span>
            ))}
          </div>
        )}

        {/* 手牌：同 rank 竖排叠放 */}
        <div className="player-hand">
          {groupedByRank.map((sameRank, gi) => (
            <div key={gi} className="rank-stack">
              {sameRank.map(({ card, idx }) => (
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

        <PlayerPlayedStack plays={playsByPlayer.south} limit={SOUTH_MAX_PLAYS} />
      </div>
    </div>
  );
}

// ===== 子组件 =====

function PlayerLabel({ name, count, active }) {
  return (
    <div className={`player-label ${active ? 'active' : ''}`}>
      {name} <span className="card-count">{count}张</span>
    </div>
  );
}

function HandBacks({ cards, direction }) {
  const cls = direction === 'v' ? 'hand-compact vertical' : 'hand-compact';
  return (
    <div className={cls}>
      {cards.map((_, i) => <div key={i} className={`card-back-small${direction === 'v' ? ' v' : ''}`} />)}
    </div>
  );
}

// 展示某玩家所有出过的牌（每轮一组）
function PlayerPlayedStack({ plays, limit }) {
  if (!plays || plays.length === 0) return <div className="played-zone empty" />;
  const show = plays.slice(-limit);
  return (
    <div className="player-played-stack">
      {show.map((play, i) => {
        const isBomb = play.type?.startsWith('bomb') || play.type === 'straight_flush' || play.type === 'four_joker';
        return (
          <div key={i} className={`played-round ${isBomb ? 'bomb' : ''}`}>
            {(play.cards || []).map((c, j) => <Card key={j} card={c} faceUp />)}
          </div>
        );
      })}
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
