import type { EstablishmentBookingStatus } from "@prisma/client";

type BookingWithTable = {
  id: string;
  establishmentId: string;
  tableId: string | null;
  guestId: string | null;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  partySize: number;
  startsAt: Date;
  endsAt: Date;
  status: EstablishmentBookingStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  table: {
    id: string;
    label: string;
    capacity: number;
    hall: { name: string };
  } | null;
  guest: { id: string; displayName: string } | null;
};

export function serializeEstablishmentBooking(b: BookingWithTable) {
  return {
    id: b.id,
    establishmentId: b.establishmentId,
    tableId: b.tableId,
    guestId: b.guestId,
    guestName: b.guestName,
    guestPhone: b.guestPhone,
    guestEmail: b.guestEmail,
    partySize: b.partySize,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    status: b.status,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    table: b.table
      ? {
          id: b.table.id,
          label: b.table.label,
          capacity: b.table.capacity,
          hallName: b.table.hall.name,
        }
      : null,
    guest: b.guest ? { id: b.guest.id, displayName: b.guest.displayName } : null,
  };
}
