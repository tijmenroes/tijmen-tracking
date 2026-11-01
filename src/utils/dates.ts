/**
 * Calendar-date helpers for 'YYYY-MM-DD' strings, always in the device's
 * local time zone.
 *
 * Avoid `date.toISOString().slice(0, 10)` for "today": toISOString is UTC, so
 * in the Netherlands anything between local midnight and 01:00/02:00 lands on
 * yesterday. Likewise `new Date('YYYY-MM-DD')` parses as UTC midnight, not
 * local midnight.
 *
 * Functions that depend on the current moment take it as a parameter so they
 * stay pure and testable.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format a Date as 'YYYY-MM-DD' using its local calendar date. */
export function toLocalIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Today's local calendar date as 'YYYY-MM-DD'. */
export function todayLocalIso(now: Date = new Date()): string {
  return toLocalIso(now)
}

/**
 * Parse 'YYYY-MM-DD' as local midnight on that date. Throws on anything that
 * isn't a real calendar date (e.g. '2026-02-31'), rather than letting Date
 * silently roll it over.
 */
export function parseLocalIsoDate(iso: string): Date {
  const match = ISO_DATE.exec(iso)
  if (!match) throw new RangeError(`Invalid ISO date: ${iso}`)
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new RangeError(`Invalid ISO date: ${iso}`)
  }
  return date
}

/**
 * Shift a calendar date by whole days. Goes through setDate rather than adding
 * 24h of milliseconds, because DST days are 23 or 25 hours long.
 */
export function addDaysIso(iso: string, days: number): string {
  const date = parseLocalIsoDate(iso)
  date.setDate(date.getDate() + days)
  return toLocalIso(date)
}

/** The Monday of the (Monday–Sunday) week containing this date. */
export function weekStartIso(iso: string): string {
  // getDay() is 0 for Sunday; map to days since Monday (Mon=0 … Sun=6).
  const daysSinceMonday = (parseLocalIsoDate(iso).getDay() + 6) % 7
  return addDaysIso(iso, -daysSinceMonday)
}
