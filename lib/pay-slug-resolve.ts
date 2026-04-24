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

type PaySlugEstablishment = {
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

/** Загрузка TipLink по коду официанта (сегмент URL /pay/{slug}). */
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
          /** ЛК официанта; при POOL_QR у TipLink.user — пул, не человек */
          user: {
            select: {
              id: true,
              login: true,
              fullName: true,
              clientNickname: true,
              clientJobTitle: true,
              savingFor: true,
              profilePhotoUrl: true,
              isBlocked: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          login: true,
          fullName: true,
          clientNickname: true,
          clientJobTitle: true,
          savingFor: true,
          profilePhotoUrl: true,
          isBlocked: true,
        },
      },
    },
  });
}

type PayTipLinkShape = Pick<
  NonNullable<Awaited<ReturnType<typeof loadTipLinkForPaySlug>>>,
  "employeeId" | "userId" | "employee"
>;

/**
 * Заведение «привязано» к ссылке оплаты только в двух случаях:
 * 1) QR сотрудника — из Employee.establishment (правила распределения и бренд только здесь).
 * 2) Общий пул — slug = uniqueSlug заведения и владелец TipLink — пользователь-пул этого заведения.
 *
 * Личная ссылка получателя (без employeeId, userId ≠ пул) никогда не получает контекст заведения
 * по одному только совпадению кода в URL — не показываются ошибки про настройки заведения.
 */
export async function establishmentBoundForPayTipLink(
  slug: string,
  tipLink: PayTipLinkShape,
): Promise<PaySlugEstablishment | null> {
  const s = slug.trim();

  if (tipLink.employeeId) {
    const fromEmployee = tipLink.employee?.establishment as PaySlugEstablishment | undefined;
    return fromEmployee ?? null;
  }

  const est = await db.establishment.findUnique({
    where: { uniqueSlug: s },
    select: estBrandingSelect,
  });
  if (!est?.id) return null;

  const poolId = est.tipPoolUserId?.trim() ?? "";
  if (!poolId || poolId !== tipLink.userId) {
    return null;
  }

  return est;
}

type PayInitResolution = {
  paymentRecipientId: string;
  tipSplit: TipSplitSnapshot | null;
  mode: TipRoutingMode;
};

export async function resolvePayInitForSlug(
  slug: string,
  tipLink: NonNullable<Awaited<ReturnType<typeof loadTipLinkForPaySlug>>>,
): Promise<PayInitResolution | { error: string; status: number }> {
  const est = await establishmentBoundForPayTipLink(slug, tipLink);
  const mode = routingModeForTipLink(tipLink, est);
  const poolId = est?.tipPoolUserId?.trim() || null;

  if (!tipLink.employeeId) {
    if (est?.id) {
      if (!poolId) {
        return { error: "Приём чаевых для этого заведения не настроен", status: 403 };
      }
      return {
        paymentRecipientId: poolId,
        tipSplit: null,
        mode: TIP_ROUTING_POOL_QR,
      };
    }
    /** Личная ссылка /pay/{slug} без Employee и без uniqueSlug заведения — только получатель tipLink.userId. */
    return {
      paymentRecipientId: tipLink.userId,
      tipSplit: null,
      mode: TIP_ROUTING_EMPLOYEE_QR,
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
