export function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * WP/ACF sometimes returns presenter references as "" or [] or [id, id].
 * Rule:
 *  - missing, null, "" => []
 *  - array => filtered array of numbers
 */
export function presenterIdArray(v) {
  if (!v) return [];
  if (typeof v === 'string') return v.trim() ? [] : [];
  if (Array.isArray(v)) return v.map(Number).filter((n) => Number.isFinite(n));
  return [];
}

export function firstPresenterId(v) {
  const ids = presenterIdArray(v);
  return ids.length ? ids[0] : null;
}

export function roomIdFromEvent(event) {
  const r = event?.room;
  if (Array.isArray(r) && r.length) return Number(r[0]);
  return null;
}

export function typeIdFromEvent(event) {
  const t = event?.['wigc-event-type'];
  if (Array.isArray(t) && t.length) return Number(t[0]);
  return null;
}
