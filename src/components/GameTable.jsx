import { useMemo } from 'react';
import { PHASES, PLAYER_NAMES, HAND_TYPES } from '../game/constants';
import { identifyHandType } from '../game/rules';
import Card from './Card';

const SIDE_MAX_PLAYS = 3; // 左右侧玩家最多展示几轮出牌
const SOUTH_MAX_PLAYS = 4; // 南家最多展示几轮出牌

export default function GameTable({ game, onToggleCard }) {
  const { hands, lastPlay, currentTurn, phase, selectedCards, playHistory, cardGroups } = game;

  // 按玩家分组所有出牌历史
  const playsByPlayer = useMemo(() => {
    const r = { east: [], south: [], west: [], north: [] };
    playHistory.forEach(p => { if (r[p.player]) r[p.player].push(p); });
    return r;
  }, [playHistory]);

  const isPlayerTurn = phase === PHASES.PLAYER_TURN;

  // 按 rank 分组玩家手牌（从大到小排序）
  // 排序顺序：大王、小王、百搭牌、A、K、Q、J、10、9…2
  const groupedByRank = useMemo(() => {
    const map = {};
    hands.south.forEach((card, idx) => {
      if (!map[card.rank]) map[card.rank] = [];
      map[card.rank].push({ card, idx });
    });
    
    // 定义排序顺序
    const rankOrder = ['BJ', 'SJ', 'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    // 获取排序值
    const getSortValue = (rank) => {
      const idx = rankOrder.indexOf(rank);
      if (idx !== -1) return idx;
      // 如果是级牌，排在小王之后
      if (rank === game.level) return 2;
      return 99;
    };
    
    // 按排序顺序排列
    const sortedRanks = Object.keys(map).sort((a, b) => getSortValue(a) - getSortValue(b));
    
    return sortedRanks.map(rank => map[rank]);
  }, [hands.south, game.level]);

  // 为其他三家按 rank 分组手牌（用于垂直叠放显示）
  const groupCardsByRank = (cards) => {
    const map = {};
    cards.forEach((card, idx) => {
      if (!map[card.rank]) map[card.rank] = [];
      map[card.rank].push({ card, idx });
    });
    
    const rankOrder = ['BJ', 'SJ', 'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const getSortValue = (rank) => {
      const idx = rankOrder.indexOf(rank);
      if (idx !== -1) return idx;
      if (rank === game.level) return 2;
      return 99;
    };
    
    const sortedRanks = Object.keys(map).sort((a, b) => getSortValue(a) - getSortValue(b));
    return sortedRanks.map(rank => map[rank]);
  };

  return (
    <div className="game-table">
      {/* 北 */}
      <div className="player-area north">
        <PlayerLabel name={PLAYER_NAMES.north} count={hands.north.length} active={currentTurn === 'north'} />
        <HandStacked cards={hands.north} level={game.level} groupCardsByRank={groupCardsByRank} />
        <PlayerPlayedStack plays={playsByPlayer.north} limit={SIDE_MAX_PLAYS} />
      </div>

      {/* 西 */}
      <div className="player-area west">
        <PlayerLabel name={PLAYER_NAMES.west} count={hands.west.length} active={currentTurn === 'west'} />
        <HandStackedVertical cards={hands.west} level={game.level} groupCardsByRank={groupCardsByRank} />
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
        <HandStackedVertical cards={hands.east} level={game.level} groupCardsByRank={groupCardsByRank} />
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

        {/* 手牌：垂直分层码牌布局 */}
        <div className="player-hand-stacked">
          {groupedByRank.map((sameRank, gi) => (
            <div key={gi} className="rank-column">
              {sameRank.map(({ card, idx }, cardIdx) => (
                <Card
                  key={card.id}
                  card={card}
                  selected={selectedCards.includes(idx)}
                  onClick={() => isPlayerTurn && onToggleCard(idx)}
                  disabled={!isPlayerTurn}
                  level={game.level}
                  stacked={cardIdx > 0}
                  stackIndex={cardIdx}
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

// 北家的牌 - 水平垂直叠放
function HandStacked({ cards, level, groupCardsByRank }) {
  const grouped = groupCardsByRank(cards);
  return (
    <div className="hand-stacked-horizontal">
      {grouped.map((sameRank, gi) => (
        <div key={gi} className="rank-column-mini">
          {sameRank.map(({ card }, cardIdx) => (
            <Card
              key={card.id}
              card={card}
              level={level}
              stacked={cardIdx > 0}
              stackIndex={cardIdx}
              mini
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// 东西家的牌 - 垂直叠放
function HandStackedVertical({ cards, level, groupCardsByRank }) {
  const grouped = groupCardsByRank(cards);
  return (
    <div className="hand-stacked-vertical">
      {grouped.map((sameRank, gi) => (
        <div key={gi} className="rank-column-mini-vertical">
          {sameRank.map(({ card }, cardIdx) => (
            <Card
              key={card.id}
              card={card}
              level={level}
              stacked={cardIdx > 0}
              stackIndex={cardIdx}
              mini
            />
          ))}
        </div>
      ))}
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
