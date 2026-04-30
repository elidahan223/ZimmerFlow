import { HDate, HebrewCalendar, flags } from '@hebcal/core'

export interface Holiday {
  name: string
  type: 'jewish' | 'muslim'
  isYomTov?: boolean
}

export interface DayInfo {
  hebrewDate: string
  holidays: Holiday[]
}

const HOLIDAY_MASK =
  flags.CHAG |
  flags.MINOR_HOLIDAY |
  flags.MAJOR_FAST |
  flags.MINOR_FAST |
  flags.MODERN_HOLIDAY |
  flags.ROSH_CHODESH |
  flags.SPECIAL_SHABBAT |
  flags.EREV |
  flags.CHOL_HAMOED

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getMonthHolidays(year: number, month: number): Map<string, DayInfo> {
  const result = new Map<string, DayInfo>()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const daysInMonth = end.getDate()

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const hebrewDate = new HDate(date).renderGematriya(true, true)
    result.set(toDateStr(date), { hebrewDate, holidays: [] })
  }

  const events = HebrewCalendar.calendar({ start, end, il: true, locale: 'he' })

  for (const ev of events) {
    const mask = ev.getFlags()
    if ((mask & HOLIDAY_MASK) === 0) continue

    const key = toDateStr(ev.getDate().greg())
    const entry = result.get(key)
    if (!entry) continue

    const name = ev.render('he') || ev.renderBrief('he') || ev.getDesc()
    if (entry.holidays.some(h => h.name === name)) continue

    entry.holidays.push({
      name,
      type: 'jewish',
      isYomTov: Boolean(mask & flags.CHAG) && !(mask & flags.EREV),
    })
  }

  return result
}
