// Deep-merges saved data onto a set of defaults, so new fields introduced
// later don't crash old saved projects. Extracted from what was an
// unexported function in store.tsx so the migration module (see
// migration.ts) can share it without duplicating the logic.
export function deepMerge(def: unknown, sav: unknown): unknown {
  if (sav === undefined || sav === null) return def;
  if (Array.isArray(def)) {
    if (!Array.isArray(sav)) return def;
    if (def.length && typeof def[0] === "object" && def[0] !== null && !Array.isArray(def[0])) {
      return sav.map((s, i) => deepMerge(def[Math.min(i, def.length - 1)], s));
    }
    return sav;
  }
  if (def && typeof def === "object") {
    const o: Record<string, unknown> = {};
    const defObj = def as Record<string, unknown>;
    const savObj = (sav && typeof sav === "object" ? sav : {}) as Record<string, unknown>;
    for (const k of Object.keys(defObj)) o[k] = deepMerge(defObj[k], savObj[k]);
    for (const k of Object.keys(savObj)) if (!(k in o)) o[k] = savObj[k];
    return o;
  }
  return sav;
}
