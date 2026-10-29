# MatrixLab

**Laboratorio interactivo de Álgebra Lineal que muestra, paso a paso, cómo se obtiene cada resultado.**

🔗 **Demo en línea:** https://juanchiki.github.io/MatrixLab/

MatrixLab es una aplicación web hecha con **HTML, CSS y JavaScript puro**: sin Node, sin dependencias, sin instalación y sin backend. Se abre con doble clic en `index.html`.

---

## Índice

1. [¿Qué es MatrixLab?](#qué-es-matrixlab)
2. [Características](#características)
3. [Cómo se usa](#cómo-se-usa)
4. [Operaciones disponibles](#operaciones-disponibles)
5. [Cómo funciona por dentro](#cómo-funciona-por-dentro)
6. [Estructura del proyecto](#estructura-del-proyecto)

---

## ¿Qué es MatrixLab?

Una calculadora de matrices pensada para **aprender**, no solo para obtener la respuesta. Además del resultado final, MatrixLab muestra cada operación que se realiza (intercambios de filas, pivotes, cofactores, etc.) con la matriz *antes* y *después* de cada paso, de modo que se puede seguir el procedimiento como en un cuaderno de clase.

Sirve para estudiar, comprobar tareas y exponer en clase (incluye un modo de texto grande para proyector).

## Características

- **Editor de matrices** de hasta 10×10 (configurable con `?maxDim=N`): admite enteros, decimales y fracciones (`3/4`). Botones *Ejemplo*, *Aleatoria*, *Identidad*, *Nula* y *Limpiar*. Se puede **pegar directamente desde Excel o Google Sheets**.
- **Aritmética exacta:** `1/3` se conserva como `1/3`, sin errores de redondeo. El botón *Fracciones / Decimales* solo cambia cómo se muestra.
- **Reproductor de pasos** para recorrer el procedimiento operación por operación.
- **Verificaciones automáticas:** cada determinante se comprueba con otros métodos y con det(Aᵀ); la adjunta se comprueba con `A·adj(A) = det(A)·I`.
- **Explica los casos especiales:** matriz singular sin inversa, sistemas sin solución o con infinitas soluciones, error de dimensiones, etc.
- **Historial** de las últimas 15 operaciones.
- **Copiar resultados** como texto o como código **LaTeX**, y botones *Usar como A / B* para encadenar operaciones.
- **Tema claro y oscuro** (recuerda tu elección), diseño adaptable a celular y botón **A+** para proyectar.
- **17 ejemplos preparados** (singular, rectangular, sin solución, error de dimensiones…) en *Ayuda y ejemplos*.

## Cómo se usa

1. **Escribe la matriz A** (y la B si la operación lo necesita). Elige el tamaño y llena las celdas con números o fracciones, o usa *Ejemplo* / *Aleatoria*. Las celdas vacías o inválidas se marcan en rojo.
2. **Elige la operación** en las pestañas (Básicas, Sistemas, Determinante e inversa) y ajusta sus opciones si las tiene (método, fila/columna, modo de Gauss…).
3. **Pulsa Calcular** (o `Ctrl + Enter`).
4. **Revisa el resultado** y recorre los pasos. Los colores indican qué está pasando:
   - 🟨 **Amarillo:** el pivote que se está usando.
   - 🟪 **Violeta:** la fila que cambia en esta operación.
   - 🟩 **Verde:** los elementos señalados (diagonales de Sarrus, fila y columna de un menor, términos de un cofactor).
5. Si quieres seguir trabajando con el resultado, pulsa **Usar como A** o **Usar como B**.

### Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl + Enter` | Calcular |
| `←` `→` | Paso anterior / siguiente |
| `Inicio` / `Fin` | Ir al primer / último paso |
| Flechas y `Enter` | Moverse entre las celdas de una matriz |
| `Ctrl + V` | Pegar una matriz desde Excel o Google Sheets |

## Operaciones disponibles

| Grupo | Operación | Qué hace |
|---|---|---|
| **Básicas** | `A + B`, `A − B` | Suma y resta, con la fórmula de cada elemento. Requieren igual dimensión. |
| | `k·A` | Multiplica cada elemento por un escalar `k`. |
| | `A·B` | Producto de matrices (columnas de A = filas de B), con el detalle de cada celda. |
| | `Aᵀ` | Transpuesta. |
| | Tipo | Reconoce si A es nula, identidad, diagonal, escalar, triangular, simétrica, antisimétrica, singular… |
| **Sistemas** | Gauss / Gauss-Jordan | Forma escalonada o escalonada reducida, con intercambio de filas, pivotes, rango y matriz aumentada `[A \| b]`. |
| | Sistema `Ax = b` | Solución única, infinitas (con variables libres) o ninguna, explicando por qué. |
| **Determinante e inversa** | `det(A)` | Fórmula `ad − bc` (2×2), Sarrus (3×3), cofactores por fila o columna, o eliminación por filas. |
| | Cofactores | Matrices de menores y de cofactores, con celdas clicables que explican de dónde sale cada valor. |
| | Adjunta | `adj(A)` = transpuesta de la matriz de cofactores, con verificación. |
| | `A⁻¹` | Inversa por la adjunta (`adj(A)/det(A)`) o por Gauss-Jordan sobre `[A \| I]`. |

> Para un sistema `Ax = b`, escribe cada ecuación en una fila: los coeficientes a la izquierda y el término independiente en la última columna.

## Cómo funciona por dentro

- **Pasos registrados:** cada algoritmo guarda un paso *mientras calcula* (operación, explicación, matriz antes y después, pivote). Las pruebas reaplican cada operación y comprueban que la traza reproduce el resultado.
- **Fracciones exactas:** clase `Fraction` propia con `BigInt` y simplificación por MCD. Se evita `Number` porque en JavaScript es decimal binario (`0.1 + 0.2 ≠ 0.3`). Los decimales que escribe el usuario se convierten a fracción (`0.5` → `1/2`).
- **Gauss / Gauss-Jordan:** columna por columna, busca el pivote, intercambia filas si hace falta, normaliza y elimina (solo hacia abajo en Gauss; hacia arriba y abajo en Gauss-Jordan). El rango es el número de pivotes.
- **Determinantes:** Sarrus, cofactores `Σ aᵢⱼ·(−1)^(i+j)·Mᵢⱼ` y eliminación (el signo cambia con cada intercambio de filas).
- **Inversa:** `adj(A)/det(A)` o reducción de `[A | I]`.
- **Separación de capas:** `js/core` contiene solo matemáticas y **no importa nada de `js/ui`**, por eso el motor se prueba sin navegador. `js/ui/operations.js` conecta ambos mundos sin tocar el DOM.

```

## Estructura del proyecto

```text
MatrixLab-web/
├── index.html
├── app.js                # todo el JS empaquetado (lo que carga la página)
├── css/styles.css        # temas claro/oscuro (variables CSS al inicio)
├── tools/bundle.py       # genera app.js desde js/ (Python, sin dependencias)
├── js/
│   ├── main.js           # punto de entrada
│   ├── config.js         # tamaño máximo de matriz (?maxDim=N)
│   ├── core/             # matemáticas, sin interfaz
│   │   ├── gaussJordan.js, determinants.js, cofactors.js
│   │   ├── inverse.js, linearSystem.js, classification.js
│   │   └── matrixOperations.js, steps.js
│   ├── ui/               # componentes visuales
│   │   ├── mainWindow.js, matrixEditor.js, stepsViewer.js, resultsPanel.js
│   │   └── htmlRender.js, operations.js, help.js, history.js, clipboard.js
│   └── utils/            # fraction.js, validation.js, formatting.js, errors.js
└── tests/                # pruebas con node:test
```
