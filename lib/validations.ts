/**
 * Zod схемы для валидации входных данных
 * Все пользовательские данные валидируются перед обработкой
 */

import { z } from "zod";
import { PAYMENT_MAX_AMOUNT_KOP, PAYMENT_MIN_AMOUNT_KOP } from "./payment-amount-bounds";
import { PAYOUT_MAX_AMOUNT_KOP, PAYOUT_MIN_AMOUNT_KOP } from "./payout-amount-bounds";

const REGISTRATION_TOKEN_MIN_LENGTH = 10;
const REGISTRATION_TOKEN_MAX_LENGTH = 512;

/** Телефон для заявки «оставить заявку»: обязательный, +7/8/10 цифр, в БД — 10 цифр */
const phoneRegistrationRequiredSchema = z
  .string()
  .trim()
  .min(1, "Укажите телефон")
  .max(50)
  .transform((s) => s.replace(/\D/g, ""))
  .refine(
    (s) => s.length === 10 || (s.length === 11 && (s[0] === "7" || s[0] === "8")),
    "Неверный формат телефона (10 цифр, можно с +7 или 8)",
  )
  .transform((s) => (s.length === 11 ? s.slice(1) : s));

// Email
export const emailSchema = z.string().email("Неверный формат email").toLowerCase();

// Пароль: 8–256 символов (ограничение против DoS), буква и цифра
const PASSWORD_MAX_LENGTH = 256;
export const passwordSchema = z
  .string()
  .min(8, "Пароль должен быть не менее 8 символов")
  .max(PASSWORD_MAX_LENGTH, "Пароль слишком длинный")
  .regex(/[a-zA-Z]/, "Пароль должен содержать хотя бы одну букву")
  .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру");

// Логин: 3–50 символов, латиница, цифры, подчёркивание (пробелы обрезаются)
const loginSchema = z
  .string()
  .trim()
  .min(3, "Логин должен быть не менее 3 символов")
  .max(50, "Логин не должен превышать 50 символов")
  .regex(/^[a-zA-Z0-9_]+$/, "Логин: только латиница, цифры и _");

/** Кодовое слово при регистрации / для сброса пароля (bcrypt на сервере; до 72 байт для bcrypt) */
const recoveryCodewordSchema = z
  .string()
  .trim()
  .min(3, "Кодовое слово — не менее 3 символов")
  .max(72, "Кодовое слово не длиннее 72 символов");

/** Смена кодового слова пользователю в админке (SUPERADMIN) */
export const adminRecoveryCodewordUpdateSchema = z
  .object({
    recoveryCodeword: recoveryCodewordSchema,
    recoveryCodewordConfirm: z.string().trim().min(1, "Подтвердите кодовое слово").max(72),
  })
  .refine((d) => d.recoveryCodeword === d.recoveryCodewordConfirm, {
    message: "Кодовые слова не совпадают",
    path: ["recoveryCodewordConfirm"],
  });

// Сумма в копейках: положительное целое, верхняя граница (100 млн ₽) против злоупотреблений
const AMOUNT_KOP_MAX = BigInt("10000000000"); // 100 000 000 руб
const amountKopSchema = z
  .bigint()
  .positive("Сумма должна быть положительной")
  .max(AMOUNT_KOP_MAX, "Сумма превышает допустимый лимит")
  .or(z.number().int().positive().max(Number(AMOUNT_KOP_MAX)).transform((n) => BigInt(n)));

// Код в пути /pay/{slug} (тело поля `slug` в API): 3–50 символов, латиница, цифры, дефис, _
const slugSchema = z
  .string()
  .min(3, "Код должен быть не менее 3 символов")
  .max(50, "Код не должен превышать 50 символов")
  .regex(/^[a-z0-9_-]+$/, "Код может содержать только латиницу, цифры, дефисы и подчёркивания");

/** Опциональный UUID из браузера (localStorage) для метаданных сессии */
const deviceClientIdSchema = z.preprocess(
  (v) =>
    v === "" || v === null || v === undefined
      ? undefined
      : typeof v === "string"
        ? v.trim() || undefined
        : undefined,
  z.string().uuid("Некорректный идентификатор устройства").optional(),
);

