import { useState, useCallback, useEffect } from 'react';
import './App.css';
import GameTable from './components/GameTable';
import AnalysisPanel from './components/AnalysisPanel';
import { createGameState, getAnalysis, confirmAnalysis, toggleCard, playerPlay, playerPass, processAITurn, newGame } from './game/engine';
import { PHASES, PLAYER_NAMES } from './game/constants';

export default function App() {
  const [game, setGame] = useState(() => createGameState());
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // 进入分析阶段时生成分析数据
  useEffect(() => {
    if (game.phase === PHASES.ANALYSIS) {
      const data = getAnalysis(game);
      setAnalysis(data);
      setShowAnalysis(true);
    } else {
      setShowAnalysis(false);
    }
  }, [game.phase, game.playHistory.length]);

  // AI 自动出牌（延迟模拟思考）
  useEffect(() => {
    if (game.phase === PHASES.AI_PLAYING) {
      const timer = setTimeout(() => {
        setGame(g => processAITurn(g));
      }, 800 + Math.random() * 600);
      return () => clearTimeout(timer);
    }
  }, [game.phase, game.currentTurn, game.playHistory.length]);

  const handleConfirmAnalysis = useCallback(() => {
    setGame(g => confirmAnalysis(g));
    setShowAnalysis(false);
  }, []);

  const handleToggleCard = useCallback((idx) => {
    setGame(g => toggleCard(g, idx));
  }, []);

  const handlePlay = useCallback(() => {
    setGame(g => playerPlay(g));
  }, []);

  const handlePass = useCallback(() => {
    setGame(g => playerPass(g));
  }, []);

  const handleNewGame = useCallback(() => {
    setGame(g => newGame(g));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🃏 掼蛋思维训练器</h1>
        <div className="header-info">
          <span className="level-badge">级别：{game.level}</span>
          <span className="team-score">南北 {game.levelWins.teamA} : {game.levelWins.teamB} 东西</span>
        </div>
      </header>

      <main className="game-area">
        <GameTable
          game={game}
          onToggleCard={handleToggleCard}
          onPlay={handlePlay}
          onPass={handlePass}
        />

        {showAnalysis && analysis && (
          <AnalysisPanel
            analysis={analysis}
            onConfirm={handleConfirmAnalysis}
            message={game.message}
          />
        )}

        {game.phase === PHASES.ROUND_END && (
          <div className="round-end-overlay">
            <div className="round-end-card">
              <h2>{game.message}</h2>
              <button onClick={handleNewGame} className="btn-primary">再来一局</button>
            </div>
          </div>
        )}
      </main>

      <div className="message-bar">{game.message}</div>
    </div>
  );
}
