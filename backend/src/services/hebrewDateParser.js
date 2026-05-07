/**
 * Hebrew date parser.
 * Detects Hebrew date patterns and date ranges in free text and converts to ISO YYYY-MM-DD.
 * Returns { matches: [{ raw, iso }], range: { from, to } | null }.
 */

const MONTHS = {
  'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'מארס': 3, 'אפריל': 4,
  'מאי': 5, 'יוני': 6, 'יולי': 7, 'אוגוסט': 8,
  'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12,
};

const MONTH_NAMES_PATTERN = Object.keys(MONTHS).join('|');

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function inferYear(month, providedYear) {
  if (providedYear) {
    const y = parseInt(providedYear);
    return y < 100 ? 2000 + y : y;
  }
  // No year given - use current or next year (whichever makes the date in the future)
  const now = new Date();
  const currYear = now.getFullYear();
  const monthIdx = month - 1;
  const candidate = new Date(currYear, monthIdx, 1);
  return candidate < new Date(now.getFullYear(), now.getMonth(), 1) ? currYear + 1 : currYear;
}

function buildIso(day, month, year) {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const d = new Date(year, month - 1, day);
  if (d.getDate() !== day || d.getMonth() !== month - 1) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseHebrewDates(text) {
  if (!text || typeof text !== 'string') return { matches: [], range: null };

  const matches = [];

  // Pattern 1: range "DD-DD ב<חודש> [YYYY]" or "DD עד DD ב<חודש> [YYYY]"
  const rangePattern = new RegExp(
    `(\\d{1,2})\\s*(?:-|עד|–)\\s*(\\d{1,2})\\s+ב?-?(${MONTH_NAMES_PATTERN})(?:\\s+(\\d{2,4}))?`,
    'g'
  );
  let m;
  while ((m = rangePattern.exec(text)) !== null) {
    const day1 = parseInt(m[1]);
    const day2 = parseInt(m[2]);
    const month = MONTHS[m[3]];
    const year = inferYear(month, m[4]);
    const iso1 = buildIso(day1, month, year);
    const iso2 = buildIso(day2, month, year);
    if (iso1) matches.push({ raw: `${day1} ב${m[3]} ${year}`, iso: iso1 });
    if (iso2) matches.push({ raw: `${day2} ב${m[3]} ${year}`, iso: iso2 });
  }

  // Pattern 2: "DD ב<חודש> [YYYY]" — single date in Hebrew
  const singlePattern = new RegExp(
    `(\\d{1,2})\\s+ב?-?(${MONTH_NAMES_PATTERN})(?:\\s+(\\d{2,4}))?`,
    'g'
  );
  while ((m = singlePattern.exec(text)) !== null) {
    const day = parseInt(m[1]);
    const month = MONTHS[m[2]];
    const year = inferYear(month, m[3]);
    const iso = buildIso(day, month, year);
    if (iso && !matches.find((x) => x.iso === iso)) {
      matches.push({ raw: `${day} ב${m[2]} ${year}`, iso });
    }
  }

  // Pattern 3: numeric DD/MM/YYYY or DD.MM.YYYY (Israeli format)
  const numericPattern = /(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/g;
  while ((m = numericPattern.exec(text)) !== null) {
    const day = parseInt(m[1]);
    const month = parseInt(m[2]);
    const year = inferYear(month, m[3]);
    const iso = buildIso(day, month, year);
    if (iso && !matches.find((x) => x.iso === iso)) {
      matches.push({ raw: m[0], iso });
    }
  }

  // Sort by ISO date
  matches.sort((a, b) => a.iso.localeCompare(b.iso));

  // If there are >=2 dates, the first two are likely the range (check-in / check-out)
  let range = null;
  if (matches.length >= 2) {
    range = { from: matches[0].iso, to: matches[matches.length - 1].iso };
  } else if (matches.length === 1) {
    range = { from: matches[0].iso, to: null };
  }

  return { matches, range };
}

/**
 * Build a hint string to append to a user message, listing parsed dates so the model
 * doesn't have to interpret Hebrew month names itself.
 */
function buildDateHint(text) {
  const { matches, range } = parseHebrewDates(text);
  if (matches.length === 0) return '';

  const lines = [];
  lines.push('[date-parser hint: the following dates were extracted from the user message]');
  for (const m of matches) {
    lines.push(`  ${m.raw} = ${m.iso}`);
  }
  if (range && range.from && range.to && range.from !== range.to) {
    lines.push(`  → likely range: check_in=${range.from}, check_out=${range.to}`);
  }
  return lines.join('\n');
}

module.exports = { parseHebrewDates, buildDateHint };
