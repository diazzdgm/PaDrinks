import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
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
} from '../../utils/responsive';

const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();

const ResumeGameModal = ({ visible, onContinue, onCancel }) => {
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

  const handleContinue = () => {
    audioService.playSoundEffect('beer');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      onContinue();
    });
  };

  const handleCancel = () => {
    audioService.playSoundEffect('wine');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onCancel();
    });
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

          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Seguimos bebiendo? 🍺</Text>
            <Text style={styles.modalSubtitle}>Tenías una partida en curso</Text>

            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Nueva partida</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.continueButton]}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>¡Continuar!</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    zIndex: 999996,
  },

  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: isSmallScreen ? '88%' : '80%',
    maxWidth: isTabletScreen ? scaleByContent(420, 'interactive') : undefined,
    backgroundColor: '#F8F6F0',
    borderRadius: scaleBorder(20),
    borderTopLeftRadius: scaleBorder(5),
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(6, 'spacing'), height: scaleByContent(6, 'spacing') },
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

  modalContent: {
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: isShortHeight ? scaleByContent(12, 'spacing') : scaleByContent(20, 'spacing'),
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: isShortHeight ? scaleByContent(18, 'text') : scaleByContent(22, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: isShortHeight ? scaleByContent(6, 'spacing') : scaleByContent(10, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  modalSubtitle: {
    fontSize: isShortHeight ? scaleByContent(14, 'text') : scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
    marginBottom: isShortHeight ? scaleByContent(20, 'spacing') : scaleByContent(36, 'spacing'),
  },

  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: scaleByContent(12, 'spacing'),
  },

  actionButton: {
    flex: 1,
    minHeight: scaleByContent(44, 'interactive'),
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    borderRadius: scaleBorder(15),
    borderTopLeftRadius: scaleBorder(3),
    paddingVertical: scaleByContent(12, 'spacing'),
    paddingHorizontal: isTabletScreen ? scaleByContent(35, 'spacing') : scaleByContent(25, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '0deg' }],
  },

  continueButton: {
    backgroundColor: theme.colors.postItGreen,
  },

  cancelButton: {
    backgroundColor: theme.colors.postItYellow,
  },

  actionButtonText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
});

export default ResumeGameModal;
