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

const PaywallModal = ({ visible, loading, onSelectPlan, onClose, subtitle }) => {
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

  const handleSelectPlan = (plan) => {
    if (loading) return;
    audioService.playSoundEffect('beer');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    onSelectPlan(plan);
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

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.modalTitle}>
              {'🔒 Desbloquea PaDrinks Premium'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {subtitle || 'Llegaste a la ronda 30. Suscríbete para seguir jugando sin límites.'}
            </Text>

            <View style={styles.plansContainer}>
              <View style={[styles.planCard, styles.planCardMonthly]}>
                <Text style={styles.planName}>{'Mensual'}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.planPrice}>{'$39 MXN'}</Text>
                  <Text style={styles.planPeriod}>{'/mes'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.planButton, styles.planButtonMonthly]}
                  onPress={() => handleSelectPlan('monthly')}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text style={styles.planButtonText}>
                    {loading ? 'Cargando…' : 'Elegir'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.planCard, styles.planCardAnnual]}>
                <Text style={styles.planName}>{'Anual'}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.planPrice}>{'$299 MXN'}</Text>
                  <Text style={styles.planPeriod}>{'/año'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.planButton, styles.planButtonAnnual]}
                  onPress={() => handleSelectPlan('annual')}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text style={styles.planButtonText}>
                    {loading ? 'Cargando…' : 'Elegir'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>{'Ahora no'}</Text>
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
    zIndex: 999995,
  },

  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: isSmallScreen ? '88%' : '80%',
    maxWidth: isTabletScreen ? scaleByContent(620, 'spacing') : undefined,
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

  modalScroll: {
    flexShrink: 1,
  },

  modalContent: {
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: isShortHeight
      ? scaleByContent(12, 'spacing')
      : scaleByContent(20, 'spacing'),
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: isShortHeight
      ? scaleByContent(17, 'text')
      : scaleByContent(21, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: isShortHeight
      ? scaleByContent(6, 'spacing')
      : scaleByContent(10, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  modalSubtitle: {
    fontSize: isShortHeight
      ? scaleByContent(13, 'text')
      : scaleByContent(15, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
    marginBottom: isShortHeight
      ? scaleByContent(14, 'spacing')
      : scaleByContent(22, 'spacing'),
  },

  plansContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: scaleByContent(12, 'spacing'),
    marginBottom: isShortHeight
      ? scaleByContent(8, 'spacing')
      : scaleByContent(16, 'spacing'),
  },

  planCard: {
    flex: 1,
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    borderRadius: scaleBorder(15),
    borderTopLeftRadius: scaleBorder(3),
    paddingHorizontal: scaleByContent(14, 'spacing'),
    paddingVertical: isShortHeight
      ? scaleByContent(10, 'spacing')
      : scaleByContent(16, 'spacing'),
    shadowColor: '#000',
    shadowOffset: {
      width: scaleByContent(3, 'spacing'),
      height: scaleByContent(3, 'spacing'),
    },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
    alignItems: 'center',
    transform: [{ rotate: '0deg' }],
  },

  planCardMonthly: {
    backgroundColor: theme.colors.postItYellow,
  },

  planCardAnnual: {
    backgroundColor: theme.colors.postItGreen,
  },

  planName: {
    fontSize: isShortHeight
      ? scaleByContent(15, 'text')
      : scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(6, 'spacing'),
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: isShortHeight
      ? scaleByContent(10, 'spacing')
      : scaleByContent(14, 'spacing'),
  },

  planPrice: {
    fontSize: isShortHeight
      ? scaleByContent(20, 'text')
      : scaleByContent(26, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },

  planPeriod: {
    fontSize: isShortHeight
      ? scaleByContent(12, 'text')
      : scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#333333',
    marginBottom: scaleByContent(3, 'spacing'),
    marginLeft: scaleByContent(3, 'spacing'),
  },

  planButton: {
    width: '100%',
    minHeight: scaleByContent(44, 'interactive'),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(12),
    borderTopLeftRadius: scaleBorder(3),
    paddingVertical: scaleByContent(8, 'spacing'),
    paddingHorizontal: scaleByContent(16, 'spacing'),
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '0deg' }],
  },

  planButtonMonthly: {
    backgroundColor: '#F0C040',
  },

  planButtonAnnual: {
    backgroundColor: '#6DB86F',
  },

  planButtonText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  closeButton: {
    paddingVertical: scaleByContent(8, 'spacing'),
    paddingHorizontal: scaleByContent(16, 'spacing'),
    marginTop: isShortHeight
      ? scaleByContent(4, 'spacing')
      : scaleByContent(6, 'spacing'),
  },

  closeButtonText: {
    fontSize: isShortHeight
      ? scaleByContent(12, 'text')
      : scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
  },
});

export default PaywallModal;
