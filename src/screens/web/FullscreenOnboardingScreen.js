import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../styles/theme';
import PWAInstallBanner from './PWAInstallBanner';
import {
  scaleByContent,
  scaleBorder,
  isShortHeightDevice,
  isTablet,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from '../../utils/responsive';

// COLOCA LOS ARCHIVOS DE TUTORIAL EN assets/videos/ ANTES DE LANZAR:
// assets/videos/tutorial-ios.mp4 y assets/videos/tutorial-android.mp4
let iosVideoSrc = null;
let androidVideoSrc = null;
try {
  iosVideoSrc = require('../../../assets/videos/tutorial-ios.mp4');
} catch (_) {}
try {
  androidVideoSrc = require('../../../assets/videos/tutorial-android.mp4');
} catch (_) {}

if (Platform.OS !== 'web') {
  module.exports = () => null;
}

const IOS_STEPS = [
  { text: 'Toca el botón de compartir del navegador', icon: 'share' },
  { text: 'Baja y toca "Agregar a pantalla de inicio"' },
  { text: 'Toca "Agregar" en la esquina superior derecha' },
];

const ANDROID_STEPS = [
  { text: 'Toca el menú de Chrome (tres puntos en la esquina superior derecha)' },
  { text: 'Selecciona "Pantalla completa" o "Agregar a inicio"' },
  { text: '¡Listo! Abre PaDrinks desde tu inicio' },
];

const VideoOrEmpty = ({ src, styles }) => {
  const [hasError, setHasError] = useState(!src);

  if (hasError || !src) {
    return <View style={styles.videoEmpty} />;
  }

  return Platform.OS === 'web' ? (
    <video
      src={typeof src === 'string' ? src : src.uri || src}
      autoPlay
      loop
      muted
      playsInline
      style={styles.videoElement}
      onError={() => setHasError(true)}
    />
  ) : null;
};

const NotebookBackground = ({ styles, notebookLineSpacing, notebookLineCount }) => (
  <View style={styles.paperBackground}>
    <View style={styles.notebookLines}>
      {[...Array(notebookLineCount)].map((_, i) => (
        <View
          key={i}
          style={[styles.line, { top: notebookLineSpacing + i * notebookLineSpacing }]}
        />
      ))}
    </View>
    <View style={styles.redMarginLine} />
    <View style={styles.holesPunch}>
      {[...Array(8)].map((_, i) => (
        <View key={i} style={styles.hole} />
      ))}
    </View>
  </View>
);

const TapeStrip = ({ styles }) => (
  <View style={styles.tape} />
);

const AppleLogo = ({ size, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
    />
  </Svg>
);

const AndroidLogo = ({ size, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M17.523 15.341c-.531 0-.962-.43-.962-.962s.43-.962.962-.962.962.43.962.962-.43.962-.962.962m-11.046 0c-.531 0-.962-.43-.962-.962s.43-.962.962-.962.962.43.962.962-.43.962-.962.962m11.39-6.064l1.92-3.327a.4.4 0 0 0-.146-.546.4.4 0 0 0-.546.146l-1.945 3.37c-1.486-.679-3.155-1.058-4.196-1.058s-2.71.38-4.196 1.058L6.81 5.55a.4.4 0 0 0-.547-.146.4.4 0 0 0-.145.546l1.92 3.327c-3.292 1.794-5.547 5.135-5.547 8.886h19.018c0-3.751-2.255-7.092-5.547-8.886"
    />
  </Svg>
);

const ShareIcon = ({ size, color = '#1A6FE0' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M12 2L8 6h3v9h2V6h3l-4-4zM18 9h-2v2h2v9H6v-9h2V9H6c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2z"
    />
  </Svg>
);

const OSCard = React.memo(({ osKey, label, onPress, cardStyle, styles, isShortHeight, isTabletScreen }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const logoSize = scaleByContent(isShortHeight ? 56 : isTabletScreen ? 80 : 70, 'icon');

  return (
    <Animated.View style={[styles.osCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.osCard, cardStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <TapeStrip styles={styles} />
        {osKey === 'ios' ? <AppleLogo size={logoSize} /> : <AndroidLogo size={logoSize} />}
        <Text style={styles.cardLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function FullscreenOnboardingScreen({ onDismiss }) {
  if (Platform.OS !== 'web') return null;

  useWindowDimensions();

  const isShortHeight = isShortHeightDevice();
  const isTabletScreen = isTablet();
  const notebookLineSpacing = isTabletScreen ? 15 : scaleByContent(25, 'spacing');
  const notebookLineCount = Math.ceil(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / notebookLineSpacing) + 2;
  const inlineShareIconSize = scaleByContent(isShortHeight ? 16 : 20, 'icon');

  const styles = useMemo(
    () => createStyles({ isShortHeight, isTabletScreen, notebookLineSpacing, inlineShareIconSize }),
    [isShortHeight, isTabletScreen, notebookLineSpacing, inlineShareIconSize]
  );

  const [selectedOS, setSelectedOS] = useState(null);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const viewAOpacity = useRef(new Animated.Value(1)).current;
  const viewBOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const selectOS = useCallback((os) => {
    Animated.timing(viewAOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setSelectedOS(os);
      Animated.timing(viewBOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [viewAOpacity, viewBOpacity]);

  const goBack = useCallback(() => {
    Animated.timing(viewBOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setSelectedOS(null);
      Animated.timing(viewAOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [viewAOpacity, viewBOpacity]);

  const handleSkip = useCallback(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('padrinks_skip_fullscreen_onboarding', 'true');
    }
    onDismiss();
  }, [onDismiss]);

  const steps = selectedOS === 'ios' ? IOS_STEPS : ANDROID_STEPS;
  const videoSrc = selectedOS === 'ios' ? iosVideoSrc : androidVideoSrc;

  const bannerTitleA = 'Juega PaDrinks en Pantalla Completa';

  const bannerTitleB = selectedOS === 'ios' ? 'Cómo agregar PaDrinks a inicio' : 'Cómo activar pantalla completa';
  const bannerSubtitleB = selectedOS === 'ios' ? 'En Safari — iPhone / iPad' : 'En Chrome — Android';

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      <NotebookBackground styles={styles} notebookLineSpacing={notebookLineSpacing} notebookLineCount={notebookLineCount} />

      {selectedOS === null ? (
        <Animated.View style={[styles.fullArea, { opacity: viewAOpacity }]} pointerEvents={selectedOS === null ? 'auto' : 'none'}>
          <View style={[styles.bannerContainer, styles.bannerContainerA]}>
            <Text style={styles.bannerTitle}>{bannerTitleA}</Text>
          </View>

          <View style={[styles.cardsRow, isTabletScreen && styles.cardsRowTablet]}>
            <OSCard
              osKey="ios"
              label="iPhone"
              cardStyle={styles.iosCard}
              onPress={() => selectOS('ios')}
              styles={styles}
              isShortHeight={isShortHeight}
              isTabletScreen={isTabletScreen}
            />
            <OSCard
              osKey="android"
              label="Android"
              cardStyle={styles.androidCard}
              onPress={() => selectOS('android')}
              styles={styles}
              isShortHeight={isShortHeight}
              isTabletScreen={isTabletScreen}
            />
          </View>

          <TouchableOpacity style={styles.skipLink} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipLinkText}>Jugar con barra de navegación (funciona igual)</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      {selectedOS !== null ? (
        <Animated.View style={[styles.fullArea, { opacity: viewBOpacity }]} pointerEvents={selectedOS !== null ? 'auto' : 'none'}>
          <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>

          <View style={[styles.bannerContainer, styles.bannerContainerB]}>
            <Text style={styles.bannerTitle}>{bannerTitleB}</Text>
            <Text style={styles.bannerSubtitleBare}>{bannerSubtitleB}</Text>
          </View>

          <PWAInstallBanner visible={selectedOS === 'android'} />

          <View style={[styles.tutorialRow, isTabletScreen && styles.tutorialRowTablet]}>
            <View style={styles.videoSide}>
              <View style={styles.videoFrame}>
                <VideoOrEmpty src={videoSrc} styles={styles} />
              </View>
            </View>

            <View style={styles.instructionsSide}>
              <Text style={styles.stepsIntro}>Sigue estos pasos:</Text>
              {steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                  <Text style={styles.stepText}>
                    {step.text}
                    {step.icon === 'share' && (
                      <Text>
                        {' '}
                        <View style={styles.inlineShareIcon}>
                          <ShareIcon size={inlineShareIconSize} />
                        </View>
                      </Text>
                    )}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.skipLink} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipLinkText}>Jugar con barra de navegación (funciona igual)</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function createStyles({ isShortHeight, isTabletScreen, notebookLineSpacing, inlineShareIconSize }) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: '#F8F6F0',
    },

    fullArea: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: scaleByContent(isShortHeight ? 12 : 20, 'spacing'),
      paddingTop: scaleByContent(isShortHeight ? 10 : 16, 'spacing'),
      paddingBottom: scaleByContent(isShortHeight ? 32 : 44, 'spacing'),
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
      height: scaleByContent(1, 'spacing'),
      backgroundColor: '#A8C8EC',
      opacity: 0.6,
    },

    redMarginLine: {
      position: 'absolute',
      left: scaleByContent(95, 'spacing'),
      top: 0,
      bottom: 0,
      width: scaleByContent(2, 'spacing'),
      backgroundColor: '#FF6B6B',
      opacity: 0.5,
    },

    holesPunch: {
      position: 'absolute',
      left: scaleByContent(30, 'spacing'),
      top: scaleByContent(60, 'spacing'),
      bottom: scaleByContent(60, 'spacing'),
      width: scaleByContent(25, 'spacing'),
      justifyContent: 'space-around',
      alignItems: 'center',
    },

    hole: {
      width: scaleByContent(18, 'spacing'),
      height: scaleByContent(18, 'spacing'),
      borderRadius: scaleBorder(10),
      backgroundColor: '#FFFFFF',
      borderWidth: scaleBorder(2),
      borderColor: '#D0D0D0',
      shadowColor: '#000',
      shadowOffset: {
        width: scaleByContent(2, 'spacing'),
        height: scaleByContent(2, 'spacing'),
      },
      shadowOpacity: 0.3,
      shadowRadius: scaleByContent(4, 'spacing'),
      elevation: 3,
    },

    bannerContainer: {
      alignItems: 'center',
      marginBottom: scaleByContent(isShortHeight ? 12 : 20, 'spacing'),
    },

    bannerContainerA: {
      marginTop: isShortHeight ? 30 : isTabletScreen ? 140 : 100,
    },

    bannerContainerB: {
      marginTop: isShortHeight ? 10 : isTabletScreen ? 30 : 20,
    },

    bannerTitle: {
      fontFamily: 'Kalam-Bold',
      fontSize: scaleByContent(isShortHeight ? 22 : isTabletScreen ? 30 : 26, 'text'),
      color: '#000000',
      textAlign: 'center',
      includeFontPadding: false,
    },

    bannerSubtitleBare: {
      fontFamily: 'Kalam-Regular',
      fontSize: scaleByContent(isShortHeight ? 13 : isTabletScreen ? 18 : 16, 'text'),
      color: '#2E2E2E',
      textAlign: 'center',
      marginTop: scaleByContent(4, 'spacing'),
      includeFontPadding: false,
    },

    cardsRow: {
      flex: 1,
      flexDirection: 'row',
      gap: scaleByContent(24, 'spacing'),
      alignItems: 'center',
      justifyContent: 'center',
    },

    cardsRowTablet: {
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    },

    osCardWrapper: {
      width: scaleByContent(isShortHeight ? 130 : isTabletScreen ? 200 : 170, 'interactive'),
      aspectRatio: 1,
    },

    osCard: {
      flex: 1,
      borderWidth: scaleBorder(3),
      borderColor: '#000000',
      borderRadius: scaleBorder(20),
      borderTopLeftRadius: scaleBorder(5),
      paddingVertical: scaleByContent(isShortHeight ? 12 : 18, 'spacing'),
      paddingHorizontal: scaleByContent(12, 'spacing'),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: {
        width: scaleByContent(4, 'spacing'),
        height: scaleByContent(4, 'spacing'),
      },
      shadowOpacity: 0.25,
      shadowRadius: scaleByContent(8, 'spacing'),
      elevation: 8,
      overflow: 'visible',
    },

    iosCard: {
      backgroundColor: '#FFE082',
      transform: [{ rotate: '-2deg' }],
    },

    androidCard: {
      backgroundColor: '#C8E6C9',
      transform: [{ rotate: '2deg' }],
    },

    cardLabel: {
      fontFamily: 'Kalam-Bold',
      fontSize: scaleByContent(isShortHeight ? 16 : isTabletScreen ? 22 : 20, 'text'),
      color: '#000000',
      marginTop: scaleByContent(isShortHeight ? 8 : 12, 'spacing'),
      includeFontPadding: false,
      textAlign: 'center',
    },

    tape: {
      position: 'absolute',
      top: scaleByContent(-10, 'spacing'),
      alignSelf: 'center',
      width: scaleByContent(60, 'spacing'),
      height: scaleByContent(16, 'spacing'),
      backgroundColor: 'rgba(255, 255, 200, 0.75)',
      borderWidth: scaleBorder(1),
      borderColor: 'rgba(0,0,0,0.15)',
      borderRadius: scaleBorder(3),
      transform: [{ rotate: '-1deg' }],
      zIndex: 2,
      left: '50%',
      marginLeft: scaleByContent(-30, 'spacing'),
    },

    skipLink: {
      position: 'absolute',
      bottom: scaleByContent(isShortHeight ? 8 : 14, 'spacing'),
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingVertical: scaleByContent(6, 'spacing'),
    },

    skipLinkText: {
      fontFamily: 'Kalam-Regular',
      fontSize: scaleByContent(12, 'text'),
      color: '#666666',
      textDecorationLine: 'underline',
      includeFontPadding: false,
    },

    backButton: {
      position: 'absolute',
      top: scaleByContent(isShortHeight ? 8 : 16, 'spacing'),
      left: scaleByContent(20, 'spacing'),
      zIndex: 10,
      backgroundColor: '#FFFFFF',
      borderWidth: scaleBorder(2),
      borderColor: '#000000',
      borderRadius: scaleBorder(12),
      borderTopLeftRadius: scaleBorder(4),
      paddingVertical: scaleByContent(6, 'spacing'),
      paddingHorizontal: scaleByContent(14, 'spacing'),
      minHeight: 44,
      shadowColor: '#000',
      shadowOffset: {
        width: scaleByContent(2, 'spacing'),
        height: scaleByContent(2, 'spacing'),
      },
      shadowOpacity: 0.2,
      shadowRadius: scaleByContent(3, 'spacing'),
      elevation: 3,
      transform: [{ rotate: '0deg' }],
      justifyContent: 'center',
      alignItems: 'center',
    },

    backButtonText: {
      fontFamily: 'Kalam-Bold',
      fontSize: scaleByContent(14, 'text'),
      color: '#000000',
      includeFontPadding: false,
    },

    tutorialRow: {
      flex: 1,
      flexDirection: 'row',
      gap: scaleByContent(16, 'spacing'),
      alignItems: 'center',
    },

    tutorialRowTablet: {
      maxWidth: 800,
      alignSelf: 'center',
      width: '100%',
    },

    videoSide: {
      flex: 1.1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    videoFrame: {
      backgroundColor: '#FFFFFF',
      borderWidth: scaleBorder(3),
      borderColor: '#000000',
      borderRadius: scaleBorder(16),
      borderTopLeftRadius: scaleBorder(5),
      padding: scaleByContent(10, 'spacing'),
      shadowColor: '#000',
      shadowOffset: {
        width: scaleByContent(5, 'spacing'),
        height: scaleByContent(5, 'spacing'),
      },
      shadowOpacity: 0.3,
      shadowRadius: scaleByContent(8, 'spacing'),
      elevation: 8,
      transform: [{ rotate: '0deg' }],
      width: '100%',
      overflow: 'hidden',
    },

    videoElement: {
      width: '100%',
      height: isShortHeight ? 230 : isTabletScreen ? 400 : 320,
      borderRadius: scaleBorder(10),
      backgroundColor: '#FFFFFF',
      display: 'block',
    },

    videoEmpty: {
      width: '100%',
      height: isShortHeight ? 230 : isTabletScreen ? 400 : 320,
      backgroundColor: '#FFFFFF',
      borderRadius: scaleBorder(10),
    },

    inlineShareIcon: {
      width: inlineShareIconSize,
      height: inlineShareIconSize,
      ...(Platform.OS === 'web' && { verticalAlign: 'middle', display: 'inline-block' }),
    },

    instructionsSide: {
      flex: 0.9,
      justifyContent: 'center',
    },

    stepsIntro: {
      fontFamily: 'Kalam-Bold',
      fontSize: scaleByContent(isShortHeight ? 14 : 17, 'text'),
      color: '#2E2E2E',
      marginBottom: scaleByContent(isShortHeight ? 8 : 12, 'spacing'),
      includeFontPadding: false,
    },

    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: scaleByContent(isShortHeight ? 6 : 10, 'spacing'),
    },

    stepNum: {
      fontFamily: 'Kalam-Bold',
      fontSize: scaleByContent(isShortHeight ? 13 : 16, 'text'),
      color: '#FF7F11',
      marginRight: scaleByContent(8, 'spacing'),
      minWidth: 18,
      includeFontPadding: false,
    },

    stepText: {
      fontFamily: 'Kalam-Regular',
      fontSize: scaleByContent(isShortHeight ? 12 : 15, 'text'),
      color: '#2E2E2E',
      flex: 1,
      lineHeight: scaleByContent(isShortHeight ? 16 : 20, 'text'),
      includeFontPadding: false,
    },
  });
}
