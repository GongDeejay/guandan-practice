import { isRed } from '../game/constants';

export default function Card({ card, selected, onClick, disabled, compact }) {
  const red = isRed(card);
  const isJoker = card.rank === 'BJ' || card.rank === 'SJ';

  if (compact) {
    return (
      <span className={`card-mini ${red ? 'red' : 'black'} ${isJoker ? (card.rank === 'BJ' ? 'bj' : 'sj') : ''}`}>
        {cardLabel(card)}
      </span>
    );
  }

  return (
    <div
      className={`card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${red ? 'red' : 'black'} ${isJoker ? (card.rank === 'BJ' ? 'bj' : 'sj') : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{isJoker ? card.suit : card.suit}</span>
    </div>
  );
}

function cardLabel(card) {
  if (card.rank === 'BJ') return '大王';
  if (card.rank === 'SJ') return '小王';
  return `${card.suit}${card.rank}`;
}
