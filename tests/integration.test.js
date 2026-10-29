import test from "node:test";
import assert from "node:assert/strict";
import { F } from "./helpers.js";
import { MatrixLabError } from "../js/utils/errors.js";
import { parseMatrix } from "../js/utils/validation.js";
import { maxDimFromUrl, DEFAULT_MAX_DIM } from "../js/config.js";
import { OPERATIONS, runOperation } from "../js/ui/operations.js";
import { HELP_EXAMPLES, helpHtml } from "../js/ui/help.js";
import { matrixHtml, resultsHtml, setNumberMode, stepHtml } from "../js/ui/htmlRender.js";
import { Fraction } from "../js/utils/fraction.js";

const A = F([[2, 1, 1], [1, 3, 2], [1, 0, 0]]);
const B = F([[1, 0, 2], [0, 1, 1], [3, 1, 0]]);
const sys = F([[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]]);

test("cada operación del menú devuelve un resultado completo y todos sus pasos se dibujan", () => {
  for (const spec of OPERATIONS) {
    const out = runOperation(spec.key, spec.system ? sys : A, spec.needsB ? B : null, {});
    assert.ok(out.title && out.inputs.length && out.results.length, spec.key);
    assert.ok(out.steps.length >= 1, `${spec.key} sin pasos`);
    out.steps.forEach((s, k) => assert.ok(stepHtml(s, `Paso ${k + 1} de ${out.steps.length}`).includes("Paso"), spec.key));
  }
});

test("cada ejemplo de la ayuda se calcula (o falla con un error previsto, si es el de dimensiones)", () => {
  assert.ok(HELP_EXAMPLES.length >= 12);
  for (const ex of HELP_EXAMPLES) {
    const a = parseMatrix(ex.a.map((r) => r.map(String)), "A");
    const b = ex.b ? parseMatrix(ex.b.map((r) => r.map(String)), "B") : null;
    if (ex.title.startsWith("Error")) assert.throws(() => runOperation(ex.op, a, b, ex.options), MatrixLabError);
    else assert.ok(runOperation(ex.op, a, b, ex.options).steps.length > 0, ex.title);
  }
  assert.ok(helpHtml().includes("Propiedades de los determinantes"));
});

test("sistemas de los ejemplos: única, infinitas y sin solución", () => {
  const kind = (title) => {
    const ex = HELP_EXAMPLES.find((e) => e.title === title);
    return runOperation("system", parseMatrix(ex.a.map((r) => r.map(String))), null, {}).message[0];
  };
  assert.equal(kind("Solución única"), "ok");
  assert.equal(kind("Infinitas soluciones"), "warn");
  assert.equal(kind("Sin solución"), "error");
});

test("Gauss: método y matriz aumentada llegan hasta el resultado", () => {
  const sq = F([[0, 2, 1], [1, 1, 1], [2, 1, -1]]);
  assert.match(runOperation("gauss", sq, null, { gaussMode: "gauss" }).results[0][0], /REF/);
  assert.match(runOperation("gauss", sq, null, { gaussMode: "jordan" }).results[0][0], /RREF/);
  const aug = runOperation("gauss", F([[1, 1, 2], [1, 1, 3]]), null, { augmented: true });
  assert.ok(aug.summary.some((l) => /Matriz aumentada/.test(l)));
  assert.ok(aug.summary.some((l) => /Rango incompleto/.test(l)));
  assert.throws(() => runOperation("gauss", F([[1], [2]]), null, { augmented: true }), MatrixLabError);
});

test("determinante: el resumen incluye las comprobaciones con los otros métodos", () => {
  const out = runOperation("det", A, null, {});
  assert.ok(out.summary.some((l) => /Todos los métodos dan el mismo valor/.test(l)));
  assert.ok(out.summary.some((l) => /Sarrus/.test(l)));
  assert.equal(out.results[0][1].toString(), "-1");
});

test("adjunta: muestra A·adj(A) y det(A)·I y confirma la propiedad", () => {
  const out = runOperation("adjugate", A, null, {});
  assert.deepEqual(out.results.map((r) => r[0].split(" ")[0]), ["Matriz", "Matriz", "A·adj(A)", "det(A)·I"]);
  assert.equal(out.message[0], "ok");
});

test("errores previstos: no cuadrada, dimensiones, escalar inválido, Sarrus fuera de 3×3 y operación desconocida", () => {
  const rect = F([[1, 2, 3], [4, 5, 6]]);
  for (const key of ["det", "cofactors", "adjugate", "inverse"]) {
    assert.throws(() => runOperation(key, rect, null, {}), /requiere una matriz cuadrada/, key);
  }
  assert.throws(() => runOperation("sum", A, F([[1, 2], [3, 4]]), {}), /mismas dimensiones/);
  assert.throws(() => runOperation("scalar", A, null, { scalar: "x" }), /Escalar k/);
  assert.throws(() => runOperation("scalar", A, null, { scalar: "1/0" }), /denominador cero/);
  assert.throws(() => runOperation("nada", A, null, {}), MatrixLabError);
  assert.throws(() => runOperation("det", F([[1, 2], [3, 4]]), null, { detMethod: "sarrus" }), /3×3/);
  assert.throws(() => runOperation("det", A, null, { detMethod: "order2" }), /2×2/);
});

test("celdas consultables y patrón de signos con + y −", () => {
  const out = runOperation("cofactors", A, null, {});
  const [, minors, minorsOpts] = out.results[0];
  const [, signs, signsOpts] = out.results[1];
  const html = resultsHtml(out.results);
  assert.ok(html.includes("data-info") && html.includes("Haz clic en una celda"));
  assert.match(minorsOpts.info(0, 0), /M₁₁ = det de A sin la fila 1 y la columna 1/);
  assert.equal(signsOpts.format(signs[0][1]), "−");
  assert.equal(signsOpts.format(signs[0][0]), "+");
  assert.ok(matrixHtml(signs, { format: signsOpts.format }).includes(">−<"));
  assert.equal(minors.length, 3);
});

test("modo decimal: sólo cambia lo que se muestra, no los datos", () => {
  const third = new Fraction(1, 3);
  try {
    setNumberMode("decimal");
    const html = matrixHtml([[third]]);
    assert.ok(html.includes(">0.3333<"));
    assert.ok(html.includes('title="1/3"'), "el valor exacto sigue disponible");
    assert.ok(resultsHtml([["x", [[third]]]]).includes("redondeados"));
    assert.ok(!resultsHtml([["x", [[new Fraction(2)]]]]).includes("redondeados"));
  } finally {
    setNumberMode("fraction");
  }
  assert.ok(matrixHtml([[third]]).includes("frac"));
  assert.ok(third.eq(new Fraction(1, 3)));
});

test("tamaño máximo configurable (?maxDim=) con límites seguros", () => {
  assert.equal(DEFAULT_MAX_DIM, 10);
  assert.equal(maxDimFromUrl("?maxDim=12"), 12);
  assert.equal(maxDimFromUrl("?maxDim=0"), null);
  assert.equal(maxDimFromUrl("?maxDim=500"), null);
  assert.equal(maxDimFromUrl("?maxDim=abc"), null);
  assert.equal(maxDimFromUrl(""), null);
});
