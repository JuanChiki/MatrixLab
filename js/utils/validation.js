/**
 * Validación de dimensiones, valores numéricos y condiciones matemáticas.
 *
 * Las matrices son arreglos de arreglos de `Fraction` (aritmética exacta:
 * 1/3 se conserva como 1/3, no como 0.3333).
 */

import { CONFIG } from "../config.js";
import { Fraction, ZeroDenominatorError } from "./fraction.js";
import { DimensionError, NotSquareError, ValidationError } from "./errors.js";

export const MAX_DIM = CONFIG.maxDim; // configurable en js/config.js

/** Convierte texto (entero, decimal o fracción como 3/4) en Fraction. */
export function parseValue(text) {
  const raw = String(text);
  const cleaned = raw.trim().replaceAll("−", "-").replaceAll(",", ".").replaceAll(" ", "");
  if (!cleaned) throw new ValidationError("la celda está vacía");
  try {
    return Fraction.parse(cleaned);
  } catch (e) {
    if (e instanceof ZeroDenominatorError) {
      throw new ValidationError(`«${raw.trim()}» tiene denominador cero`);
    }
    throw new ValidationError(
      `«${raw.trim()}» no es un número válido (use enteros, decimales o fracciones como 3/4)`,
    );
  }
}

/** Convierte una tabla de textos en una matriz de fracciones, indicando la celda problemática. */
export function parseMatrix(cells, name = "A") {
  if (!cells.length || !cells[0].length) throw new ValidationError(`La matriz ${name} no tiene filas o columnas.`);
  const width = cells[0].length;
  if (cells.some((row) => row.length !== width)) throw new ValidationError(`La matriz ${name} no es rectangular.`);
  return cells.map((row, i) =>
    row.map((text, j) => {
      try {
        return parseValue(text);
      } catch (e) {
        if (e instanceof ValidationError) {
          throw new ValidationError(`Celda ${name}[${i + 1},${j + 1}]: ${e.message}.`, i, j);
        }
        throw e;
      }
    }),
  );
}

/** Valida que `data` sea una matriz no vacía y rectangular; la devuelve como fracciones. */
export function toMatrix(data, name = "A") {
  if (!data.length || !data[0].length) throw new ValidationError(`La matriz ${name} no tiene filas o columnas.`);
  const width = data[0].length;
  if (data.some((row) => row.length !== width)) throw new ValidationError(`La matriz ${name} no es rectangular.`);
  return data.map((row) => row.map((x) => Fraction.of(x)));
}

/** Las dimensiones deben ser enteros positivos (y no exceder MAX_DIM). */
export function validateDimensions(rows, cols) {
  for (const [value, label] of [[rows, "filas"], [cols, "columnas"]]) {
    if (!Number.isInteger(value) || value < 1) {
      throw new ValidationError(`El número de ${label} debe ser un entero positivo.`);
    }
    if (value > MAX_DIM) throw new ValidationError(`El número de ${label} no puede ser mayor que ${MAX_DIM}.`);
  }
}

export const dimensions = (m) => [m.length, m[0].length];

export function dimsText(m) {
  const [r, c] = dimensions(m);
  return `${r}×${c}`;
}

/** ¿Las dos matrices tienen los mismos valores (y las mismas dimensiones)? */
export function matrixEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((row, i) => row.length === b[i].length && row.every((x, j) => x.eq(b[i][j])));
}

export function requireSameDimensions(a, b, verb) {
  const [ra, ca] = dimensions(a);
  const [rb, cb] = dimensions(b);
  if (ra !== rb || ca !== cb) {
    throw new DimensionError(
      `Para ${verb} matrices ambas deben tener las mismas dimensiones: A es ${dimsText(a)} y B es ${dimsText(b)}.`,
    );
  }
}

export function requireMultipliable(a, b) {
  if (dimensions(a)[1] !== dimensions(b)[0]) {
    throw new DimensionError(
      "Para multiplicar A·B el número de columnas de A debe coincidir con el número " +
        `de filas de B: A es ${dimsText(a)} y B es ${dimsText(b)}.`,
    );
  }
}

export function requireSquare(m, what = "esta operación") {
  const [r, c] = dimensions(m);
  if (r !== c) {
    throw new NotSquareError(
      `${what.charAt(0).toUpperCase() + what.slice(1)} requiere una matriz cuadrada; ` +
        `la matriz ingresada es ${dimsText(m)}.`,
    );
  }
}
