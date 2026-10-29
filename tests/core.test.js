import test from "node:test";
import assert from "node:assert/strict";
import { F, T, rng, randomMatrix } from "./helpers.js";
import { Fraction } from "../js/utils/fraction.js";
import { matrixEqual } from "../js/utils/validation.js";
import { DimensionError, NotSquareError } from "../js/utils/errors.js";
import { add, multiply, subtract, scalarMultiply, transpose } from "../js/core/matrixOperations.js";
import { gaussJordan } from "../js/core/gaussJordan.js";
import { determinant, determinantValue } from "../js/core/determinants.js";
import { cofactorProcedure } from "../js/core/cofactors.js";
import { inverse, identity } from "../js/core/inverse.js";

const A = F([[1, 2], [3, 4]]);
const B = F([[5, 6], [7, 8]]);

test("suma, resta, escalar, producto y transpuesta", () => {
  assert.deepEqual(T(add(A, B).result), [["6", "8"], ["10", "12"]]);
  assert.deepEqual(T(subtract(A, B).result), [["-4", "-4"], ["-4", "-4"]]);
  assert.deepEqual(T(scalarMultiply(A, "1/2").result), [["1/2", "1"], ["3/2", "2"]]);
  assert.deepEqual(T(multiply(A, B).result), [["19", "22"], ["43", "50"]]);
  assert.deepEqual(T(transpose(F([[1, 2, 3], [4, 5, 6]])).result), [["1", "4"], ["2", "5"], ["3", "6"]]);
});

test("dimensiones incompatibles producen errores claros", () => {
  assert.throws(() => add(A, F([[1, 2, 3]])), DimensionError);
  assert.throws(() => multiply(F([[1, 2, 3]]), A), /columnas de A/);
});

test("Gauss-Jordan: caso con intercambio de filas llega a la identidad y rango 3", () => {
  const r = gaussJordan([[0, 2, 1], [1, 1, 1], [2, 1, -1]]);
  assert.deepEqual(T(r.rref), T(identity(3)));
  assert.equal(r.rank, 3);
  assert.equal(r.steps[0].kind, "swap");
});

test("Gauss-Jordan: matriz singular tiene rango 2 y una fila nula", () => {
  const r = gaussJordan([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
  assert.equal(r.rank, 2);
  assert.deepEqual(r.zeroRows, [2]);
});

test("cada operación registrada se puede reaplicar y reproduce la RREF (la traza es real)", () => {
  const rand = rng(11);
  for (let t = 0; t < 40; t++) {
    const m = randomMatrix(3, 4, rand);
    const r = gaussJordan(m);
    const W = m.map((row) => row.slice());
    for (const s of r.steps) {
      if (s.kind === "swap") { const [i, j] = s.params; [W[i], W[j]] = [W[j], W[i]]; }
      else if (s.kind === "scale") { const [i, k] = s.params; W[i] = W[i].map((x) => x.mul(k)); }
      else { const [i, j, f] = s.params; W[i] = W[i].map((x, c) => x.add(f.mul(W[j][c]))); }
    }
    assert.ok(matrixEqual(W, r.rref));
  }
});

test("determinantes: 2×2, Sarrus, cofactores (fila y columna) y eliminación coinciden", () => {
  assert.equal(determinant(A).value.toString(), "-2");
  const M3 = F([[2, 1, 1], [1, 3, 2], [1, 0, 0]]);
  const values = [
    determinant(M3, "sarrus").value,
    determinant(M3, "gauss").value,
    ...[0, 1, 2].map((k) => determinant(M3, "cofactors", "row", k).value),
    ...[0, 1, 2].map((k) => determinant(M3, "cofactors", "column", k).value),
  ];
  for (const v of values) assert.ok(v.eq(values[0]), `${v} != ${values[0]}`);
  assert.equal(values[0].toString(), "-1");
});

test("Sarrus solo vale para 3×3; las matrices rectangulares se rechazan", () => {
  assert.throws(() => determinant(A, "sarrus"), DimensionError);
  assert.throws(() => determinant(F([[1, 2, 3], [4, 5, 6]])), NotSquareError);
});

test("el determinante cambia de signo al intercambiar dos filas", () => {
  const m = F([[1, 2, 3], [0, 1, 4], [5, 6, 0]]);
  const swapped = [m[1], m[0], m[2]];
  assert.ok(determinantValue(swapped).eq(determinantValue(m).neg()));
});

test("propiedad: A·adj(A) = det(A)·I en matrices aleatorias de orden 1 a 4", () => {
  const rand = rng(5);
  for (let n = 1; n <= 4; n++) {
    for (let t = 0; t < 15; t++) {
      const m = randomMatrix(n, n, rand);
      const adj = cofactorProcedure(m).adjugate;
      const expected = identity(n).map((row) => row.map((x) => x.mul(determinantValue(m))));
      assert.ok(matrixEqual(multiply(m, adj).result, expected));
    }
  }
});

test("inversa por adjunta y por Gauss-Jordan coinciden y cumplen A·A⁻¹ = I", () => {
  const rand = rng(21);
  let invertibles = 0;
  for (let t = 0; t < 40; t++) {
    const m = randomMatrix(3, 3, rand);
    const a = inverse(m, "adjugate");
    const g = inverse(m, "gauss");
    assert.equal(a.invertible, g.invertible);
    if (a.invertible) {
      invertibles++;
      assert.ok(matrixEqual(a.inverse, g.inverse));
      assert.ok(matrixEqual(multiply(m, a.inverse).result, identity(3)));
    } else {
      assert.equal(a.inverse, null);
      assert.ok(determinantValue(m).isZero());
    }
  }
  assert.ok(invertibles > 5);
});

test("matriz singular: no se lanza excepción, se explica por qué no hay inversa", () => {
  const r = inverse(F([[1, 2, 3], [4, 5, 6], [7, 8, 9]]));
  assert.equal(r.invertible, false);
  assert.match(r.message, /singular/);
});

test("fracciones exactas: la inversa de [[3,1],[1,1]] es [[1/2,-1/2],[-1/2,3/2]]", () => {
  assert.deepEqual(T(inverse(F([[3, 1], [1, 1]])).inverse), [["1/2", "-1/2"], ["-1/2", "3/2"]]);
});
