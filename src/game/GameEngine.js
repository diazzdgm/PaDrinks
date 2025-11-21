import DynamicsManager from './DynamicsManager';

class GameEngine {
  constructor() {
    this.dynamicsManager = new DynamicsManager();
    this.currentRound = 0;
    this.maxRounds = 50;
    this.totalRounds = 50;
    this.gamePhase = 'waiting'; // 'waiting', 'playing', 'paused', 'finished'
    this.gameStartTime = null;
    this.currentQuestion = null;
    this.roundHistory = [];
    this.dynamicAppearanceCount = {};
  }

  startGame(players = [], gameSettings = {}) {
    this.currentRound = 1;
    this.maxRounds = gameSettings.maxRounds || 50;
    this.totalRounds = this.maxRounds;
    this.gamePhase = 'playing';
    this.gameStartTime = Date.now();
    this.roundHistory = [];
    this.players = players;
    this.dynamicAppearanceCount = {};

    // Reset DynamicsManager para nuevo juego
    this.dynamicsManager.reset();
    console.log('🎮 DynamicsManager reseteado para nuevo juego');

    this.currentQuestion = this.getNextQuestion();

    return {
      success: true,
      gameState: this.getGameState(),
      question: this.currentQuestion
    };
  }

  getNextQuestion() {
    if (!this.dynamicsManager.hasMoreQuestions()) {
      return null;
    }

    const blockedDynamicIds = new Set();
    Object.entries(this.dynamicAppearanceCount).forEach(([dynamicId, count]) => {
      if (dynamicId === 'spin_bottle' && count >= 3) {
        console.log(`🚫 Bloqueando spin_bottle - Count: ${count}`);
        blockedDynamicIds.add(dynamicId);
      }
    });

    const question = this.dynamicsManager.getNextQuestion(blockedDynamicIds);

    if (question) {
      if (question.dynamicType === 'preference_vote' && question.genderRestriction) {
        const eligiblePlayers = this.filterPlayersByGender(question.genderRestriction);
        if (eligiblePlayers.length < 2) {
          return this.getNextQuestion();
        }
      }

      if (!this.dynamicAppearanceCount[question.dynamicId]) {
        this.dynamicAppearanceCount[question.dynamicId] = 0;
      }
      this.dynamicAppearanceCount[question.dynamicId] += 1;

      if (question.dynamicId === 'spin_bottle') {
        console.log(`🍾 Spin Bottle apareció - Count ahora: ${this.dynamicAppearanceCount[question.dynamicId]}`);
      }
    }

    return question;
  }

  filterPlayersByGender(genderRestriction) {
    if (!this.players || this.players.length === 0) {
      return [];
    }

    if (genderRestriction === 'all') {
      return this.players;
    }

    return this.players.filter(player => {
      if (genderRestriction === 'male') {
        return player.gender === 'Hombre' || player.gender === 'male';
      } else if (genderRestriction === 'female') {
        return player.gender === 'Mujer' || player.gender === 'female';
      }
      return true;
    });
  }

  nextRound() {
    if (this.gamePhase !== 'playing') {
      return { success: false, error: 'Game is not in playing state' };
    }

    this.currentRound += 1;

    if (this.currentRound > this.totalRounds) {
      return this.checkGameEnd();
    }

    this.currentQuestion = this.getNextQuestion();

    if (!this.currentQuestion && this.dynamicsManager.hasMoreQuestions()) {
      this.currentQuestion = this.getNextQuestion();
    }

    if (!this.currentQuestion) {
      return this.endGame('No more questions available');
    }

    return {
      success: true,
      gameState: this.getGameState(),
      question: this.currentQuestion
    };
  }

  skipDynamic() {
    if (this.gamePhase !== 'playing') {
      return { success: false, error: 'Game is not in playing state' };
    }

    this.currentQuestion = this.getNextQuestion();

    if (!this.currentQuestion) {
      if (this.currentRound >= this.totalRounds) {
        return this.checkGameEnd();
      } else {
        return this.endGame('No more questions available');
      }
    }

    return {
      success: true,
      gameState: this.getGameState(),
      question: this.currentQuestion
    };
  }

