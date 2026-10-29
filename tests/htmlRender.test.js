import test from "node:test";
import assert from "node:assert/strict";
import { F } from "./helpers.js";
import { Fraction } from "../js/utils/fraction.js";
import { gaussJordan } from "../js/core/gaussJordan.js";
import { escapeHtml, matrixHtml, stepHtml, textHtml, resultsHtml } from "../js/ui/htmlRender.js";

test("matrixHtml apila las fracciones exactas y usa el signo menos tipográfico", () => {
  const html = matrixHtml([[new Fraction(1, 2), new Fraction(-3)], [new Fraction(0), new Fraction(-7, 3)]]);
  assert.ok(html.includes("<span>1</span><span>2</span>"), "1/2 apilado");
  assert.ok(html.includes('<span class="neg">−</span><span class="frac"><span>7</span><span>3</span>'), "−7/3 apilado");
  for (const t of ["−3", ">0<"]) assert.ok(html.includes(t), t);
  assert.ok(!html.includes("0.5"));
});

test("pivote, filas modificadas y separador de matriz aumentada se marcan con clases", () => {
  const html = matrixHtml(F([[1, 0, 1, 0], [0, 1, 0, 1]]), { highlightRows: [1], pivot: [0, 0], splitCol: 2 });
  assert.ok(html.includes("pivot") && html.includes("row-hl") && html.includes("split"));
});

test("todos los pasos de Gauss-Jordan se dibujan", () => {
  const r = gaussJordan([[0, 2, 1], [1, 1, 1], [2, 1, -1]]);
  r.steps.forEach((s, k) => assert.ok(stepHtml(s, `Paso ${k + 1} de ${r.steps.length}`).includes("Paso")));
});

test("el texto se escapa (no se puede inyectar HTML) y los saltos de línea pasan a <br>", () => {
  assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  assert.ok(textHtml("a\nb").includes("<br>"));
});

test("resultsHtml muestra dimensiones, valores y mensaje", () => {
  const html = resultsHtml([["A⁻¹", F([[1, 2, 3], [4, 5, 6]])], ["det(A)", new Fraction(-2)]], ["ok", "listo"]);
  assert.ok(html.includes("Dimensiones: 2×3") && html.includes("−2") && html.includes("listo"));
  assert.ok(resultsHtml([]).includes("Sin resultados"));
});
