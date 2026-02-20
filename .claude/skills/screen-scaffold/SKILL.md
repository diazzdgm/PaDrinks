---
name: screen-scaffold
description: Genera el scaffold de una nueva pantalla para PaDrinks con todos los patrones correctos del proyecto ya incluidos. Usar cuando se va a crear una pantalla nueva.
disable-model-invocation: true
argument-hint: [NombrePantalla] [descripcion breve]
---

Crea una nueva pantalla para PaDrinks llamada "$0Screen".

Descripcion de la pantalla: $1

La pantalla debe seguir EXACTAMENTE estos patrones del proyecto:

**Estructura base obligatoria:**
```js
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../../styles/theme';
import { useSafeAreaOffsets } from '../../hooks/useSafeAreaOffsets';
import {
  scaleByContent,
  scaleModerate,
  getDeviceType,
  isSmallDevice,
  isTablet,
  RESPONSIVE
} from '../../utils/responsive';
```

**Reglas que DEBES seguir:**
1. SIN comentarios en el codigo
2. SIN componente Modal - usar renderizado condicional con position absolute
3. SIN Animated.spring - solo Animated.timing
4. SIN navigation.goBack() - usar navigation.reset()
5. SIN valores hardcodeados en styles - todo con scaleByContent()
6. Safe area para botones fijos con useSafeAreaOffsets
7. includeFontPadding: false en todos los textos con fuente Kalam
8. lineHeight minimo fontSize * 1.25

**Para botones de navegacion:**
```js
const { leftOffset, rightOffset, topOffset } = useSafeAreaOffsets();
// position: 'absolute', top: topOffset, left: leftOffset
```

**Para animaciones de entrada:**
```js
const fadeAnim = useRef(new Animated.Value(0)).current;
useFocusEffect(
  React.useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true
    }).start();
    return () => { fadeAnim.setValue(0); };
  }, [])
);
```

Crea el archivo en `src/screens/game/$0Screen.js` con la implementacion completa de la pantalla segun la descripcion proporcionada.
