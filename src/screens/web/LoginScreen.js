import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../styles/theme';
import {
  scaleByContent,
  scaleBorder,
  isSmallDevice,
  isTablet,
  isShortHeightDevice,
} from '../../utils/responsive';
import AuthService from '../../services/AuthService';

const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();

const GoogleLogo = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <Path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <Path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <Path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </Svg>
);

const AppleLogo = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 384 512">
    <Path
      fill="#FFFFFF"
      d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
    />
  </Svg>
);

const LoginScreen = ({ navigation }) => {
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let done = false;
    const goMain = () => {
      if (done) return;
      done = true;
      navigation.reset({ index: 0, routes: [{ name: 'MainMenu' }] });
    };

    if (Platform.OS !== 'web') {
      goMain();
      return;
    }

    const unsubscribe = AuthService.onAuthStateChange((session) => {
      if (session) goMain();
    });

    AuthService.getSession().then((session) => {
      if (session) {
        goMain();
        return;
      }
      const href = typeof window !== 'undefined' ? window.location.href : '';
      const midExchange = /[?&#](code|access_token)=/.test(href);
      if (!midExchange) setChecking(false);
    });

    const timer = setTimeout(() => setChecking(false), 4000);
    return () => {
      clearTimeout(timer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    await AuthService.signInWithGoogle();
  };

  const handleApple = async () => {
    if (busy) return;
    setBusy(true);
    await AuthService.signInWithApple();
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Cargando…</Text>
        </View>
      </View>
    );
  }

  const logoSize = scaleByContent(18, 'icon');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../../assets/images/PADRINKS.logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Inicia sesión para jugar</Text>
        <Text style={styles.subtitle}>
          Guarda tu progreso y tu suscripción en este dispositivo.
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.googleButton, busy && styles.buttonDisabled]}
            onPress={handleGoogle}
            activeOpacity={0.85}
            disabled={busy}
          >
            <GoogleLogo size={logoSize} />
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.appleButton, busy && styles.buttonDisabled]}
            onPress={handleApple}
            activeOpacity={0.85}
            disabled={busy}
          >
            <AppleLogo size={logoSize} />
            <Text style={styles.appleButtonText}>Continuar con Apple</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingBox: {
    alignItems: 'center',
  },

  loadingText: {
    marginTop: scaleByContent(12, 'spacing'),
    fontSize: scaleByContent(15, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
  },

  content: {
    width: isSmallScreen ? '86%' : '70%',
    maxWidth: scaleByContent(420, 'interactive'),
    alignItems: 'center',
  },

  logo: {
    width: isShortHeight ? scaleByContent(120, 'hero') : scaleByContent(160, 'hero'),
    height: isShortHeight ? scaleByContent(60, 'hero') : scaleByContent(80, 'hero'),
    marginBottom: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(16, 'spacing'),
  },

  title: {
    fontSize: isShortHeight ? scaleByContent(20, 'text') : scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
  },

  subtitle: {
    fontSize: isShortHeight ? scaleByContent(13, 'text') : scaleByContent(15, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#444444',
    textAlign: 'center',
    marginBottom: isShortHeight ? scaleByContent(18, 'spacing') : scaleByContent(28, 'spacing'),
  },

  buttons: {
    width: '100%',
    alignItems: 'stretch',
  },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scaleByContent(48, 'interactive'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(1),
    borderColor: '#747775',
    borderRadius: scaleBorder(24),
    paddingHorizontal: scaleByContent(16, 'spacing'),
    marginBottom: scaleByContent(14, 'spacing'),
  },

  googleButtonText: {
    fontSize: scaleByContent(15, 'text'),
    fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontWeight: '500',
    color: '#1F1F1F',
    marginLeft: scaleByContent(12, 'spacing'),
  },

  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scaleByContent(48, 'interactive'),
    backgroundColor: '#000000',
    borderRadius: scaleBorder(24),
    paddingHorizontal: scaleByContent(16, 'spacing'),
  },

  appleButtonText: {
    fontSize: scaleByContent(15, 'text'),
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: scaleByContent(10, 'spacing'),
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});

export default LoginScreen;
