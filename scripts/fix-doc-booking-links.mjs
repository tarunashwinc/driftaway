/**
 * Data correction: link trip documents to bookings by matching
 * metadata.bookingRef  →  booking.confirmationRef
 *
 * Run: node scripts/fix-doc-booking-links.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Get all trips
  const trips = await prisma.trip.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true },
  });

  let totalFixed = 0;

  for (const trip of trips) {
    const bookings = await prisma.booking.findMany({
      where: { tripId: trip.id },
      select: { id: true, confirmationRef: true, name: true },
    });

    const refToBookingId = new Map();
    for (const b of bookings) {
      if (b.confirmationRef) {
        refToBookingId.set(b.confirmationRef.trim(), b.id);
      }
    }

    if (refToBookingId.size === 0) continue;

    const docs = await prisma.document.findMany({
      where: { tripId: trip.id },
      select: { id: true, name: true, metadata: true },
    });

    let fixed = 0;
    for (const doc of docs) {
      const meta = doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {};

      // Skip if already has a valid bookingId
      if (meta.bookingId && typeof meta.bookingId === "string" && meta.bookingId.length > 10) continue;

      // Try to match by bookingRef in metadata
      const bookingRef = meta.bookingRef ?? meta.confirmationRef ?? meta.bookingNumber;
      if (!bookingRef || typeof bookingRef !== "string") continue;

      const matchedBookingId = refToBookingId.get(bookingRef.trim());
      if (!matchedBookingId) {
        console.log(`  ⚠️  No booking match for doc "${doc.name?.slice(0, 40)}" — ref: ${bookingRef}`);
        continue;
      }

      // Update metadata to include bookingId
      const updatedMeta = { ...meta, bookingId: matchedBookingId };
      await prisma.document.update({
        where: { id: doc.id },
        data: { metadata: updatedMeta },
      });

      console.log(`  ✓ Linked doc "${doc.name?.slice(0, 40)}" → booking ${matchedBookingId.slice(0, 8)}… (ref: ${bookingRef})`);
      fixed++;
    }

    if (fixed > 0) {
      console.log(`\n✅ Trip "${trip.title}": fixed ${fixed} document(s)\n`);
      totalFixed += fixed;
    }
  }

  console.log(`\n🎉 Done — ${totalFixed} document(s) linked to bookings.`);
}

main()
  .catch((e) => { console.error("❌ Script failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
