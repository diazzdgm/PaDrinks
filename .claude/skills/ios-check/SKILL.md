---
name: ios-check
description: Verifica reglas criticas iOS en componentes de PaDrinks antes de commitear. Usar despues de modificar cualquier pantalla o componente UI.
disable-model-invocation: true
allowed-tools: Read, Grep
argument-hint: [archivo o carpeta]
---

Revisa $ARGUMENTS para verificar el cumplimiento de todas las reglas iOS criticas del proyecto PaDrinks.

Busca y reporta cada violacion con numero de linea exacto y la correccion que debes aplicar:

**1. Uso prohibido de Modal**
Busca `<Modal` o `import.*Modal`. Si existe, reportar: "CRITICO: Linea X usa <Modal> - reemplazar con renderizado condicional + position absolute + zIndex: 9999"

**2. Animated.spring en overlays**
Busca `Animated.spring`. Si existe dentro de un overlay o modal, reportar: "Linea X usa Animated.spring - cambiar a Animated.timing"

**3. Transforms en animaciones de overlay**
Busca animaciones con `scale` o `rotate` en componentes que son overlays. Reportar si existen.

**4. Safe area no usada en botones fijos**
Busca botones de back/mute con `position: 'absolute'` que NO usen `useSafeAreaOffsets`. Reportar si falta.

**5. includeFontPadding faltante**
Busca estilos de texto con `fontFamily: 'Kalam'` que no tengan `includeFontPadding: false`. Reportar cada caso.

**6. lineHeight insuficiente**
Busca `lineHeight` en textos Kalam. Debe ser al menos `fontSize * 1.25`. Reportar si es menor.

**7. Comentarios en el codigo**
Busca lineas que empiecen con `//` o bloques `/* */`. Reportar cada uno (violacion de regla del proyecto).

**Formato de reporte:**
```
CRITICO: [descripcion] - Linea X
ADVERTENCIA: [descripcion] - Linea X
OK: [aspecto verificado]
```

Si no hay argumentos, revisar todos los archivos en src/screens/ y src/components/.
