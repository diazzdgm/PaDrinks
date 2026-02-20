---
name: responsive-audit
description: Audita el uso correcto del sistema responsive de PaDrinks en un archivo o pantalla. Detecta valores hardcodeados, uso incorrecto de scaleByContent, y problemas de layout landscape.
disable-model-invocation: true
allowed-tools: Read, Grep
argument-hint: [archivo.js]
---

Audita el sistema responsive en $ARGUMENTS.

Lee el archivo completo y reporta:

**1. Valores de tamano hardcodeados (CRITICO)**
Busca numeros directos en styles sin escalar: `fontSize: 16`, `width: 200`, `height: 50`, `padding: 10`, etc.
Por cada uno reportar: "Linea X: `fontSize: 16` → debe ser `scaleByContent(16, 'text')`"

**2. Uso incorrecto de scaleByContent**
Verifica que el segundo argumento sea el tipo correcto:
- fontSize → debe usar `'text'`
- width/height de botones → debe usar `'interactive'`
- padding/margin → debe usar `'spacing'`
- Tamanos de icon/Image → debe usar `'icon'`

**3. Import del sistema responsive**
Verifica que importa desde `../../utils/responsive` (o la ruta relativa correcta).
Lista que funciones importa y cuales usa realmente.

**4. Uso de RESPONSIVE pre-calculados**
Si el componente tiene muchos `scaleByContent` repetidos con los mismos valores, sugerir usar `RESPONSIVE.spacing.md` o `RESPONSIVE.fontSize.large` etc.

**5. Deteccion de dispositivo**
Si el componente tiene logica condicional de layout, verificar que usa `getDeviceType()`, `isSmallDevice()`, `isTablet()` o `isShortHeightDevice()` del sistema responsive (no calcula sus propias dimensiones con Dimensions.get).

**6. Dimensions.get directo**
Busca `Dimensions.get('window')` o `Dimensions.get('screen')` en el componente. Si existe fuera de responsive.js, reportar como potencial problema (deberia usar funciones del sistema responsive).

**Formato de reporte:**
```
CRITICO - [problema]: Linea X
  Actual:   [codigo actual]
  Correcto: [como deberia ser]

SUGERENCIA - [mejora]: Linea X
```

Al final dar un score: "Compliance responsive: X/10" basado en cuantos problemas se encontraron.
