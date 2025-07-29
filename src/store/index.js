import { configureStore } from '@reduxjs/toolkit';
import gameSlice from './gameSlice';
import playersSlice from './playersSlice';
import connectionSlice from './connectionSlice';

export const store = configureStore({
  reducer: {
    game: gameSlice,
    players: playersSlice,
    connection: connectionSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;
