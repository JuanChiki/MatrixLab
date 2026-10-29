/**
 * Configuración de MatrixLab.
 *
 * El tamaño máximo de las matrices NO es una restricción matemática de los métodos:
 * sólo cuida que la pantalla siga siendo legible. Se puede cambiar de dos formas:
 *   1. Editando DEFAULT_MAX_DIM aquí.
 *   2. Abriendo la página con ?maxDim=12 al final de la dirección (entre 1 y 30).
 */

export const DEFAULT_MAX_DIM = 10;
const ABSOLUTE_LIMIT = 30;

/** Lee ?maxDim=N de la dirección (sólo existe en el navegador; en Node se usa el valor por defecto). */
export function maxDimFromUrl(search) {
  const raw = new URLSearchParams(search ?? "").get("maxDim");
  const value = raw === null ? NaN : Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= ABSOLUTE_LIMIT ? value : null;
}

export const CONFIG = Object.freeze({
  maxDim: maxDimFromUrl(globalThis.location?.search) ?? DEFAULT_MAX_DIM,
});
