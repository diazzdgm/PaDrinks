import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import {
  scaleByContent,
  scaleBorder,
  isSmallDevice,
  isTablet,
  isShortHeightDevice,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from '../../utils/responsive';

const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();

const notebookLineSpacing = isTabletScreen ? 15 : scaleByContent(25, 'spacing');
const notebookLineCount = Math.ceil(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / notebookLineSpacing) + 2;

const DOT_STATES = ['', '.', '..', '...'];

const LoadingOverlay = ({ visible }) => {
  const [dotIndex, setDotIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setDotIndex(prev => (prev + 1) % DOT_STATES.length);
    }, 400);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.paperBackground}>
        <View style={styles.notebookLines}>
          {[...Array(notebookLineCount)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.line,
                { top: notebookLineSpacing + index * notebookLineSpacing },
              ]}
            />
          ))}
        </View>
        <View style={styles.redMarginLine} />
      </View>

      <View style={styles.centerContent}>
        <Text style={styles.loadingText}>
          {'Cargando' + DOT_STATES[dotIndex]}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999996,
    backgroundColor: '#F8F6F0',
  },

  paperBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F6F0',
  },

  notebookLines: {
    position: 'absolute',
    top: 0,
    left: scaleByContent(100, 'spacing'),
    right: scaleByContent(20, 'spacing'),
    bottom: 0,
  },

  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: scaleBorder(1),
    backgroundColor: '#A8C8EC',
    opacity: 0.4,
  },

  redMarginLine: {
    position: 'absolute',
    left: scaleByContent(95, 'spacing'),
    top: 0,
    bottom: 0,
    width: scaleBorder(2),
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: isShortHeight
      ? scaleByContent(22, 'text')
      : isTabletScreen
      ? scaleByContent(32, 'text')
      : scaleByContent(28, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    transform: [{ rotate: '0deg' }],
  },
});

export default LoadingOverlay;
