import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, Platform } from 'react-native';
import { theme } from '../../styles/theme';
import {
  scale,
  scaleText,
  scaleModerate,
  getDeviceType,
  isTablet,
  RESPONSIVE
} from '../../utils/responsive';

const { width: _rw, height: _rh } = Dimensions.get('window');
const width = Math.max(_rw, _rh);
const height = Math.min(_rw, _rh);

const CircularText = ({
  text = "PADRINKS*PADRINKS*PADRINKS*",
  spinDuration = 20000,
  radius = scale(150),
  fontSize = scaleText(24),
  style = {},
  enableDancing = false
}) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const letters = Array.from(text);

  const letterAnimations = useRef(
    letters.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: spinDuration,
          useNativeDriver: true,
        })
      ).start();
    };

    if (enableDancing) {
      letters.forEach((_, index) => {
        if (Math.random() > 0.7) {
          setTimeout(() => {
            Animated.loop(
              Animated.sequence([
                Animated.timing(letterAnimations[index], {
                  toValue: 1,
                  duration: 600 + Math.random() * 400,
                  useNativeDriver: true,
                }),
                Animated.timing(letterAnimations[index], {
                  toValue: 0,
                  duration: 600 + Math.random() * 400,
                  useNativeDriver: true,
                }),
              ])
            ).start();
          }, Math.random() * 2000);
        }
      });
    }

    startRotation();
  }, [spinDuration, enableDancing]);

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={{
        width: radius * 2,
        height: radius * 2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: radius * 2,
            height: radius * 2,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ rotate: rotation }],
          },
          style
        ]}
      >
        {letters.map((letter, index) => {
          const angle = (360 / letters.length) * index;
          const angleInRadians = (angle * Math.PI) / 180;

          const x = Math.cos(angleInRadians - Math.PI / 2) * radius;
          const y = Math.sin(angleInRadians - Math.PI / 2) * radius;

          const scaleAnim = enableDancing ? letterAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.2],
          }) : 1;

          return (
            <Animated.View
              key={index}
              style={{
                position: 'absolute',
                left: radius,
                top: radius,
                transform: [
                  { translateX: x },
                  { translateY: y },
                  { rotate: `${angle}deg` },
                  { scale: scaleAnim },
                ],
              }}
            >
              <Animated.Text
                style={{
                  fontSize: fontSize,
                  fontFamily: 'Kalam-Bold',
                  color: '#000000',
                  fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
                  textShadowColor: 'rgba(0, 0, 0, 0.3)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                }}
                allowFontScaling={false}
              >
                {letter}
              </Animated.Text>
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
};

export default CircularText;