// Регистрация по одноразовой ссылке: логин, пароль, токен; email не требуется (идентификация через токен)
export const registerSchema = z
  .object({
    login: loginSchema,
    password: passwordSchema,
    passwordConfirm: z.string().min(1, "Подтвердите пароль"),
    recoveryCodeword: recoveryCodewordSchema,
    registrationToken: z
      .string()
      .trim()
      .min(REGISTRATION_TOKEN_MIN_LENGTH, "Токен регистрации обязателен")
      .max(REGISTRATION_TOKEN_MAX_LENGTH, "Токен регистрации слишком длинный"),
    acceptOfferAndPrivacy: z.literal(true, {
      errorMap: () => ({ message: "Необходимо принять условия Пользовательского соглашения и Политики обработки персональных данных" }),
    }),
    deviceClientId: deviceClientIdSchema,
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"],
  });

// Вход
export const loginRequestSchema = z.object({
  login: loginSchema,
  password: z.string().min(1, "Пароль обязателен").max(PASSWORD_MAX_LENGTH, "Пароль слишком длинный"),
  deviceClientId: deviceClientIdSchema,
});

/** Код из Google Authenticator (6 цифр) */
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Введите 6 цифр кода");

/** Завершение входа после TOTP */
export const loginTotpSchema = z.object({
  twoFactorToken: z.string().min(10, "Некорректный токен"),
  code: totpCodeSchema,
  deviceClientId: deviceClientIdSchema,
});

/** Отключение TOTP */
export const totpDisableSchema = z.object({
  password: z.string().min(1, "Введите пароль").max(PASSWORD_MAX_LENGTH),
  code: totpCodeSchema,
});

// Запрос сброса пароля: логин, email; кодовое слово — обязательно, если оно задано в аккаунте (проверка на сервере)
export const forgotPasswordRequestSchema = z.object({
  login: z.string().trim().min(1, "Укажите логин").max(50, "Слишком длинный логин"),
  email: z.string().trim().min(1, "Укажите email").max(255, "Слишком длинный email").email("Неверный формат email"),
  recoveryCodeword: z
    .string()
    .max(72, "Кодовое слово не длиннее 72 символов")
    .transform((s) => s.trim()),
});

// Создание ссылки
export const createLinkSchema = z.object({
  slug: slugSchema.optional(), // код официанта в URL; если не указан — генерируем автоматически
});

// Минимальная / максимальная сумма платежа (антифрод, лимит продукта)
const AMOUNT_KOP_MIN_PAYMENT = BigInt(PAYMENT_MIN_AMOUNT_KOP);
const AMOUNT_KOP_MAX_PAYMENT = BigInt(PAYMENT_MAX_AMOUNT_KOP);

// Создание платежа
export const createPaymentSchema = z.object({
  amountKop: amountKopSchema
    .refine((v) => v >= AMOUNT_KOP_MIN_PAYMENT, "Минимальная сумма пополнения — 100 ₽")
    .refine((v) => v <= AMOUNT_KOP_MAX_PAYMENT, "Максимальная сумма пополнения — 1 000 ₽"),
  comment: z.string().max(500, "Комментарий не должен превышать 500 символов").optional(),
  idempotencyKey: z.string().min(1, "idempotencyKey обязателен").max(255),
});

// Создание заявки на вывод
/** Номер карты для вывода в Paygine (при автовыводе). Только цифры, 8–19 символов. */
const panSchema = z
  .string()
  .transform((s) => s.replace(/\s/g, ""))
  .refine((s) => s.length >= 8 && s.length <= 19 && /^\d+$/.test(s), "Номер карты: 8–19 цифр");

