import { Fraction } from "../js/utils/fraction.js";

/** Matriz de Fractions a partir de números/textos: F([[1, "1/2"], [3, 4]]). */
export const F = (m) => m.map((row) => row.map((x) => Fraction.of(x)));

/** Matriz como texto, para comparar con deepEqual de forma legible. */
export const T = (m) => m.map((row) => row.map((x) => x.toString()));

/** Generador pseudoaleatorio con semilla (para que las pruebas sean repetibles). */
export function rng(seed = 1) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

export function randomMatrix(rows, cols, rand, lo = -4, hi = 4) {
  return F(Array.from({ length: rows }, () => Array.from({ length: cols }, () => lo + Math.floor(rand() * (hi - lo + 1)))));
}
