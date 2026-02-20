import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useSafeAreaOffsets = () => {
  const insets = useSafeAreaInsets();

  return {
    leftOffset: Math.max(insets.left, 20),
    rightOffset: Math.max(insets.right, 20),
    topOffset: Math.max(insets.top, 10),
    bottomOffset: Math.max(insets.bottom, 10),
    insets,
  };
};