export const createPayoutSchema = z.object({
  amountKop: amountKopSchema
    .refine((v) => v >= BigInt(PAYOUT_MIN_AMOUNT_KOP), "Минимальная сумма вывода 100 ₽")
    .refine((v) => v <= BigInt(PAYOUT_MAX_AMOUNT_KOP), "Максимальная сумма одной заявки 100 000 ₽"),
  details: z
    .string()
    .min(1, "Реквизиты обязательны")
    .max(1000, "Реквизиты не должны превышать 1000 символов"),
  /** ФИО получателя при переводе по номеру телефона */
  recipientName: z.string().max(255).optional(),
  /** Номер карты для немедленной отправки в Paygine (при включённом автовыводе). */
  pan: panSchema.optional(),
});

// Обязательное согласие с офертой и политиками при подаче заявки
const consentOfferAndPolicySchema = z.literal(true, {
  errorMap: () => ({ message: "Необходимо принять условия оферты, политики ПДн и политики безопасности платежей" }),
});

// Заявка на подключение (оставить заявку): только телефон и почта + согласие с документами
export const createRegistrationRequestSchema = z.object({
  email: z.string().trim().email("Неверный формат email").transform((s) => s.toLowerCase()),
  phone: phoneRegistrationRequiredSchema,
  consentOfferAndPolicy: consentOfferAndPolicySchema,
});

// PATCH /api/profile — обновление логина, email, анкеты (частичное)
export const patchProfileSchema = z.object({
  login: loginSchema.optional(),
  email: z
    .union([z.literal(""), emailSchema])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  fullName: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v.trim()))
    .refine((v) => v === null || v.length <= 255, "ФИО слишком длинное"),
  birthDate: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
      const s = v.trim();
      const dateOnly = s.includes("T") ? s.split("T")[0] ?? s : s;
      return dateOnly;
    })
    .refine(
      (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Дата рождения должна быть в формате YYYY-MM-DD",
    ),
  establishment: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === null || v === undefined || (typeof v === "string" && v.trim() === "") ? null : v.trim()))
    .refine((v) => v === null || v.length <= 255, "Название заведения слишком длинное"),
  savingFor: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : (v ?? "").trim()))
    .refine((v) => v === null || v.length <= 500, "Не более 500 символов"),
  clientNickname: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : (v ?? "").trim()))
    .refine((v) => v === null || v.length <= 120, "Не более 120 символов"),
  clientJobTitle: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : (v ?? "").trim()))
    .refine((v) => v === null || v.length <= 120, "Не более 120 символов"),
});

// Сообщение в чат поддержки: 1–4000 символов
export const supportMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Введите сообщение")
    .max(4000, "Сообщение не должно превышать 4000 символов"),
});

/** ИНН РФ: 10 цифр (юрлицо) или 12 (физлицо / ИП). Ввод с пробелами — нормализуем до цифр. */
const verificationInnSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\D/g, ""))
  .refine((s) => s.length === 10 || s.length === 12, "ИНН: укажите 10 или 12 цифр");

// Верификация: этап 1 — ФИО, дата рождения, серия/номер паспорта, ИНН
export const verificationStep1Schema = z.object({
  fullName: z.string().trim().min(1, "Укажите ФИО").max(255),
  birthDate: z.string().trim().min(1, "Укажите дату рождения").max(20),
  passportSeries: z.string().trim().min(2, "Серия паспорта: 2–4 цифры").max(4).regex(/^\d{2,4}$/, "Серия: только цифры"),
  passportNumber: z.string().trim().min(6, "Номер паспорта: 6 цифр").max(6).regex(/^\d{6}$/, "Номер: 6 цифр"),
  inn: verificationInnSchema,
});

// Верификация: отправка заявки (согласие на обработку ПД)
export const verificationSubmitSchema = verificationStep1Schema.extend({
  consentPersonalData: z.literal(true, { errorMap: () => ({ message: "Необходимо согласие на обработку персональных данных" }) }),
});

// Смена пароля
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string().min(1, "Подтвердите новый пароль"),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: "Пароли не совпадают",
    path: ["newPasswordConfirm"],
  });

// Сброс пароля по токену (страница «Забыли пароль» → ссылка из письма)
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Токен сброса отсутствует").max(512),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string().min(1, "Подтвердите новый пароль"),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: "Пароли не совпадают",
    path: ["newPasswordConfirm"],
  });
