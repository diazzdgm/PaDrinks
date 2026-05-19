import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  scaleByContent,
  scaleBorder,
  isShortHeightDevice,
  isTablet,
} from '../../utils/responsive';

const DISMISS_KEY = 'padrinks_dismiss_install_banner';

const isStandalonePWA = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
};

const wasDismissedThisSession = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

export default function PWAInstallBanner({ visible = true }) {
  if (Platform.OS !== 'web') return null;

  useWindowDimensions();

  const isShortHeight = isShortHeightDevice();
  const isTabletScreen = isTablet();

  const styles = useMemo(
    () => createStyles({ isShortHeight, isTabletScreen }),
    [isShortHeight, isTabletScreen]
  );

  const deferredPromptRef = useRef(null);
  const [promptAvailable, setPromptAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(() => wasDismissedThisSession());

  useEffect(() => {
    if (isStandalonePWA()) return;

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setPromptAvailable(true);
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setPromptAvailable(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    try {
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        deferredPromptRef.current = null;
        setPromptAvailable(false);
      }
    } catch (_) {
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch (_) {}
    setDismissed(true);
  }, []);

  if (!visible) return null;
  if (!promptAvailable) return null;
  if (dismissed) return null;
  if (isStandalonePWA()) return null;

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <View style={styles.textColumn}>
          <Text style={styles.title}>PaDrinks</Text>
          <Text style={styles.subtitle}>Instálalo con un toque</Text>
        </View>
        <TouchableOpacity
          style={styles.installButton}
          onPress={handleInstall}
          activeOpacity={0.8}
        >
          <Text style={styles.installButtonText}>Install</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles({ isShortHeight, isTabletScreen }) {
  const cardHeight = isShortHeight ? 44 : isTabletScreen ? 64 : 54;
  const iconSize = isShortHeight ? 28 : isTabletScreen ? 42 : 34;
  const titleSize = scaleByContent(isShortHeight ? 13 : isTabletScreen ? 17 : 15, 'text');
  const subtitleSize = scaleByContent(isShortHeight ? 10 : isTabletScreen ? 13 : 11, 'text');
  const installFontSize = scaleByContent(isShortHeight ? 12 : isTabletScreen ? 16 : 14, 'text');

  return StyleSheet.create({
    cardWrapper: {
      alignItems: 'center',
      paddingHorizontal: scaleByContent(20, 'spacing'),
      marginBottom: scaleByContent(isShortHeight ? 8 : 12, 'spacing'),
    },
    card: {
      height: cardHeight,
      maxWidth: isTabletScreen ? 520 : 460,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: scaleBorder(2),
      borderColor: '#000000',
      borderRadius: scaleBorder(14),
      borderTopLeftRadius: scaleBorder(4),
      paddingHorizontal: isShortHeight ? 10 : 14,
      shadowColor: '#000',
      shadowOffset: {
        width: scaleByContent(3, 'spacing'),
        height: scaleByContent(3, 'spacing'),
      },
      shadowOpacity: 0.2,
      shadowRadius: scaleByContent(4, 'spacing'),
      elevation: 5,
      transform: [{ rotate: '0deg' }],
    },
    icon: {
      width: iconSize,
      height: iconSize,
      borderRadius: scaleBorder(6),
      marginRight: 10,
    },
    textColumn: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontFamily: 'Kalam-Bold',
      fontSize: titleSize,
      color: '#000000',
      lineHeight: titleSize * 1.15,
      includeFontPadding: false,
    },
    subtitle: {
      fontFamily: 'Kalam-Regular',
      fontSize: subtitleSize,
      color: '#000000',
      opacity: 0.7,
      lineHeight: subtitleSize * 1.25,
      includeFontPadding: false,
    },
    installButton: {
      backgroundColor: '#FFD54F',
      borderWidth: scaleBorder(1.5),
      borderColor: '#000000',
      borderRadius: scaleBorder(18),
      paddingHorizontal: isShortHeight ? 12 : 16,
      paddingVertical: isShortHeight ? 4 : 6,
      marginRight: 6,
    },
    installButtonText: {
      fontFamily: 'Kalam-Bold',
      fontSize: installFontSize,
      color: '#000000',
      includeFontPadding: false,
    },
    closeButton: {
      width: isShortHeight ? 26 : 30,
      height: isShortHeight ? 26 : 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontFamily: 'Kalam-Bold',
      fontSize: isShortHeight ? 20 : 24,
      color: '#000000',
      lineHeight: isShortHeight ? 22 : 26,
      includeFontPadding: false,
    },
  });
}
