/**
 * Hebrew-locale date formatters used across the app.
 */

const HE = 'he-IL'

/** "27 בנובמבר 2026" */
export function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString(HE, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** "27/11/2026" */
export function fmtDateShort(d: string | Date): string {
  return new Date(d).toLocaleDateString(HE)
}

/** "27/11/2026 18:43" */
export function fmtDateTime(d: string | Date): string {
  return new Date(d).toLocaleString(HE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** YYYY-MM-DD - what HTML date inputs expect. */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
