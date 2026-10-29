import test from "node:test";
import assert from "node:assert/strict";
import { F, T, rng, randomMatrix } from "./helpers.js";
import { matrixEqual } from "../js/utils/validation.js";
import { gaussJordan } from "../js/core/gaussJordan.js";

/** Reaplica las operaciones registradas sobre la matriz original (la traza debe reproducir el resultado). */
function replay(matrix, steps) {
  const W = matrix.map((row) => row.slice());
  for (const s of steps) {
    if (s.kind === "swap") { const [i, j] = s.params; [W[i], W[j]] = [W[j], W[i]]; }
    else if (s.kind === "scale") { const [i, k] = s.params; W[i] = W[i].map((x) => x.mul(k)); }
    else { const [i, j, f] = s.params; W[i] = W[i].map((x, c) => x.add(f.mul(W[j][c]))); }
    assert.ok(matrixEqual(W, s.matrixAfter), `la matriz del paso ${s.number} no corresponde a su operación`);
  }
  return W;
}

test("Gauss (escalonada): sólo ceros debajo de cada pivote y sin normalizar", () => {
  const A = F([[0, 2, 1], [1, 1, 1], [2, 1, -1]]);
  const r = gaussJordan(A, { reduced: false });
  assert.equal(r.form, "REF");
  assert.ok(r.steps.every((s) => s.kind !== "scale"), "Gauss no divide la fila entre el pivote");
  assert.deepEqual(T(r.rref), [["1", "1", "1"], ["0", "2", "1"], ["0", "0", "-5/2"]]);
  for (const [r0, c0] of r.pivots) for (let i = r0 + 1; i < 3; i++) assert.ok(r.rref[i][c0].isZero());
  assert.ok(matrixEqual(replay(A, r.steps), r.rref));
});

test("Gauss-Jordan sigue dando la forma reducida (pivotes 1 y ceros arriba y abajo)", () => {
  const r = gaussJordan(F([[0, 2, 1], [1, 1, 1], [2, 1, -1]]));
  assert.equal(r.form, "RREF");
  assert.deepEqual(T(r.rref), [["1", "0", "0"], ["0", "1", "0"], ["0", "0", "1"]]);
});

test("Gauss y Gauss-Jordan dan el mismo rango y las mismas columnas pivote (matrices aleatorias)", () => {
  const rand = rng(8);
  for (let t = 0; t < 60; t++) {
    const m = randomMatrix(1 + Math.floor(rand() * 4), 1 + Math.floor(rand() * 5), rand, -2, 3);
    const a = gaussJordan(m, { reduced: false });
    const b = gaussJordan(m);
    assert.equal(a.rank, b.rank);
    assert.deepEqual(a.pivotColumns, b.pivotColumns);
    assert.ok(matrixEqual(replay(m, a.steps), a.rref));
    assert.ok(matrixEqual(replay(m, b.steps), b.rref));
  }
});

test("casos especiales: sin intercambios, singular, rectangular, fracciones y filas nulas", () => {
  assert.equal(gaussJordan(F([[1, 2], [3, 4]])).steps.some((s) => s.kind === "swap"), false);
  assert.equal(gaussJordan(F([[0, 1], [1, 0]])).steps[0].kind, "swap");
  const sing = gaussJordan(F([[1, 2, 3], [4, 5, 6], [7, 8, 9]]));
  assert.equal(sing.rank, 2);
  assert.deepEqual(sing.zeroRows, [2]);
  const rect = gaussJordan(F([[1, 2, 3], [4, 5, 6]]));
  assert.equal(rect.rank, 2);
  assert.deepEqual(T(rect.rref), [["1", "0", "-1"], ["0", "1", "2"]]);
  assert.deepEqual(T(gaussJordan(F([["1/2", "1/3"], ["1/4", "1/5"]])).rref), [["1", "0"], ["0", "1"]]);
  const zero = gaussJordan(F([[0, 0], [0, 0]]));
  assert.equal(zero.rank, 0);
  assert.equal(zero.steps.length, 0);
  assert.match(zero.rankExplanation, /nula/);
});

test("columna sin pivote (pivote nulo): se anota y no se divide entre cero", () => {
  const r = gaussJordan(F([[0, 1, 2], [0, 2, 4]]));
  assert.equal(r.rank, 1);
  assert.ok(r.notes.some((n) => /Columna 1/.test(n)));
});

test("matriz aumentada: los pivotes sólo se buscan en las columnas de coeficientes", () => {
  const r = gaussJordan(F([[1, 1, 2], [1, 1, 3]]), { pivotLimit: 2, splitCol: 2 });
  assert.equal(r.rank, 1);
  assert.ok(r.steps.every((s) => s.splitCol === 2));
});
