import whoIsMostData from '../data/dynamics/whoIsMost.json';
import whoIsMoreLikelyData from '../data/dynamics/whoIsMoreLikely.json';
import mentionChallengeData from '../data/dynamics/mentionChallenge.json';
import eliminationChallengeData from '../data/dynamics/eliminationChallenge.json';
import INeverNeverData from '../data/dynamics/INeverNever.json';
import awkwardQuestionsData from '../data/dynamics/awkwardQuestions.json';
import armWrestlingData from '../data/dynamics/armWrestling.json';
import rockPaperScissorsData from '../data/dynamics/rockPaperScissors.json';
import whatDoYouPreferData from '../data/dynamics/whatDoYouPrefer.json';
import challengeOrShotData from '../data/dynamics/challengeOrShot.json';
import headHeadSplashData from '../data/dynamics/headHeadSplash.json';

class DynamicsManager {
  constructor() {
    this.allDynamics = [
      whoIsMostData,
      whoIsMoreLikelyData,
      mentionChallengeData,
      eliminationChallengeData,
      INeverNeverData,
      awkwardQuestionsData,
      armWrestlingData,
      rockPaperScissorsData,
      whatDoYouPreferData,
      challengeOrShotData,
      headHeadSplashData
    ];

    this.availableDynamics = [...this.allDynamics];
    this.usedQuestions = {};
    this.lastDynamicId = null;

    this.initializeUsedQuestions();
  }

  initializeUsedQuestions() {
    this.allDynamics.forEach(dynamic => {
      this.usedQuestions[dynamic.id] = new Set();
    });
  }

  getRandomDynamic() {
    let availableForSelection = this.availableDynamics.filter(
      dynamic => dynamic.id !== this.lastDynamicId && this.hasAvailableQuestions(dynamic.id)
    );

    if (availableForSelection.length === 0) {
      availableForSelection = this.availableDynamics.filter(
        dynamic => this.hasAvailableQuestions(dynamic.id)
      );
    }

    if (availableForSelection.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableForSelection.length);
    const selectedDynamic = availableForSelection[randomIndex];

    this.lastDynamicId = selectedDynamic.id;
    return selectedDynamic;
  }

  getRandomQuestion(dynamicId) {
    const dynamic = this.allDynamics.find(d => d.id === dynamicId);
    if (!dynamic) return null;

    const usedQuestionIds = this.usedQuestions[dynamicId];
    const availableQuestions = dynamic.questions.filter(
      question => !usedQuestionIds.has(question.id)
    );

    if (availableQuestions.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const selectedQuestion = availableQuestions[randomIndex];

    if (dynamic.type !== 'paired_challenge' && dynamic.type !== 'preference_vote') {
      this.markQuestionAsUsed(dynamicId, selectedQuestion.id);
    }

    return {
      ...selectedQuestion,
      dynamicId: dynamic.id,
      dynamicName: dynamic.name,
      dynamicInstruction: dynamic.instruction,
      dynamicType: dynamic.type
    };
  }

  markQuestionAsUsed(dynamicId, questionId) {
    this.usedQuestions[dynamicId].add(questionId);

    if (!this.hasAvailableQuestions(dynamicId)) {
      this.removeDynamicFromAvailable(dynamicId);
    }
  }

  hasAvailableQuestions(dynamicId) {
    const dynamic = this.allDynamics.find(d => d.id === dynamicId);
    if (!dynamic) return false;

    const usedCount = this.usedQuestions[dynamicId].size;
    return usedCount < dynamic.questions.length;
  }

  removeDynamicFromAvailable(dynamicId) {
    this.availableDynamics = this.availableDynamics.filter(
      dynamic => dynamic.id !== dynamicId
    );
  }

  getNextQuestion() {
    const selectedDynamic = this.getRandomDynamic();
    if (!selectedDynamic) {
      return null;
    }

    return this.getRandomQuestion(selectedDynamic.id);
  }

  hasMoreQuestions() {
    return this.availableDynamics.length > 0;
  }

  getRemainingQuestionsCount() {
    let totalRemaining = 0;
    this.availableDynamics.forEach(dynamic => {
      const usedCount = this.usedQuestions[dynamic.id].size;
      totalRemaining += (dynamic.questions.length - usedCount);
    });
    return totalRemaining;
  }

  getDynamicsStatus() {
    return this.allDynamics.map(dynamic => ({
      id: dynamic.id,
      name: dynamic.name,
      totalQuestions: dynamic.questions.length,
      usedQuestions: this.usedQuestions[dynamic.id].size,
      remainingQuestions: dynamic.questions.length - this.usedQuestions[dynamic.id].size,
      isAvailable: this.availableDynamics.some(d => d.id === dynamic.id)
    }));
  }

  reset() {
    this.availableDynamics = [...this.allDynamics];
    this.initializeUsedQuestions();
    this.lastDynamicId = null;
  }

  saveState() {
    return {
      usedQuestions: Object.fromEntries(
        Object.entries(this.usedQuestions).map(([key, set]) => [key, Array.from(set)])
      ),
      lastDynamicId: this.lastDynamicId,
      availableDynamics: this.availableDynamics.map(d => d.id)
    };
  }

  loadState(state) {
    if (state.usedQuestions) {
      this.usedQuestions = Object.fromEntries(
        Object.entries(state.usedQuestions).map(([key, array]) => [key, new Set(array)])
      );
    }

    if (state.lastDynamicId) {
      this.lastDynamicId = state.lastDynamicId;
    }

    if (state.availableDynamics) {
      this.availableDynamics = this.allDynamics.filter(
        dynamic => state.availableDynamics.includes(dynamic.id)
      );
    }
  }
}

export default DynamicsManager;