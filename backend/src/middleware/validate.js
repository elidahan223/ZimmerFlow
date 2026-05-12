/**
 * Lightweight, dependency-free input validators.
 * Each helper throws a 400 with a Hebrew message when validation fails.
 * Use directly inside route handlers — no schema library required.
 */

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

const ISRAELI_PHONE = /^0\d{1,2}-?\d{3}-?\d{4}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISRAELI_ID = /^\d{5,9}$/;

function requireString(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== 'string') {
    throw new ValidationError(`שדה "${field}" חייב להיות טקסט`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new ValidationError(`שדה "${field}" קצר מדי (מינימום ${min} תווים)`);
  }
  if (trimmed.length > max) {
    throw new ValidationError(`שדה "${field}" ארוך מדי (מקסימום ${max} תווים)`);
  }
  return trimmed;
}

function optionalString(value, field, opts) {
  if (value === undefined || value === null || value === '') return null;
  return requireString(value, field, opts);
}

function requirePhone(value, field = 'טלפון') {
  const s = requireString(value, field, { min: 9, max: 20 });
  if (!ISRAELI_PHONE.test(s)) {
    throw new ValidationError(`שדה "${field}" אינו מספר טלפון תקין`);
  }
  return s;
}

function optionalEmail(value, field = 'אימייל') {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !EMAIL.test(value.trim())) {
    throw new ValidationError(`שדה "${field}" אינו אימייל תקין`);
  }
  return value.trim();
}

function optionalId(value, field = 'תעודת זהות') {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !ISRAELI_ID.test(value)) {
    throw new ValidationError(`שדה "${field}" אינו תעודת זהות תקינה`);
  }
  return value;
}

function requireNumber(value, field, { min, max } = {}) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`שדה "${field}" חייב להיות מספר`);
  }
  if (min !== undefined && n < min) {
    throw new ValidationError(`שדה "${field}" קטן מהמינימום (${min})`);
  }
  if (max !== undefined && n > max) {
    throw new ValidationError(`שדה "${field}" גדול מהמקסימום (${max})`);
  }
  return n;
}

function optionalEnum(value, field, allowed) {
  if (value === undefined || value === null || value === '') return null;
  if (!allowed.includes(value)) {
    throw new ValidationError(`שדה "${field}" חייב להיות אחד מ: ${allowed.join(', ')}`);
  }
  return value;
}

module.exports = {
  ValidationError,
  requireString,
  optionalString,
  requirePhone,
  optionalEmail,
  optionalId,
  requireNumber,
  optionalEnum,
};
