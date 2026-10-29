/** Estructuras compartidas para registrar los procedimientos paso a paso. */

export const copyMatrix = (m) => m.map((row) => row.slice());

/**
 * Un paso de un procedimiento (una operación elemental, un término, un menor...).
 *
 * Los algoritmos crean estos pasos *mientras* calculan; nunca se reconstruyen
 * después a partir del resultado final.
 *
 * Campos:
 *   number         número del paso
 *   operation      p. ej. "F₂ ← F₂ − 3F₁"
 *   explanation    objetivo de la operación
 *   matrixBefore   matriz antes (o null)
 *   matrixAfter    matriz después (o null)
 *   pivot          [fila, columna] base 0, o null
 *   changedRows    filas a resaltar
 *   highlightCells celdas a resaltar [[i, j], ...]
 *   splitCol       separador de matriz aumentada [A | I]
 *   kind           "swap" | "scale" | "add" | ... (para verificar)
 *   params         argumentos de la operación elemental
 *   section        etiqueta de etapa (p. ej. "Determinante")
 */
export function step(number, operation, explanation, matrixBefore = null, matrixAfter = null, extra = {}) {
  return Object.freeze({
    number,
    operation,
    explanation,
    matrixBefore,
    matrixAfter,
    pivot: null,
    changedRows: [],
    highlightCells: [],
    splitCol: null,
    kind: "",
    params: [],
    section: "",
    ...extra,
  });
}

/** Devuelve copias de `steps` numeradas desde `start` (y con otra sección si se indica). */
export function renumber(steps, section = null, start = 1) {
  return steps.map((s, offset) =>
    Object.freeze({ ...s, number: start + offset, ...(section !== null ? { section } : {}) }),
  );
}
