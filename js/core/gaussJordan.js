/**
 * Reducción de Gauss-Jordan con registro de cada operación elemental.
 *
 * El algoritmo guarda cada paso *mientras* lo ejecuta: la lista de pasos es la
 * traza real del cálculo, no una explicación fabricada a partir del resultado.
 *
 * Operaciones elementales registradas (campos `kind` y `params` del paso):
 *   "swap"  [i, j]      -> F_i ↔ F_j
 *   "scale" [i, k]      -> F_i ← k·F_i          (k ≠ 0)
 *   "add"   [i, j, f]   -> F_i ← F_i + f·F_j    (i ≠ j)
 * Los índices son de base 0.
 */

import { Fraction } from "../utils/fraction.js";
import { coef, fmt, subscript } from "../utils/formatting.js";
import { toMatrix } from "../utils/validation.js";
import { copyMatrix, step } from "./steps.js";

/**
 * Lleva `matrix` a su forma escalonada reducida por filas (RREF).
 *
 * pivotLimit: sólo se buscan pivotes en las primeras `pivotLimit` columnas
 *             (útil para matrices aumentadas [A | I]).
 * splitCol:   indica dónde dibujar el separador de la matriz aumentada.
 * reduced:    true  -> Gauss-Jordan (forma escalonada REDUCIDA: pivotes 1 y ceros arriba y abajo).
 *             false -> eliminación de Gauss (forma escalonada: sólo ceros debajo de cada pivote,
 *                      sin dividir la fila entre el pivote).
 *
 * Devuelve { rref, form, steps, pivots, pivotColumns, rank, zeroRows, isSquare, notes, rankExplanation }.
 * (`rref` es la matriz final; `form` vale "RREF" o "REF" según `reduced`.)
 */
export function gaussJordan(matrix, { pivotLimit = null, splitCol = null, reduced = true } = {}) {
  const A = toMatrix(matrix);
  const rows = A.length;
  const cols = A[0].length;
  const limit = pivotLimit === null ? cols : pivotLimit;
  const steps = [];
  const notes = [];
  const pivots = [];

  // Registra un paso con la matriz "antes" recibida y la matriz "después" actual.
  function record(operation, explanation, before, pivot, changed, kind, params) {
    steps.push(
      step(steps.length + 1, operation, explanation, before, copyMatrix(A), {
        pivot,
        changedRows: changed,
        splitCol,
        kind,
        params,
      }),
    );
  }

  let r = 0; // fila donde se colocará el siguiente pivote
  for (let c = 0; c < limit; c++) {
    if (r >= rows) break;

    // 1) Buscar, desde la fila r, un elemento distinto de 0 en la columna c.
    let p = -1;
    for (let i = r; i < rows; i++) {
      if (!A[i][c].isZero()) {
        p = i;
        break;
      }
    }
    if (p === -1) {
      notes.push(
        `Columna ${c + 1}: no hay elementos distintos de 0 desde la fila ${r + 1}; ` +
          "no hay pivote en esta columna y se pasa a la siguiente.",
      );
      continue;
    }

    // 2) Si el pivote no está en la fila r, se intercambian filas (nunca se divide entre 0).
    if (p !== r) {
      const before = copyMatrix(A);
      const reason =
        `El elemento en la posición (${r + 1},${c + 1}) es 0, así que no puede ser pivote. ` +
        `Se intercambia con la fila ${p + 1}, que tiene un valor distinto de 0 en la columna ${c + 1}.`;
      [A[r], A[p]] = [A[p], A[r]];
      record(`F${subscript(r + 1)} ↔ F${subscript(p + 1)}`, reason, before, [r, c], [r, p], "swap", [r, p]);
    }

    // 3) Gauss-Jordan: si el pivote ≠ 1, se multiplica la fila por su inverso (exacto).
    const pivotValue = A[r][c];
    if (reduced && !pivotValue.eq(1)) {
      const before = copyMatrix(A);
      const k = new Fraction(1).div(pivotValue);
      A[r] = A[r].map((x) => x.mul(k));
      record(
        `F${subscript(r + 1)} ← ${coef(k)}F${subscript(r + 1)}`,
        `Convertir el pivote (${r + 1},${c + 1}) = ${fmt(pivotValue)} en 1: se multiplica la ` +
          `fila ${r + 1} por ${fmt(k)}, el inverso del pivote.`,
        before,
        [r, c],
        [r],
        "scale",
        [r, k],
      );
    }

    // 4) Hacer 0 el resto de la columna: F_i ← F_i − f·F_r.
    //    Gauss-Jordan: arriba y abajo (el pivote vale 1, así que f = a_ic).
    //    Gauss: sólo debajo (el pivote puede ser distinto de 1, así que f = a_ic / pivote).
    const pivotNow = A[r][c];
    for (let i = reduced ? 0 : r + 1; i < rows; i++) {
      if (i === r || A[i][c].isZero()) continue;
      const before = copyMatrix(A);
      const element = A[i][c];
      const f = element.div(pivotNow);
      A[i] = A[i].map((x, j) => x.sub(f.mul(A[r][j])));
      const sign = f.sign > 0 ? "−" : "+";
      const op = `F${subscript(i + 1)} ← F${subscript(i + 1)} ${sign} ${coef(f.abs())}F${subscript(r + 1)}`;
      const where = i > r ? "debajo" : "encima";
      const explanation = pivotNow.eq(1)
        ? `Hacer 0 el elemento (${i + 1},${c + 1}) = ${fmt(element)}, que está ${where} del pivote, ` +
          `restando ${fmt(f)} veces la fila ${r + 1} (que tiene el pivote 1).`
        : `Hacer 0 el elemento (${i + 1},${c + 1}) = ${fmt(element)}, que está ${where} del pivote ${fmt(pivotNow)}, ` +
          `restando ${fmt(f)} veces la fila ${r + 1} (${fmt(element)} ÷ ${fmt(pivotNow)} = ${fmt(f)}).`;
      record(op, explanation, before, [r, c], [i], "add", [i, r, f.neg()]);
    }

    // 5) Avanzar a la siguiente fila.
    pivots.push([r, c]);
    r += 1;
  }

  const zeroRows = [];
  A.forEach((row, i) => {
    if (row.slice(0, limit).every((x) => x.isZero())) zeroRows.push(i);
  });
  const pivotColumns = pivots.map(([, c]) => c);
  const rank = pivots.length;
  const rankExplanation = rank
    ? `Rango = ${rank}: es el número de pivotes (columnas pivote: ${pivotColumns.map((c) => c + 1).join(", ")}), ` +
      `es decir, el número de filas no nulas de la forma ${reduced ? "reducida" : "escalonada"}.`
    : "Rango = 0: la matriz es nula y no tiene pivotes.";

  return { rref: A, form: reduced ? "RREF" : "REF", steps, pivots, pivotColumns, rank, zeroRows, isSquare: rows === cols, notes, rankExplanation };
}
