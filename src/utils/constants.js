// Constantes globales de la aplicación
export const GAME_CONSTANTS = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 10,
  TIMER_DEFAULT: 30, // segundos
  ROOM_CODE_LENGTH: 5,
  
  // Tipos de juego
  GAME_MODES: {
    CLASSIC: 'classic',
    HOT: 'hot',
    EXTREME: 'extreme',
    COUPLES: 'couples',
  },
  
  // Estados del juego
  GAME_STATUS: {
    LOBBY: 'lobby',
    PLAYING: 'playing',
    PAUSED: 'paused',
    FINISHED: 'finished',
  },
  
  // Tipos de conexión
  CONNECTION_TYPES: {
    BLUETOOTH: 'bluetooth',
    WIFI: 'wifi',
    OFFLINE: 'offline',
  },
  
  // Tipos de dinámicas
  DYNAMIC_TYPES: {
    VOTING: 'voting',
    TIMER: 'timer',
    INTERACTIVE: 'interactive',
    QUESTION: 'question',
    CHALLENGE: 'challenge',
  },
  
  // Tipos de castigo
  SHOT_TYPES: {
    FULL: 'shot',
    HALF: 'half',
    SIP: 'sip',
    DOUBLE: 'double',
  },
};

export const DYNAMIC_NAMES = {
  TOUCH_FIRST: 'TouchFirst',
  SOCIAL_VOTING: 'SocialVoting',
  TAP_BATTLE: 'TapBattle',
  NEVER_HAVE_I: 'NeverHaveI',
  FUCK_MARRY_KILL: 'FuckMarryKill',
  HOT_POTATO: 'HotPotato',
  MYSTERY_BOX: 'MysteryBox',
  CULTURAL_TRIVIA: 'CulturalTrivia',
  CHALLENGE_OR_SHOT: 'ChallengeOrShot',
  CHARADES: 'Charades',
  PUSH_UPS: 'PushUps',
  VISIBLE_CONDITION: 'VisibleCondition',
  SILENT_ROUND: 'SilentRound',
  CONFESSIONS: 'Confessions',
  WHAT_DO_YOU_PREFER: 'WhatDoYouPrefer',
  FUNNY_SELFIE: 'FunnySelfie',
  UNCOMFORTABLE_QUESTIONS: 'UncomfortableQuestions',
  TRIVIA_COUNTDOWN: 'TriviaCountdown',
  FIND_COLOR: 'FindColor',
  DONT_LAUGH: 'DontLaugh',
  NICKNAME: 'Nickname',
  ROCK_PAPER_SCISSORS: 'RockPaperScissors',
  INFILTRATOR: 'Infiltrator',
  GUESS: 'Guess',
  BEER_PONG: 'BeerPong',
};

export const COLORS = {
  PRIMARY: '#FF7F11',
  SECONDARY: '#A8E10C',
  ACCENT: '#0EBDE1',
  TEXT: '#2E2E2E',
  BACKGROUND: '#F8F6F0',
  POST_IT_YELLOW: '#FFE082',
  POST_IT_GREEN: '#C8E6C9',
  POST_IT_PINK: '#F8BBD9',
  POST_IT_BLUE: '#BBDEFB',
};
