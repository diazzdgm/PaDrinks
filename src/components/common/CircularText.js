import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';
import { theme } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

const CircularText = ({ 
  text = "PADRINKS*PADRINKS*PADRINKS*", 
  spinDuration = 20000,
  radius = 150,
  fontSize = 24,
  style = {},
  enableDancing = false
}) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const letters = Array.from(text);
  
  // Crear animaciones individuales para cada letra si dancing está habilitado
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
    
    // Iniciar animaciones de baile para letras aleatorias
    if (enableDancing) {
      letters.forEach((_, index) => {
        // Solo algunas letras bailan (aleatoriamente)
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
          }, Math.random() * 2000); // Delay aleatorio
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
    <Animated.View 
      style={[
        {
          width: radius * 2,
          height: radius * 2,
          position: 'absolute',
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
        
        // Calcular posición en el círculo
        const x = Math.cos(angleInRadians - Math.PI / 2) * radius;
        const y = Math.sin(angleInRadians - Math.PI / 2) * radius;
        
        return (
          <Animated.Text
            key={index}
            style={{
              position: 'absolute',
              fontSize: fontSize,
              fontFamily: 'Kalam-Bold', // Usar directamente Kalam-Bold
              color: '#000000', // Negro
              fontWeight: 'bold',
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
              transform: [
                { translateX: x },
                { translateY: y },
                { rotate: `${angle}deg` },
                { 
                  scale: enableDancing ? letterAnimations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }) : 1
                },
              ],
            }}
          >
            {letter}
          </Animated.Text>
        );
      })}
    </Animated.View>
  );
};

export default CircularText;