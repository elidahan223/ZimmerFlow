/**
 * Payment routes — Cardcom Low Profile integration.
 *
 *   POST /api/payments/webhook            — server-to-server confirmation
 *   GET  /api/payments/redirect/success   — browser redirect after success
 *   GET  /api/payments/redirect/failure   — browser redirect after failure
 *   GET  /api/payments/status/:paymentId  — frontend poll for status
 *
 * The deposit Payment row is created inside POST /api/bookings/request,
 * which also calls cardcomService.createLowProfileDeal() and hands the URL
 * back to the frontend. This file handles what happens after the customer
 * pays (or doesn't): verifying with Cardcom and updating bookings.
 */

const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { getLowProfileResult, isTransactionSuccessful } = require('../services/cardcomService');
const { deleteBookingGroup } = require('../services/bookingCleanup');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5183';

// Settle a payment based on Cardcom's verification result.
// On success: confirm the bookings and stamp the deposit timestamp.
// On failure: hard-delete the bookings + contracts + payment + S3 PDFs so
//   nothing is saved when the customer didn't pay. Returns the (possibly
//   already deleted) payment row for the caller to inspect status from.
async function settlePayment({ payment, success, cardcomResponse }) {
  const tx = cardcomResponse?.TranzactionInfo || {};
  const now = new Date();

  if (success) {
    return prisma.$transaction(async (db) => {
      const updated = await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          paidAt: now,
          cardcomTransactionId: tx.TranzactionId ? String(tx.TranzactionId) : null,
          cardcomDealNumber: tx.TranzactionId ? String(tx.TranzactionId) : null,
          cardLast4: tx.Last4CardDigits ? String(tx.Last4CardDigits) : null,
          rawResponse: cardcomResponse,
          errorMessage: null,
        },
      });
      await db.booking.updateMany({
        where: { bookingGroupId: payment.bookingGroupId },
        data: { status: 'CONFIRMED', depositPaidAt: now },
      });
      return updated;
    });
  }

  // Failure path — hard delete everything via the shared helper so the
  // dependency order (signatureEvents → contracts → notifications →
  // payments → bookings) matches and FK constraints don't strand zombie
  // PENDING_PAYMENT rows.
  try {
    await deleteBookingGroup(payment.bookingGroupId);
  } catch (e) {
    console.error('[payments] cleanup failed:', e.message);
  }

  // Return a synthetic FAILED payment so callers can still read status.
  return {
    ...payment,
    status: 'FAILED',
    failedAt: now,
    errorMessage: tx.Description || cardcomResponse?.Description || `Cardcom code ${tx.ResponseCode ?? cardcomResponse?.ResponseCode}`,
  };
}

// Idempotent verification — given a payment row that's still PENDING, hit
// Cardcom to resolve it. Returns the updated payment. If it's already
// finalised (COMPLETED/FAILED/CANCELLED/REFUNDED), returns it as-is.
async function verifyAndSettle(payment) {
  if (payment.status !== 'PENDING') return payment;
  if (!payment.cardcomLowProfileId) {
    console.warn(`[payments] payment ${payment.id} has no cardcomLowProfileId — marking FAILED`);
    return settlePayment({ payment, success: false, cardcomResponse: { Description: 'No LowProfileId on payment record' } });
  }
  const result = await getLowProfileResult(payment.cardcomLowProfileId);
  const success = isTransactionSuccessful(result);
  console.log(`[payments] payment ${payment.id} verified: ${success ? 'success' : 'failed'}`);
  return settlePayment({ payment, success, cardcomResponse: result });
}

