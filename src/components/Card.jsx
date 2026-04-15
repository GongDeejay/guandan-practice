import { isRed } from '../game/constants';

/**
 * faceUp = true → 打出的牌（小号，露数字花色）
 * compact = true → 中央区域/上一轮牌面（更小）
 * default → 手牌（可选中、可点击）
 */
export default function Card({ card, selected, onClick, disabled, compact, faceUp }) {
  const red = isRed(card);
  const isJoker = card.rank === 'BJ' || card.rank === 'SJ';

  const suitStr = isJoker ? card.suit : card.suit;
  const label = card.rank === 'BJ' ? '大王' : card.rank === 'SJ' ? '小王' : null;

  const cls = [
    compact ? 'card-mini' : faceUp ? 'card-face-up' : 'card',
    selected ? 'selected' : '',
    disabled ? 'disabled' : '',
    red ? 'red' : 'black',
    isJoker ? (card.rank === 'BJ' ? 'bj' : 'sj') : '',
  ].filter(Boolean).join(' ');

  if (compact) {
    return (
      <span className={cls}>
        {label || `${card.suit}${card.rank}`}
      </span>
    );
  }

  if (faceUp) {
    return (
      <div className={cls}>
        <span className="fu-rank">{card.rank}</span>
        <span className="fu-suit">{suitStr}</span>
      </div>
    );
  }

  return (
    <div className={cls} onClick={disabled ? undefined : onClick}>
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{suitStr}</span>
    </div>
  );
}
