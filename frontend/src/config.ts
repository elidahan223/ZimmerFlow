/**
 * App-wide configuration constants.
 * Pull values from Vite env vars where set, fall back to sensible defaults.
 * Owner-specific details should ultimately come from the backend, but for now
 * these are the canonical client-side values - one place to update.
 */

export const OWNER_PHONE = (import.meta.env.VITE_OWNER_PHONE as string) || '054-668-8566'
export const OWNER_NAME = (import.meta.env.VITE_OWNER_NAME as string) || 'מורים דהן'
export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL as string) || 'elidahan223@walla.co.il'
export const PROPERTY_NAME = (import.meta.env.VITE_PROPERTY_NAME as string) || 'בקתות הזהב'
export const PROPERTY_ADDRESS = (import.meta.env.VITE_PROPERTY_ADDRESS as string) || 'רחוב הצאלון 60, מושבה מגדל'

/** Late checkout fee in NIS (per hour after the agreed checkout time). */
export const LATE_CHECKOUT_FEE = 100

/** Business / legal info used across legal pages. */
export const BUSINESS_TAX_ID = '067778753'
export const BUSINESS_TAX_STATUS = 'עוסק מורשה'
export const SECURITY_DEPOSIT_NIS = 1000
