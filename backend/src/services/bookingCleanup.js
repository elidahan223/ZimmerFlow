/**
 * Hard-delete every row tied to a booking group AND the contract PDFs in
 * S3. Used when a deposit payment fails (Cardcom session never created,
 * Cardcom transaction declined, etc.) — the customer didn't pay so
 * nothing about the attempt should remain.
 *
 * Order matters: signatureEvents → contracts → notifications → payments
 * → bookings. bookingRooms cascade with their parent booking. Without
 * this ordering the delete fails silently on FK constraints and leaves
 * zombie PENDING_PAYMENT bookings that keep blocking room availability.
 */

const prisma = require('../config/database');
const { deleteContract } = require('./s3');

async function deleteBookingGroup(bookingGroupId) {
  if (!bookingGroupId) return { deleted: 0, s3KeysDeleted: 0 };

  // Snapshot the S3 keys first — once we delete the contract rows we
  // can't look them up anymore.
  const contracts = await prisma.contract.findMany({
    where: { booking: { bookingGroupId } },
    select: { id: true, signedFileUrl: true, fileUrl: true },
  });
  const contractIds = contracts.map((c) => c.id);
  const s3Keys = new Set();
  for (const c of contracts) {
    if (c.signedFileUrl) s3Keys.add(c.signedFileUrl);
    if (c.fileUrl && c.fileUrl !== c.signedFileUrl) s3Keys.add(c.fileUrl);
  }

  const result = await prisma.$transaction(async (db) => {
    if (contractIds.length > 0) {
      await db.signatureEvent.deleteMany({ where: { contractId: { in: contractIds } } });
      await db.contract.deleteMany({ where: { id: { in: contractIds } } });
    }
    await db.notification.deleteMany({ where: { booking: { bookingGroupId } } });
    await db.payment.deleteMany({ where: { bookingGroupId } });
    const bookings = await db.booking.deleteMany({ where: { bookingGroupId } });
    return { deleted: bookings.count };
  });

  // S3 cleanup outside the transaction (S3 isn't transactional).
  let s3KeysDeleted = 0;
  for (const key of s3Keys) {
    try {
      await deleteContract(key);
      s3KeysDeleted++;
    } catch (e) {
      console.error(`[bookingCleanup] failed to delete S3 contract ${key}:`, e.message);
    }
  }

  console.log(`[bookingCleanup] removed bookingGroupId=${bookingGroupId}: ${result.deleted} bookings, ${s3KeysDeleted} S3 PDFs`);
  return { deleted: result.deleted, s3KeysDeleted };
}

module.exports = { deleteBookingGroup };
