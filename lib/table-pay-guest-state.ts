import { db } from "@/lib/db";
import {
  EstablishmentServiceSessionStatus,
  EstablishmentTableOrderStatus,
} from "@prisma/client";

const SLUG_RE = /^\d{3}-\d{3}$/;

export type TablePayGuestLine = {
  nameSnapshot: string;
  priceKop: string;
  quantity: number;
};

export type TablePayGuestBranding = {
  logoUrl?: string | null;
  logoOpacityPercent?: number | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  mainBackgroundColor?: string | null;
  blocksBackgroundColor?: string | null;
  fontColor?: string | null;
  borderColor?: string | null;
};

export type TablePayGuestPayload =
  | { state: "not_found" }
  | { state: "invalid_slug" }
  | {
      state: "serving";
      establishmentName: string;
      tableLabel: string;
      message: string;
      branding: TablePayGuestBranding | null;
    }
  | {
      state: "idle";
      establishmentName: string;
      tableLabel: string;
      message: string;
      branding: TablePayGuestBranding | null;
    }
  | {
      state: "checkout";
      establishmentName: string;
      tableLabel: string;
      totalKop: string;
      lines: TablePayGuestLine[];
      message: string;
      branding: TablePayGuestBranding | null;
    };

const estSelect = {
  id: true,
  name: true,
  logoUrl: true,
  logoOpacityPercent: true,
  primaryColor: true,
  secondaryColor: true,
  mainBackgroundColor: true,
  blocksBackgroundColor: true,
  fontColor: true,
  borderColor: true,
} as const;

export async function resolveTablePayGuestPayload(slug: string): Promise<TablePayGuestPayload> {
  const trimmed = slug.trim();
  if (!SLUG_RE.test(trimmed)) {
    return { state: "invalid_slug" };
  }

  const table = await db.establishmentTable.findFirst({
    where: { tablePaySlug: trimmed },
    include: {
      hall: {
        select: {
          name: true,
          establishment: { select: estSelect },
        },
      },
    },
  });

  if (!table) {
    return { state: "not_found" };
  }

  const establishmentName = table.hall.establishment.name;
  const tableLabel = table.label;
  const est = table.hall.establishment;
  const branding: TablePayGuestBranding | null = {
    logoUrl: est.logoUrl,
    logoOpacityPercent: est.logoOpacityPercent,
    primaryColor: est.primaryColor,
    secondaryColor: est.secondaryColor,
    mainBackgroundColor: est.mainBackgroundColor,
    blocksBackgroundColor: est.blocksBackgroundColor,
    fontColor: est.fontColor,
    borderColor: est.borderColor,
  };

  const openSession = await db.establishmentServiceSession.findFirst({
    where: {
      tableId: table.id,
      status: EstablishmentServiceSessionStatus.OPEN,
    },
    select: { id: true },
  });

  if (openSession) {
    return {
      state: "serving",
      establishmentName,
      tableLabel,
      message: "Стол обслуживается. Счёт для оплаты появится после того, как официант закроет стол.",
      branding,
    };
  }

  const latestClosed = await db.establishmentServiceSession.findFirst({
    where: {
      tableId: table.id,
      status: EstablishmentServiceSessionStatus.CLOSED,
    },
    orderBy: { closedAt: "desc" },
    include: {
      tableOrder: {
        include: {
          lines: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const order = latestClosed?.tableOrder;
  if (!order) {
    return {
      state: "idle",
      establishmentName,
      tableLabel,
      message: "Счёт ещё не выставлен. Отсканируйте код снова после заказа или уточните у официанта.",
      branding,
    };
  }

  if (order.status === EstablishmentTableOrderStatus.PAID) {
    return {
      state: "idle",
      establishmentName,
      tableLabel,
      message: "По этому столу нет счёта к оплате.",
      branding,
    };
  }

  if (order.status === EstablishmentTableOrderStatus.CANCELLED) {
    return {
      state: "idle",
      establishmentName,
      tableLabel,
      message: "Счёт отменён. При необходимости официант выставит новый.",
      branding,
    };
  }

  if (order.status === EstablishmentTableOrderStatus.PRESENTED) {
    return {
      state: "checkout",
      establishmentName,
      tableLabel,
      totalKop: order.totalKop.toString(),
      lines: order.lines.map((l) => ({
        nameSnapshot: l.nameSnapshot,
        priceKop: l.priceKopSnapshot.toString(),
        quantity: l.quantity,
      })),
      message: "Оплата меню будет доступна после подключения эквайринга. Сумма зафиксирована по пречеку.",
      branding,
    };
  }

  // OPEN на закрытой сессии не ожидается; на всякий случай — как ожидание счёта
  return {
    state: "idle",
    establishmentName,
    tableLabel,
    message: "Счёт ещё не готов к оплате.",
    branding,
  };
}
