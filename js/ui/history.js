/**
 * Historial de cálculos guardado en el navegador (localStorage).
 *
 * Cada entrada guarda la operación, las matrices como texto y las opciones, de modo
 * que se puede volver a cargar y calcular con un clic. Si el navegador no permite
 * guardar (modo privado, etc.) la aplicación sigue funcionando sin historial.
 */

const KEY = "matrixlab.history.v1";
const MAX_ENTRIES = 15;

const isGrid = (g) => Array.isArray(g) && g.length > 0 && g.every((r) => Array.isArray(r) && r.length === g[0].length);

/** Una entrada es válida si tiene la forma esperada (el almacenamiento puede haber sido modificado). */
export function isValidEntry(e) {
  return !!e && typeof e.op === "string" && isGrid(e.a) && (e.b === null || isGrid(e.b));
}

export function loadHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(value) ? value.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* sin almacenamiento disponible: se ignora */
  }
}

/** Agrega una entrada al inicio (sin repetir la anterior idéntica). Devuelve la lista nueva. */
export function pushEntry(entry) {
  const list = loadHistory();
  const sameAsLast = list[0] && JSON.stringify({ ...list[0], t: 0 }) === JSON.stringify({ ...entry, t: 0 });
  if (!sameAsLast) {
    list.unshift(entry);
    list.length = Math.min(list.length, MAX_ENTRIES);
    save(list);
  }
  return list;
}

export function clearHistory() {
  save([]);
}
