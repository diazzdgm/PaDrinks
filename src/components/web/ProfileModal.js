import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import audioService from '../../services/AudioService';
import { Haptics } from '../../utils/platform';
import { theme } from '../../styles/theme';
import {
  scaleByContent,
  scaleBorder,
  isSmallDevice,
  isTablet,
  isShortHeightDevice,
  SCREEN_HEIGHT,
} from '../../utils/responsive';

const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();

const ProfileModal = ({
  visible,
  email,
  isPremium,
  loading,
  onCancelSubscription,
  onUpgrade,
  onLogout,
  onClose,
}) => {
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      modalAnim.setValue(0);
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const animateOut = (callback, duration) => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration,
      useNativeDriver: true,
    }).start(() => callback());
  };

  const handlePrimaryAction = () => {
    if (loading) return;
    audioService.playSoundEffect('beer');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    if (isPremium) {
      animateOut(() => onCancelSubscription(), 100);
    } else {
      animateOut(() => onUpgrade(), 100);
    }
  };

  const handleLogout = () => {
    audioService.playSoundEffect('wine');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    animateOut(() => onLogout(), 150);
  };

  const handleClose = () => {
    audioService.playSoundEffect('wine');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    animateOut(() => onClose(), 150);
  };

  if (!visible) return null;

  return (
    <View style={styles.absoluteModalOverlay}>
      <View style={styles.modalWrapper}>
        <Animated.View
          style={[styles.modalContainer, { opacity: modalAnim }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.modalPaperBackground}>
            <View style={styles.modalNotebookLines}>
              {[...Array(15)].map((_, index) => (
                <View
                  key={index}
                  style={[styles.modalLine, { top: 20 + index * 20 }]}
                />
              ))}
            </View>
            <View style={styles.modalRedMarginLine} />
          </View>

          <TouchableOpacity
            style={styles.closeX}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeXText}>{'✕'}</Text>
          </TouchableOpacity>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.modalTitle}>{'Perfil'}</Text>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{'Cuenta:'}</Text>
              <View style={[styles.badge, styles.badgeEmail]}>
                <Text
                  style={styles.badgeText}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {email || '—'}
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{'Suscripción:'}</Text>
              <View
                style={[
                  styles.badge,
                  isPremium ? styles.badgePremium : styles.badgeFree,
                ]}
              >
                <Text style={styles.badgeText}>
                  {isPremium ? 'Premium' : 'Free'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isPremium ? styles.primaryButtonCancel : styles.primaryButtonUpgrade,
                ]}
                onPress={handlePrimaryAction}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Cargando…' : isPremium ? 'Cancelar' : 'Premium'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutButtonText}>{'Cerrar sesión'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999994,
  },

  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: isSmallScreen ? '88%' : '72%',
    maxWidth: isTabletScreen ? scaleByContent(500, 'spacing') : undefined,
    maxHeight: SCREEN_HEIGHT * 0.9,
    backgroundColor: '#F8F6F0',
    borderRadius: scaleBorder(20),
    borderTopLeftRadius: scaleBorder(5),
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: {
      width: scaleByContent(6, 'spacing'),
      height: scaleByContent(6, 'spacing'),
    },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(10, 'spacing'),
    elevation: 10,
    transform: [{ rotate: '0deg' }],
    overflow: 'hidden',
  },

  modalPaperBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F6F0',
    borderRadius: scaleBorder(17),
    borderTopLeftRadius: scaleBorder(2),
    overflow: 'hidden',
  },

  modalNotebookLines: {
    position: 'absolute',
    top: 0,
    left: 60,
    right: 15,
    bottom: 0,
  },

  modalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.4,
  },

  modalRedMarginLine: {
    position: 'absolute',
    left: 55,
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },

  closeX: {
    position: 'absolute',
    top: scaleByContent(10, 'spacing'),
    right: scaleByContent(14, 'spacing'),
    zIndex: 10,
    padding: scaleByContent(6, 'spacing'),
  },

  closeXText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#555555',
  },

  modalScroll: {
    flexShrink: 1,
  },

  modalContent: {
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingTop: isShortHeight
      ? scaleByContent(28, 'spacing')
      : scaleByContent(36, 'spacing'),
    paddingBottom: isShortHeight
      ? scaleByContent(14, 'spacing')
      : scaleByContent(22, 'spacing'),
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: isShortHeight
      ? scaleByContent(20, 'text')
      : scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: isShortHeight
      ? scaleByContent(12, 'spacing')
      : scaleByContent(20, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  infoSection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingLeft: 38,
    marginBottom: isShortHeight
      ? scaleByContent(10, 'spacing')
      : scaleByContent(16, 'spacing'),
    gap: scaleByContent(8, 'spacing'),
  },

  infoLabel: {
    fontSize: isShortHeight
      ? scaleByContent(13, 'text')
      : scaleByContent(15, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },

  infoValue: {
    flex: 1,
    fontSize: isShortHeight
      ? scaleByContent(13, 'text')
      : scaleByContent(15, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#333333',
  },

  badge: {
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(10),
    paddingVertical: scaleByContent(3, 'spacing'),
    paddingHorizontal: scaleByContent(10, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  badgePremium: {
    backgroundColor: theme.colors.postItGreen,
  },

  badgeFree: {
    backgroundColor: theme.colors.postItYellow,
  },

  badgeEmail: {
    flexShrink: 1,
    backgroundColor: '#FFFFFF',
  },

  badgeText: {
    fontSize: isShortHeight
      ? scaleByContent(12, 'text')
      : scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },

  primaryButton: {
    minHeight: scaleByContent(44, 'interactive'),
    marginLeft: 'auto',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(12),
    borderTopLeftRadius: scaleBorder(3),
    paddingVertical: scaleByContent(6, 'spacing'),
    paddingHorizontal: scaleByContent(16, 'spacing'),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: scaleByContent(2, 'spacing'),
      height: scaleByContent(2, 'spacing'),
    },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(3, 'spacing'),
    elevation: 4,
    transform: [{ rotate: '0deg' }],
  },

  primaryButtonUpgrade: {
    backgroundColor: theme.colors.postItGreen,
  },

  primaryButtonCancel: {
    backgroundColor: theme.colors.postItYellow,
  },

  primaryButtonText: {
    fontSize: scaleByContent(15, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  logoutButton: {
    paddingVertical: scaleByContent(8, 'spacing'),
    paddingHorizontal: scaleByContent(16, 'spacing'),
    marginTop: isShortHeight
      ? scaleByContent(6, 'spacing')
      : scaleByContent(10, 'spacing'),
  },

  logoutButtonText: {
    fontSize: isShortHeight
      ? scaleByContent(12, 'text')
      : scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
  },
});

export default ProfileModal;
