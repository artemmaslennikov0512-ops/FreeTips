import { db } from "@/lib/db";
import { allocateNextGlobalWaiterCode } from "@/lib/waiter-qr-identifier";

/** Выдаёт постоянный tablePaySlug всем столам заведения, у которых его ещё нет (глобальные коды NNN-NNN). */
export async function ensureTablePaySlugsForEstablishment(establishmentId: string): Promise<void> {
  const tables = await db.establishmentTable.findMany({
    where: { hall: { establishmentId }, tablePaySlug: null },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (tables.length === 0) return;

  await db.$transaction(async (tx) => {
    for (const t of tables) {
      const slug = await allocateNextGlobalWaiterCode(tx);
      await tx.establishmentTable.update({
        where: { id: t.id },
        data: { tablePaySlug: slug },
      });
    }
  });
}