  checkGameEnd() {
    if (this.currentRound > this.totalRounds) {
      return {
        success: true,
        gameEnded: true,
        reason: 'rounds_completed',
        canExtend: true,
        gameState: this.getGameState()
      };
    }
    return { success: true, gameEnded: false };
  }

  extendGame(additionalRounds = 25) {
    this.totalRounds += additionalRounds;
    this.maxRounds = this.totalRounds;

    if (!this.currentQuestion) {
      this.currentQuestion = this.getNextQuestion();
    }

    return {
      success: true,
      newTotalRounds: this.totalRounds,
      gameState: this.getGameState(),
      question: this.currentQuestion
    };
  }

  pauseGame() {
    if (this.gamePhase === 'playing') {
      this.gamePhase = 'paused';
      return { success: true, gameState: this.getGameState() };
    }
    return { success: false, error: 'Game is not in playing state' };
  }

  resumeGame() {
    if (this.gamePhase === 'paused') {
      this.gamePhase = 'playing';
      return { success: true, gameState: this.getGameState() };
    }
    return { success: false, error: 'Game is not paused' };
  }

  endGame(reason = 'manual') {
    this.gamePhase = 'finished';
    const gameEndTime = Date.now();
    const gameDuration = gameEndTime - this.gameStartTime;

    return {
      success: true,
      gameEnded: true,
      reason,
      gameState: this.getGameState(),
      gameStats: {
        duration: gameDuration,
        roundsPlayed: this.currentRound - 1,
        totalRounds: this.totalRounds,
        questionsRemaining: this.dynamicsManager.getRemainingQuestionsCount()
      }
    };
  }

  addRoundResult(result) {
    this.roundHistory.push({
      round: this.currentRound,
      question: this.currentQuestion,
      result: result,
      timestamp: Date.now()
    });
  }

  getGameState() {
    return {
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      maxRounds: this.maxRounds,
      gamePhase: this.gamePhase,
      currentQuestion: this.currentQuestion,
      questionsRemaining: this.dynamicsManager.getRemainingQuestionsCount(),
      dynamicsStatus: this.dynamicsManager.getDynamicsStatus(),
      gameStartTime: this.gameStartTime,
      roundHistory: this.roundHistory
    };
  }

  updatePlayers(players) {
    this.players = players;
    return { success: true, players: this.players };
  }

  saveGameState() {
    return {
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      totalRounds: this.totalRounds,
      gamePhase: this.gamePhase,
      gameStartTime: this.gameStartTime,
      currentQuestion: this.currentQuestion,
      roundHistory: this.roundHistory,
      players: this.players,
      dynamicsState: this.dynamicsManager.saveState()
    };
  }

  loadGameState(savedState) {
    this.currentRound = savedState.currentRound || 0;
    this.maxRounds = savedState.maxRounds || 50;
    this.totalRounds = savedState.totalRounds || 50;
    this.gamePhase = savedState.gamePhase || 'waiting';
    this.gameStartTime = savedState.gameStartTime || null;
    this.currentQuestion = savedState.currentQuestion || null;
    this.roundHistory = savedState.roundHistory || [];
    this.players = savedState.players || [];

    if (savedState.dynamicsState) {
      this.dynamicsManager.loadState(savedState.dynamicsState);
    }

    return { success: true, gameState: this.getGameState() };
  }

  resetGame() {
    this.currentRound = 0;
    this.maxRounds = 50;
    this.totalRounds = 50;
    this.gamePhase = 'waiting';
    this.gameStartTime = null;
    this.currentQuestion = null;
    this.roundHistory = [];
    this.players = [];
    this.dynamicsManager.reset();

    return { success: true, gameState: this.getGameState() };
  }

  getAvailableDynamics() {
    return this.dynamicsManager.getDynamicsStatus();
  }
}

let gameEngineInstance = null;

export const getGameEngine = () => {
  if (!gameEngineInstance) {
    gameEngineInstance = new GameEngine();
  }
  return gameEngineInstance;
};

export const resetGameEngine = () => {
  gameEngineInstance = new GameEngine();
  return gameEngineInstance;
};

export default GameEngine;