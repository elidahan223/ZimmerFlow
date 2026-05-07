/**
 * Test for check_availability tool.
 * Run with: node --test tests/agent.test.js
 *
 * Requires a running Postgres with the Prisma schema migrated.
 * Creates and tears down its own test data.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/config/database');
const { checkAvailability } = require('../src/services/agent');

let testCompoundId;
let testUserId;
let testCustomerId;
let testBookingId;

before(async () => {
  const user = await prisma.user.create({
    data: {
      cognitoSub: `test-sub-${Date.now()}`,
      firstName: 'Test',
      lastName: 'Owner',
      role: 'OWNER',
    },
  });
  testUserId = user.id;

  const compound = await prisma.compound.create({
    data: {
      name: 'Test Compound',
      capacity: 4,
      weekdayPrice: 1000,
      weekendPrice: 1500,
      status: 'ACTIVE',
    },
  });
  testCompoundId = compound.id;

  const customer = await prisma.customer.create({
    data: { fullName: 'Test Customer', phone: '050-0000000' },
  });
  testCustomerId = customer.id;

  // Existing booking: 2026-06-10 to 2026-06-15 (CONFIRMED)
  const booking = await prisma.booking.create({
    data: {
      compoundId: testCompoundId,
      customerId: testCustomerId,
      createdByUserId: testUserId,
      checkIn: new Date('2026-06-10'),
      checkOut: new Date('2026-06-15'),
      guestsCount: 2,
      status: 'CONFIRMED',
    },
  });
  testBookingId = booking.id;
});

after(async () => {
  await prisma.booking.deleteMany({ where: { id: testBookingId } });
  await prisma.customer.deleteMany({ where: { id: testCustomerId } });
  await prisma.compound.deleteMany({ where: { id: testCompoundId } });
  await prisma.user.deleteMany({ where: { id: testUserId } });
  await prisma.$disconnect();
});

test('available - dates fully before existing booking', async () => {
  const r = await checkAvailability({
    compoundId: testCompoundId,
    check_in: '2026-06-01',
    check_out: '2026-06-05',
  });
  assert.equal(r.available, true);
  assert.equal(r.conflicting_dates.length, 0);
});

test('not available - dates fully overlap existing booking', async () => {
  const r = await checkAvailability({
    compoundId: testCompoundId,
    check_in: '2026-06-11',
    check_out: '2026-06-13',
  });
  assert.equal(r.available, false);
  assert.equal(r.conflicting_dates.length, 1);
});

test('not available - partial overlap (check-in during existing booking)', async () => {
  const r = await checkAvailability({
    compoundId: testCompoundId,
    check_in: '2026-06-12',
    check_out: '2026-06-20',
  });
  assert.equal(r.available, false);
});

test('available - check-in exactly when existing booking checks out', async () => {
  // Existing booking ends 2026-06-15. New check-in 2026-06-15 is OK.
  const r = await checkAvailability({
    compoundId: testCompoundId,
    check_in: '2026-06-15',
    check_out: '2026-06-20',
  });
  assert.equal(r.available, true);
});

test('error - invalid date format', async () => {
  const r = await checkAvailability({
    compoundId: testCompoundId,
    check_in: 'not-a-date',
    check_out: '2026-06-20',
  });
  assert.ok(r.error);
});

test('error - check-out before check-in', async () => {
  const r = await checkAvailability({
    compoundId: testCompoundId,
    check_in: '2026-06-20',
    check_out: '2026-06-10',
  });
  assert.ok(r.error);
});

test('cancelled bookings do not block availability', async () => {
  // Add a cancelled booking that overlaps with a date range
  const cancelled = await prisma.booking.create({
    data: {
      compoundId: testCompoundId,
      customerId: testCustomerId,
      createdByUserId: testUserId,
      checkIn: new Date('2026-07-01'),
      checkOut: new Date('2026-07-05'),
      guestsCount: 2,
      status: 'CANCELLED',
    },
  });

  const r = await checkAvailability({
    compoundId: testCompoundId,
    check_in: '2026-07-02',
    check_out: '2026-07-04',
  });
  assert.equal(r.available, true);

  await prisma.booking.delete({ where: { id: cancelled.id } });
});
