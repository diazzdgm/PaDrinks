import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isNative = Platform.OS !== 'web';

let _Haptics = null;
if (Platform.OS !== 'web') {
  _Haptics = require('expo-haptics');
}

export const Haptics = _Haptics || {
  impactAsync: async () => {},
  notificationAsync: async () => {},
  selectionAsync: async () => {},
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Error: 'Error', Warning: 'Warning' },
};

const SANITIZE_REPLACEMENTS = [
  [/Nadie toma/g, 'Nadie recibe strike'],
  [/toman un shot/g, 'reciben un strike'],
  [/toman un trago/g, 'reciben un strike'],
  [/toman shot/g, 'reciben strike'],
  [/toman trago/g, 'reciben strike'],
  [/toma un shot/g, 'recibe un strike'],
  [/toma un trago/g, 'recibe un strike'],
  [/toma shot/g, 'recibe strike'],
  [/toma trago/g, 'recibe strike'],
  [/tomar un shot/g, 'recibir un strike'],
  [/tomar un trago/g, 'recibir un strike'],
  [/tomar shot/g, 'recibir strike'],
  [/tomar trago/g, 'recibir strike'],
  [/tomense fondo de su trago/g, 'Dense un fondo de su bebida'],
  [/si fallas, ¡bebes!/g, 'si fallas, ¡Strike!'],
  [/date un shot/g, 'un strike'],
  [/Date un shot/g, 'Un strike'],
  [/reparte shot/g, 'reparte strike'],
  [/Reparte shot/g, 'Reparte strike'],
  [/shot o trago/g, 'strike'],
  [/Shot o trago/g, 'Strike'],
  [/doble shot/g, 'doble strike'],
  [/Doble shot/g, 'Doble strike'],
  [/shots/g, 'strikes'],
  [/Shots/g, 'Strikes'],
  [/shot/g, 'strike'],
  [/Shot/g, 'Strike'],
  [/tragos/g, 'strikes'],
  [/Tragos/g, 'Strikes'],
  [/trago/g, 'strike'],
  [/Trago/g, 'Strike'],
];

export function sanitizeText(text) {
  if (isWeb || !text) return text;
  let result = text;
  for (const [pattern, replacement] of SANITIZE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
