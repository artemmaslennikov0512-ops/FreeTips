/**
 * GET /api/cabinet/establishment/floor — залы и столы с открытыми сессиями (ЛК официанта).
 */

import { NextRequest, NextResponse } from "next/server";
import { EstablishmentServiceSessionStatus } from "@prisma/client";
import { requireEstablishmentEmployee } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { ensureTablePaySlugsForEstablishment } from "@/lib/ensure-table-pay-slugs";

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentEmployee(request);
  if ("response" in auth) return auth.response;

  await ensureTablePaySlugsForEstablishment(auth.establishmentId);

  const halls = await db.establishmentHall.findMany({
    where: { establishmentId: auth.establishmentId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      tables: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
    },
  });

  const openSessions = await db.establishmentServiceSession.findMany({
    where: {
      establishmentId: auth.establishmentId,
      status: EstablishmentServiceSessionStatus.OPEN,
    },
    include: {
      employee: { select: { id: true, name: true } },
      tableOrder: {
        select: {
          id: true,
          status: true,
          totalKop: true,
          _count: { select: { lines: true } },
        },
      },
    },
  });

  const byTableId = new Map(
    openSessions.map((s) => {
      const mySession = !s.employeeId || s.employeeId === auth.employeeId;
      const foreign = s.employeeId && s.employeeId !== auth.employeeId;
      return [
        s.tableId,
        {
          id: s.id,
          employeeId: s.employeeId,
          employeeName: s.employee?.name ?? null,
          mySession,
          order: foreign
            ? null
            : s.tableOrder
              ? {
                  id: s.tableOrder.id,
                  status: s.tableOrder.status,
                  totalKop: s.tableOrder.totalKop.toString(),
                  lineCount: s.tableOrder._count.lines,
                }
              : null,
        },
      ];
    }),
  );

  return NextResponse.json({
    employeeId: auth.employeeId,
    halls: halls.map((h) => ({
      id: h.id,
      name: h.name,
      sortOrder: h.sortOrder,
      tables: h.tables.map((t) => {
        const sess = byTableId.get(t.id);
        return {
          id: t.id,
          label: t.label,
          capacity: t.capacity,
          hallId: h.id,
          hallName: h.name,
          tablePaySlug: t.tablePaySlug,
          openSession: sess
            ? {
                id: sess.id,
                employeeId: sess.employeeId,
                employeeName: sess.employeeName,
                mySession: sess.mySession,
                order: sess.order,
              }
            : null,
        };
      }),
    })),
  });
}
