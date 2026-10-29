/**
 * Ayuda y ejemplos preparados.
 *
 * Los ejemplos sirven para la exposición: cada uno carga las matrices, elige la operación
 * y calcula. Se pueden usar también para probar casos especiales (singular, rectangular,
 * sistema sin solución…).
 */

import { escapeHtml } from "./htmlRender.js";

/** op: clave de la operación · a, b: matrices (números o textos) · options: opciones de esa operación. */
export const HELP_EXAMPLES = [
  { group: "Gauss y Gauss-Jordan", title: "Necesita intercambio de filas", desc: "El pivote de la primera columna es 0: hay que intercambiar F₁ ↔ F₂.", op: "gauss", a: [[0, 2, 1], [1, 1, 1], [2, 1, -1]] },
  { group: "Gauss y Gauss-Jordan", title: "Sólo eliminación de Gauss", desc: "La misma matriz, pero sin normalizar pivotes ni eliminar por encima: forma escalonada.", op: "gauss", a: [[0, 2, 1], [1, 1, 1], [2, 1, -1]], options: { gaussMode: "gauss" } },
  { group: "Gauss y Gauss-Jordan", title: "Matriz singular (rango 2)", desc: "Termina con una fila nula: el rango es menor que 3.", op: "gauss", a: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
  { group: "Gauss y Gauss-Jordan", title: "Matriz rectangular 2×3", desc: "Funciona con cualquier tamaño; la columna sin pivote queda libre.", op: "gauss", a: [[1, 2, 3], [4, 5, 6]] },
  { group: "Gauss y Gauss-Jordan", title: "Con fracciones", desc: "Los resultados se mantienen exactos: nada de 0.3333.", op: "gauss", a: [["1/2", "1/3", 1], ["1/4", "3/4", 2]] },
  { group: "Sistemas Ax = b", title: "Solución única", desc: "Tres ecuaciones, tres incógnitas: x₁ = 2, x₂ = 3, x₃ = −1.", op: "system", a: [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]] },
  { group: "Sistemas Ax = b", title: "Infinitas soluciones", desc: "La segunda ecuación es el doble de la primera: quedan variables libres.", op: "system", a: [[1, 2, -1, 3], [2, 4, -2, 6]] },
  { group: "Sistemas Ax = b", title: "Sin solución", desc: "x + y = 2 y x + y = 3 a la vez es imposible.", op: "system", a: [[1, 1, 2], [1, 1, 3]] },
  { group: "Determinantes", title: "Regla de Sarrus (3×3)", desc: "Diagonales que suman y diagonales que restan.", op: "det", a: [[2, 1, 1], [1, 3, 2], [1, 0, 0]], options: { detMethod: "sarrus" } },
  { group: "Determinantes", title: "Cofactores en una matriz 4×4", desc: "Expansión por la fila 2, que tiene un 0 y ahorra un cálculo.", op: "det", a: [[2, 0, 1, 3], [1, 1, 0, 2], [0, 2, 1, 1], [1, 0, 3, 1]], options: { detMethod: "cofactors-row", detIndex: 2 } },
  { group: "Determinantes", title: "Determinante cero", desc: "Una matriz con det(A) = 0 es singular.", op: "det", a: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
  { group: "Cofactores, adjunta e inversa", title: "Menores y cofactores", desc: "Haz clic en las celdas del resultado para ver de dónde sale cada valor.", op: "cofactors", a: [[2, 1, 1], [1, 3, 2], [1, 0, 0]] },
  { group: "Cofactores, adjunta e inversa", title: "Adjunta y comprobación", desc: "adj(A) = Cᵀ y se verifica que A·adj(A) = det(A)·I.", op: "adjugate", a: [[2, 1, 1], [1, 3, 2], [1, 0, 0]] },
  { group: "Cofactores, adjunta e inversa", title: "Inversa por Gauss-Jordan", desc: "Se reduce [A | I] hasta que la izquierda sea la identidad.", op: "inverse", a: [[2, 1, 1], [1, 3, 2], [1, 0, 0]], options: { invMethod: "gauss" } },
  { group: "Cofactores, adjunta e inversa", title: "Inversa de una matriz singular", desc: "No falla: explica por qué no existe la inversa.", op: "inverse", a: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
  { group: "Operaciones básicas", title: "Tipo de matriz", desc: "Reconoce una matriz simétrica.", op: "classify", a: [[1, 2, 3], [2, 4, 5], [3, 5, 6]] },
  { group: "Operaciones básicas", title: "Error de dimensiones", desc: "Multiplicar 2×3 por 2×2 no se puede: se explica el motivo.", op: "mul", a: [[1, 2, 3], [4, 5, 6]], b: [[1, 2], [3, 4]] },
];

const SHORTCUTS = [
  ["Ctrl + Enter", "Calcular"],
  ["← →", "Paso anterior / siguiente"],
  ["Inicio, Fin", "Ir al primer o al último paso"],
  ["Flechas y Enter", "Moverse entre las celdas de una matriz"],
  ["Ctrl + V", "Pegar una matriz desde Excel o Google Sheets"],
];

const DET_PROPERTIES = [
  "Intercambiar dos filas cambia el signo del determinante.",
  "Multiplicar una fila por un número k multiplica el determinante por k.",
  "Sumar a una fila un múltiplo de otra no cambia el determinante.",
  "det(Aᵀ) = det(A).",
  "det(I) = 1.",
  "Si det(A) = 0, la matriz es singular y no tiene inversa.",
  "Si una fila (o columna) es toda de ceros, o dos filas son iguales o proporcionales, det(A) = 0.",
  "det(A·B) = det(A)·det(B).",
];

/** Contenido del cuadro de ayuda. */
export function helpHtml() {
  const groups = [...new Set(HELP_EXAMPLES.map((e) => e.group))];
  const examples = groups
    .map(
      (g) => `<h4>${escapeHtml(g)}</h4><div class="ex-list">${HELP_EXAMPLES.map((e, i) =>
        e.group === g
          ? `<button type="button" class="ex-item" data-ex="${i}"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(e.desc)}</span></button>`
          : "",
      ).join("")}</div>`,
    )
    .join("");
  return `
    <section><h3>Cómo escribir los números</h3>
      <p>Enteros (<code>3</code>), decimales (<code>0.5</code> o <code>0,5</code>) y fracciones (<code>3/4</code>). Los decimales se convierten en fracciones exactas (0.5 pasa a ser 1/2), por eso no hay errores de redondeo ni tolerancias. Las celdas vacías o con texto se marcan en rojo.</p>
      <p>El tamaño máximo es de 10×10 y se puede cambiar con <code>?maxDim=12</code> al final de la dirección de la página.</p></section>
    <section><h3>Qué significan los colores</h3>
      <ul class="legend-list">
        <li><i class="swatch pivot"></i><b>Amarillo:</b> el pivote que se está usando.</li>
        <li><i class="swatch row"></i><b>Violeta:</b> la fila que cambia en esta operación.</li>
        <li><i class="swatch focus"></i><b>Verde:</b> los elementos que se señalan (diagonales de Sarrus, fila y columna de un menor, términos de un cofactor).</li>
      </ul></section>
    <section><h3>Atajos</h3>
      <dl class="keys">${SHORTCUTS.map(([k, d]) => `<dt><kbd>${escapeHtml(k)}</kbd></dt><dd>${escapeHtml(d)}</dd>`).join("")}</dl></section>
    <section><h3>Propiedades de los determinantes</h3>
      <ul>${DET_PROPERTIES.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
      <p class="muted">Al calcular un determinante, MatrixLab lo comprueba con los demás métodos y con la transpuesta.</p></section>
    <section><h3>Ejemplos preparados</h3>
      <p class="muted">Un clic carga la matriz, elige la operación y calcula.</p>${examples}</section>`;
}
