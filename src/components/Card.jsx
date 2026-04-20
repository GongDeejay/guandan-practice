import { isRed, isWildCard } from '../game/constants';

/**
 * Card 组件 - 扑克牌显示
 * 
 * Props:
 * - card: 牌对象 { id, rank, suit, points }
 * - selected: 是否被选中
 * - onClick: 点击回调
 * - disabled: 是否禁用
 * - compact: 紧凑模式（小号牌）
 * - faceUp: 打出的牌模式
 * - level: 当前级别（用于判断百搭牌）
 * - stacked: 是否为堆叠中的上方牌
 * - stackIndex: 堆叠索引（用于计算偏移）
 */
export default function Card({ 
  card, 
  selected, 
  onClick, 
  disabled, 
  compact, 
  faceUp, 
  level, 
  stacked,
  stackIndex = 0 
}) {
  const red = isRed(card);
  const isJoker = card.rank === 'BJ' || card.rank === 'SJ';
  const isWild = level && isWildCard(card, level);

  const suitStr = isJoker ? card.suit : card.suit;
  const label = card.rank === 'BJ' ? '大王' : card.rank === 'SJ' ? '小王' : null;

  // 构建 class 名
  const cls = [
    compact ? 'card-mini' : faceUp ? 'card-face-up' : 'card',
    selected ? 'selected' : '',
    disabled ? 'disabled' : '',
    red ? 'red' : 'black',
    isJoker ? (card.rank === 'BJ' ? 'bj' : 'sj') : '',
    isWild ? 'wild' : '',
    stacked ? 'stacked' : '',
  ].filter(Boolean).join(' ');

  // 紧凑模式
  if (compact) {
    return (
      <span className={cls}>
        {label || `${card.suit}${card.rank}`}
      </span>
    );
  }

  // 打出的牌模式
  if (faceUp) {
    return (
      <div className={cls}>
        <span className="fu-rank">{isWild ? '配' : card.rank}</span>
        <span className="fu-suit">{suitStr}</span>
      </div>
    );
  }

  // 堆叠中的上方牌：只显示左上角点数和花色
  if (stacked) {
    return (
      <div 
        className={cls} 
        onClick={disabled ? undefined : onClick}
        style={{ '--stack-index': stackIndex }}
      >
        <div className="card-corner">
          <span className="card-rank">{isWild ? '配' : card.rank}</span>
          <span className="card-suit">{suitStr}</span>
        </div>
      </div>
    );
  }

  // 默认手牌模式
  return (
    <div className={cls} onClick={disabled ? undefined : onClick}>
      <div className="card-main">
        <span className="card-rank">{isWild ? '配' : card.rank}</span>
        <span className="card-suit">{suitStr}</span>
      </div>
    </div>
  );
}
