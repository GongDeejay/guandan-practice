import { useState } from 'react';

export default function AnalysisPanel({ analysis, onConfirm, message }) {
  const [expanded, setExpanded] = useState(true);
  const { allInfo, keyInfo } = analysis;

  return (
    <div className="analysis-overlay">
      <div className="analysis-panel">
        <div className="analysis-header">
          <h3>🧠 牌局分析</h3>
          <p className="analysis-prompt">{message}</p>
        </div>

        {/* 关键信息高亮 */}
        {keyInfo.length > 0 && (
          <div className="key-info-section">
            <h4>⚡ 关键信息</h4>
            {keyInfo.map((item, i) => (
              <InfoCard key={i} item={item} highlighted />
            ))}
          </div>
        )}

        {/* 全部信息 */}
        <div className="all-info-section">
          <div className="section-toggle" onClick={() => setExpanded(!expanded)}>
            <h4>📋 全部牌局信息 {expanded ? '▼' : '▶'}</h4>
          </div>
          {expanded && (
            <div className="info-grid">
              {allInfo.map((item, i) => (
                <InfoCard key={i} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* 思考提示 */}
        <div className="think-prompts">
          <h4>💡 出牌前思考</h4>
          <ul>
            <li>我的炸弹能留到最后吗？</li>
            <li>对手还有多少牌？谁即将出完？</li>
            <li>级牌我出了几张？对手手里可能有吗？</li>
            <li>这手牌是出大还是出小？</li>
          </ul>
        </div>

        <button className="btn-confirm" onClick={onConfirm}>
          我已分析，开始出牌 →
        </button>
      </div>
    </div>
  );
}

function InfoCard({ item, highlighted }) {
  return (
    <div className={`info-card ${highlighted ? 'highlighted' : ''}`}>
      <div className="info-card-header">
        <span className="info-icon">{item.icon}</span>
        <span className="info-category">{item.category}</span>
      </div>
      {item.detail && <p className="info-detail">{item.detail}</p>}
      {item.items && (
        <ul className="info-items">
          {item.items.map((sub, i) => (
            <li key={i}>{sub}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
