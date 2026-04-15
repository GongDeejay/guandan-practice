import { useState, useCallback, useEffect } from 'react';
import './App.css';
import GameTable from './components/GameTable';
import AnalysisPanel from './components/AnalysisPanel';
import {
  createGameState, getAnalysis, confirmAnalysis, toggleCard,
  playerPlay, playerPass, processAITurn, startNewRound,
  nextGame, regroupHand
} from './game/engine';
import { PHASES } from './game/constants';

export default function App() {
  const [game, setGame] = useState(() => createGameState());
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    if (game.phase === PHASES.ANALYSIS) {
      setAnalysis(getAnalysis(game));
      setShowAnalysis(true);
    } else {
      setShowAnalysis(false);
    }
  }, [game.phase, game.playHistory.length]);

  useEffect(() => {
    if (game.phase === PHASES.AI_PLAYING) {
      const t = setTimeout(() => setGame(g => processAITurn(g)), 800 + Math.random() * 600);
      return () => clearTimeout(t);
    }
  }, [game.phase, game.currentTurn, game.playHistory.length]);

  const handleDeal = useCallback(() => setGame(g => startNewRound(g)), []);
  const handleConfirm = useCallback(() => { setShowAnalysis(false); setGame(g => confirmAnalysis(g)); }, []);
  const handleToggle = useCallback((idx) => setGame(g => toggleCard(g, idx)), []);
  const handlePlay = useCallback(() => setGame(g => playerPlay(g)), []);
  const handlePass = useCallback(() => setGame(g => playerPass(g)), []);
  const handleNewGame = useCallback(() => setGame(g => nextGame(g)), []);
  const handleRegroup = useCallback(() => setGame(g => regroupHand(g)), []);

  const canPlay = game.phase === PHASES.PLAYER_TURN && game.selectedCards.length > 0;
  const canPass = game.phase === PHASES.PLAYER_TURN && game.lastPlay && game.lastPlay.player !== 'south';

  return (
    <div className="app">
      <header className="app-header">
        <h1>🃏 掼蛋思维训练器</h1>
        <div className="header-info">
          {game.phase !== PHASES.DEALING && (
            <>
              <span className="level-badge">级别：{game.level}</span>
              <span className="team-score">南北 {game.levelWins.teamA} : {game.levelWins.teamB} 东西</span>
            </>
          )}
        </div>
      </header>

      <main className={`game-area ${showAnalysis ? 'with-panel' : ''}`}>
        <GameTable
          game={game}
          onToggleCard={handleToggle}
          onPlay={handlePlay}
          onPass={handlePass}
        />

        {/* 开始界面 */}
        {game.phase === PHASES.DEALING && (
          <div className="start-overlay">
            <div className="start-card">
              <h2>🃏 掼蛋思维训练器</h2>
              <p>经典108张掼蛋 · 出牌前训练牌局分析能力</p>
              <button className="btn-deal" onClick={handleDeal}>开始发牌</button>
            </div>
          </div>
        )}

        {/* 分析面板 —— 底部浮动，不遮挡任何玩家 */}
        {showAnalysis && analysis && (
          <AnalysisPanel
            analysis={analysis}
            onConfirm={handleConfirm}
            message={game.message}
          />
        )}

        {/* 局结束 */}
        {game.phase === PHASES.ROUND_END && (
          <div className="round-end-overlay">
            <div className="round-end-card">
              <h2>{game.message}</h2>
              <button onClick={handleNewGame} className="btn-primary">再来一局</button>
            </div>
          </div>
        )}
      </main>

      {/* 底部操作栏 */}
      <div className="bottom-bar">
        <div className="message-bar">{game.message}</div>
        <div className="action-buttons">
          {game.phase === PHASES.PLAYER_TURN && (
            <>
              <button className="btn-group" onClick={handleRegroup} title="重新整理手牌分组">🔄 整牌</button>
              <button className="btn-play" onClick={handlePlay} disabled={!canPlay}>出牌</button>
              <button className="btn-pass" onClick={handlePass} disabled={!canPass}>过</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