// ── Webhook: server-to-server from Cardcom ───────────────────────────────
// Cardcom POSTs the transaction details here. We re-verify via the API
// (never trust the webhook body alone) and update the DB. Must respond 200
// quickly so Cardcom doesn't retry; even on internal errors we ack with 200
// and rely on the redirect handler or the next webhook as backup.
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body || {};
    const lowProfileId =
      body.LowProfileId || body.lowprofileid ||
      body.LowProfileCode || body.lowprofilecode ||
      req.query.lowprofileid || req.query.LowProfileId;
    const returnValue =
      body.ReturnValue || body.returnvalue || req.query.ReturnValue;
    console.log('[payments] webhook received:', JSON.stringify({
      lowProfileId,
      returnValue,
      ResponseCode: body.ResponseCode,
      bodyKeys: Object.keys(body),
    }));

    let payment = null;
    if (lowProfileId) {
      payment = await prisma.payment.findFirst({
        where: { cardcomLowProfileId: String(lowProfileId) },
      });
    }
    if (!payment && returnValue) {
      payment = await prisma.payment.findUnique({
        where: { id: String(returnValue) },
      });
    }
    if (!payment) {
      console.warn(`[payments] webhook could not locate payment (lpid=${lowProfileId}, returnValue=${returnValue})`);
      return res.status(200).json({ received: true });
    }
    await verifyAndSettle(payment);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[payments] webhook error:', err.message, err.stack);
    // Still 200 so Cardcom doesn't keep retrying — the redirect handler
    // will reconcile if the webhook ever drops the payment on the floor.
    return res.status(200).json({ received: true });
  }
});

// ── Browser redirects from Cardcom ───────────────────────────────────────
// The customer ends up here after entering (or failing to enter) card info.
// We verify, settle, then 302 the browser to a frontend page.
async function handleRedirect(req, res, presumedSuccess) {
  // Cardcom v11 sends back different param names depending on integration
  // and account configuration. Try every form we've seen in the wild, and
  // fall back to ReturnValue (which we set to payment.id when creating the
  // session) so we can still match the row even if no LowProfileId comes
  // through. Log everything to make future mismatches obvious.
  console.log('[payments] redirect query params:', JSON.stringify(req.query));
  const lowProfileId =
    req.query.lowprofileid ||
    req.query.LowProfileId ||
    req.query.lowprofilecode ||
    req.query.LowProfileCode ||
    req.query.LPC;
  const returnValue =
    req.query.ReturnValue ||
    req.query.returnvalue ||
    req.query.returnValue;

  try {
    let payment = null;
    if (lowProfileId) {
      payment = await prisma.payment.findFirst({
        where: { cardcomLowProfileId: String(lowProfileId) },
      });
    }
    if (!payment && returnValue) {
      payment = await prisma.payment.findUnique({
        where: { id: String(returnValue) },
      });
    }
    if (!payment) {
      console.warn(`[payments] redirect could not locate payment (lpid=${lowProfileId}, returnValue=${returnValue})`);
      return res.redirect(`${FRONTEND_URL}/payment/failure?error=unknown_payment`);
    }
    const settled = await verifyAndSettle(payment);
    const ok = settled.status === 'COMPLETED';
    const target = ok
      ? `${FRONTEND_URL}/payment/success?bookingGroupId=${payment.bookingGroupId}`
      : `${FRONTEND_URL}/payment/failure?bookingGroupId=${payment.bookingGroupId}`;
    return res.redirect(target);
  } catch (err) {
    console.error('[payments] redirect handler error:', err.message);
    return res.redirect(`${FRONTEND_URL}/payment/failure?error=server`);
  }
}

router.get('/redirect/success', (req, res) => handleRedirect(req, res, true));
router.get('/redirect/failure', (req, res) => handleRedirect(req, res, false));

// ── Status check ─────────────────────────────────────────────────────────
// Polled by the frontend on its success/failure page to render the right
// booking summary. No auth: the frontend already has the IDs from URL.
router.get('/status/:paymentId', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      select: {
        id: true,
        status: true,
        amount: true,
        type: true,
        bookingGroupId: true,
        paidAt: true,
        cardLast4: true,
        errorMessage: true,
      },
    });
    if (!payment) return res.status(404).json({ error: 'תשלום לא נמצא' });
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

router.get('/by-group/:bookingGroupId', async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { bookingGroupId: req.params.bookingGroupId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        status: true,
        type: true,
        amount: true,
        paidAt: true,
        cardLast4: true,
      },
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
