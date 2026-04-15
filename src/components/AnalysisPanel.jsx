import { useState } from 'react';

export default function AnalysisPanel({ analysis, onConfirm, message }) {
  const [expanded, setExpanded] = useState(false);
  const { allInfo, keyInfo } = analysis;

  return (
    <div className="analysis-panel-bottom" onClick={e => e.stopPropagation()}>
      <div className="analysis-panel-scroll">
        <div className="ap-header">
          <h3>🧠 牌局分析</h3>
          <button className="btn-confirm" onClick={onConfirm}>我已分析，出牌 →</button>
        </div>

        <div className="ap-body">
          {/* 关键信息 */}
          <div className="ap-section key">
            {keyInfo.map((item, i) => <InfoCard key={i} item={item} highlighted />)}
            {keyInfo.length === 0 && <p className="ap-empty">暂无关键信息</p>}
          </div>

          {/* 全部信息 - 可展开 */}
          <div className="ap-section">
            <div className="ap-toggle" onClick={() => setExpanded(!expanded)}>
              📋 全部信息 {expanded ? '▲' : '▼'}
            </div>
            {expanded && (
              <div className="ap-grid">
                {allInfo.map((item, i) => <InfoCard key={i} item={item} />)}
              </div>
            )}
          </div>

          {/* 思考提示 */}
          <div className="ap-section think">
            <h4>💡 出牌前思考</h4>
            <div className="think-list">
              <span>我的炸弹能留到最后吗？</span>
              <span>对手还有多少牌？</span>
              <span>级牌出了几张？</span>
              <span>这手出大还是出小？</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ item, highlighted }) {
  return (
    <div className={`info-card ${highlighted ? 'highlighted' : ''}`}>
      <div className="ic-head">
        <span>{item.icon}</span><strong>{item.category}</strong>
      </div>
      {item.detail && <p className="ic-detail">{item.detail}</p>}
      {item.items && (
        <div className="ic-items">
          {item.items.map((s, i) => <span key={i}>{s}</span>)}
        </div>
      )}
    </div>
  );
}
