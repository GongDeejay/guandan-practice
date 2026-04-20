import { useState, useCallback, useEffect } from 'react';
import './App.css';
import GameTable from './components/GameTable';
import AnalysisPanel from './components/AnalysisPanel';
import PracticePanel from './components/PracticePanel';
import {
  createGameState, getAnalysis, confirmAnalysis, toggleCard,
  playerPlay, playerPass, processAITurn, startNewRound,
  nextGame, regroupHand
} from './game/engine';
import { PHASES } from './game/constants';
import { PRACTICE_MODES, PAUSE_TYPES, PracticeManager } from './game/practice';

export default function App() {
  const [game, setGame] = useState(() => createGameState());
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // 练习模式状态
  const [practiceManager] = useState(() => new PracticeManager(PRACTICE_MODES.BEGINNER));
  const [isPaused, setIsPaused] = useState(false);
  const [pauseType, setPauseType] = useState(null);

  useEffect(() => {
    if (game.phase === PHASES.ANALYSIS) {
      setAnalysis(getAnalysis(game));
      setShowAnalysis(true);
    } else {
      setShowAnalysis(false);
    }
  }, [game.phase, game.playHistory.length]);

  // AI自动出牌（暂停时不自动出牌）
  useEffect(() => {
    if (game.phase === PHASES.AI_PLAYING && !isPaused) {
      const t = setTimeout(() => setGame(g => processAITurn(g)), 800 + Math.random() * 600);
      return () => clearTimeout(t);
    }
  }, [game.phase, game.currentTurn, game.playHistory.length, isPaused]);

  // 玩家回合自动暂停（初级模式）
  useEffect(() => {
    if (game.phase === PHASES.PLAYER_TURN && 
        practiceManager.mode === PRACTICE_MODES.BEGINNER && 
        !isPaused) {
      // 自动暂停让玩家思考
      handlePause(PAUSE_TYPES.PLAYER_TURN);
    }
  }, [game.phase]);

  const handleDeal = useCallback(() => setGame(g => startNewRound(g)), []);
  const handleConfirm = useCallback(() => { setShowAnalysis(false); setGame(g => confirmAnalysis(g)); }, []);
  const handleToggle = useCallback((idx) => {
    if (isPaused) return; // 暂停时不允许操作
    setGame(g => toggleCard(g, idx));
  }, [isPaused]);
  const handlePlay = useCallback(() => {
    if (isPaused) return;
    setGame(g => playerPlay(g));
    // 出牌后恢复暂停状态
    if (pauseType === PAUSE_TYPES.PLAYER_TURN) {
      setIsPaused(false);
      setPauseType(null);
    }
  }, [isPaused, pauseType]);
  const handlePass = useCallback(() => {
    if (isPaused) return;
    setGame(g => playerPass(g));
    // 过牌后恢复暂停状态
    if (pauseType === PAUSE_TYPES.PLAYER_TURN) {
      setIsPaused(false);
      setPauseType(null);
    }
  }, [isPaused, pauseType]);
  const handleNewGame = useCallback(() => setGame(g => nextGame(g)), []);
  const handleRegroup = useCallback(() => {
    if (isPaused) return;
    setGame(g => regroupHand(g));
  }, [isPaused]);

  // 暂停功能
  const handlePause = useCallback((type = PAUSE_TYPES.PLAYER_REQUEST) => {
    setIsPaused(true);
    setPauseType(type);
    practiceManager.pause(type);
  }, [practiceManager]);

  // 继续功能
  const handleResume = useCallback(() => {
    setIsPaused(false);
    setPauseType(null);
    practiceManager.resume();
  }, [practiceManager]);

  // 切换练习模式
  const handleModeChange = useCallback((mode) => {
    practiceManager.setMode(mode);
    // 如果切换到自由模式，取消自动暂停
    if (mode === PRACTICE_MODES.FREE || mode === PRACTICE_MODES.ADVANCED) {
      setIsPaused(false);
      setPauseType(null);
    }
  }, [practiceManager]);

  const canPlay = game.phase === PHASES.PLAYER_TURN && game.selectedCards.length > 0 && !isPaused;
  const canPass = game.phase === PHASES.PLAYER_TURN && game.lastPlay && game.lastPlay.player !== 'south' && !isPaused;

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

        {/* 练习面板 */}
        {game.phase !== PHASES.DEALING && game.phase !== PHASES.ROUND_END && (
          <PracticePanel
            game={game}
            practiceManager={practiceManager}
            onPause={handlePause}
            onResume={handleResume}
            onModeChange={handleModeChange}
            isPaused={isPaused}
          />
        )}

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

        {/* 暂停遮罩 */}
        {isPaused && pauseType === PAUSE_TYPES.PLAYER_REQUEST && (
          <div className="pause-overlay" onClick={handleResume}>
            <div className="pause-message">
              <span>⏸️ 游戏暂停</span>
              <span>点击任意位置继续</span>
            </div>
          </div>
        )}
      </main>

      {/* 底部操作栏 */}
      <div className="bottom-bar">
        <div className="message-bar">
          {isPaused ? '⏸️ 已暂停 - 查看右侧提示' : game.message}
        </div>
        <div className="action-buttons">
          {game.phase === PHASES.PLAYER_TURN && (
            <>
              <button 
                className="btn-group" 
                onClick={handleRegroup} 
                disabled={isPaused}
                title="重新整理手牌分组"
              >
                🔄 整牌
              </button>
              <button 
                className="btn-play" 
                onClick={handlePlay} 
                disabled={!canPlay}
              >
                出牌
              </button>
              <button 
                className="btn-pass" 
                onClick={handlePass} 
                disabled={!canPass}
              >
                过
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
