import { db } from "@/lib/db";
import {
  getEstablishmentSharePercent,
  routingModeForTipLink,
  TIP_ROUTING_EMPLOYEE_QR,
  TIP_ROUTING_POOL_QR,
  type TipRoutingMode,
} from "@/lib/tip-routing";
import type { TipSplitSnapshot } from "@/lib/payment/gateway";

const estBrandingSelect = {
  id: true,
  name: true,
  tipRoutingMode: true,
  tipPoolUserId: true,
  logoUrl: true,
  logoOpacityPercent: true,
  primaryColor: true,
  secondaryColor: true,
  mainBackgroundColor: true,
  blocksBackgroundColor: true,
  fontColor: true,
  borderColor: true,
  borderWidthPx: true,
  borderOpacityPercent: true,
} as const;

export type PaySlugEstablishment = {
  id: string;
  name: string;
  tipRoutingMode: string | null;
  tipPoolUserId: string | null;
  logoUrl?: string | null;
  logoOpacityPercent?: number | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  mainBackgroundColor?: string | null;
  blocksBackgroundColor?: string | null;
  fontColor?: string | null;
  borderColor?: string | null;
  borderWidthPx?: number | null;
  borderOpacityPercent?: number | null;
};

export async function loadTipLinkForPaySlug(slug: string) {
  return db.tipLink.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      employeeId: true,
      employee: {
        select: {
          id: true,
          name: true,
          userId: true,
          photoUrl: true,
          establishmentId: true,
          establishment: { select: estBrandingSelect },
        },
      },
      user: {
        select: {
          id: true,
          login: true,
          fullName: true,
          savingFor: true,
          profilePhotoUrl: true,
          isBlocked: true,
        },
      },
    },
  });
}

/** Подтягивает заведение по uniqueSlug, если ссылка без сотрудника. */
export async function establishmentForPaySlug(
  slug: string,
  employeeEstablishment: PaySlugEstablishment | null | undefined,
  employeeId: string | null,
) {
  if (employeeEstablishment) return employeeEstablishment;
  if (employeeId) return null;
  const est = await db.establishment.findUnique({
    where: { uniqueSlug: slug },
    select: estBrandingSelect,
  });
  return est;
}

export type PayInitResolution = {
  paymentRecipientId: string;
  tipSplit: TipSplitSnapshot | null;
  mode: TipRoutingMode;
};

export async function resolvePayInitForSlug(
  slug: string,
  tipLink: NonNullable<Awaited<ReturnType<typeof loadTipLinkForPaySlug>>>,
): Promise<PayInitResolution | { error: string; status: number }> {
  const est = await establishmentForPaySlug(
    slug,
    tipLink.employee?.establishment as PaySlugEstablishment | undefined,
    tipLink.employeeId,
  );
  const mode = routingModeForTipLink(tipLink, est);
  const poolId = est?.tipPoolUserId?.trim() || null;

  if (!tipLink.employeeId) {
    if (!poolId || !est?.id) {
      return { error: "Приём чаевых для этого заведения не настроен", status: 403 };
    }
    return {
      paymentRecipientId: poolId,
      tipSplit: null,
      mode: TIP_ROUTING_POOL_QR,
    };
  }

  const establishmentId = tipLink.employee!.establishmentId;

  if (mode === TIP_ROUTING_POOL_QR) {
    if (!poolId) {
      return { error: "Пул чаевых заведения не настроен", status: 403 };
    }
    return {
      paymentRecipientId: poolId,
      tipSplit: null,
      mode: TIP_ROUTING_POOL_QR,
    };
  }

  const waiterUserId = tipLink.employee!.userId?.trim();
  if (!waiterUserId) {
    return {
      error:
        "Официант ещё не зарегистрировался в сервисе — персональная оплата недоступна. Обратитесь к администратору заведения.",
      status: 403,
    };
  }

  let tipSplit: TipSplitSnapshot | null = null;
  if (poolId && establishmentId) {
    const sharePct = await getEstablishmentSharePercent(establishmentId);
    if (sharePct > 0) {
      tipSplit = { poolUserId: poolId, establishmentSharePercent: sharePct };
    }
  }

  return {
    paymentRecipientId: waiterUserId,
    tipSplit,
    mode: TIP_ROUTING_EMPLOYEE_QR,
  };
}
