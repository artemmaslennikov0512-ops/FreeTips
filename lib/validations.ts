/**
 * Zod схемы для валидации входных данных
 * Все пользовательские данные валидируются перед обработкой
 */

import { z } from "zod";

const REGISTRATION_TOKEN_MIN_LENGTH = 10;
const REGISTRATION_TOKEN_MAX_LENGTH = 512;

// Телефон: российский формат (опционально +7, затем 10 цифр)
export const phoneSchema = z
  .string()
  .regex(/^(\+7|7|8)?[0-9]{10}$/, "Неверный формат телефона")
  .transform((val) => {
    // Нормализуем: убираем +7/7/8, оставляем 10 цифр
    const digits = val.replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("7")
      ? digits.slice(1)
      : digits.length === 10
        ? digits
        : val;
  });

/** Телефон для заявки: принимаем +7…, 8…, с пробелами/скобками/дефисами, нормализуем до 10 цифр */
const phoneRegistrationSchema = z
  .string()
  .trim()
  .min(1, "Укажите номер телефона")
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
export const loginSchema = z
  .string()
  .trim()
  .min(3, "Логин должен быть не менее 3 символов")
  .max(50, "Логин не должен превышать 50 символов")
  .regex(/^[a-zA-Z0-9_]+$/, "Логин: только латиница, цифры и _");

// Сумма в копейках: положительное целое, верхняя граница (100 млн ₽) против злоупотреблений
const AMOUNT_KOP_MAX = BigInt("10000000000"); // 100 000 000 руб
export const amountKopSchema = z
  .bigint()
  .positive("Сумма должна быть положительной")
  .max(AMOUNT_KOP_MAX, "Сумма превышает допустимый лимит")
  .or(z.number().int().positive().max(Number(AMOUNT_KOP_MAX)).transform((n) => BigInt(n)));

// Slug для ссылки: 3-50 символов, только латиница, цифры, дефисы, подчёркивания
export const slugSchema = z
  .string()
  .min(3, "Slug должен быть не менее 3 символов")
  .max(50, "Slug не должен превышать 50 символов")
  .regex(/^[a-z0-9_-]+$/, "Slug может содержать только латиницу, цифры, дефисы и подчёркивания");

// Регистрация
export const registerSchema = z
  .object({
    login: loginSchema,
    password: passwordSchema,
    passwordConfirm: z.string().min(1, "Подтвердите пароль"),
    registrationToken: z
      .string()
      .trim()
      .min(REGISTRATION_TOKEN_MIN_LENGTH, "Токен регистрации обязателен")
      .max(REGISTRATION_TOKEN_MAX_LENGTH, "Токен регистрации слишком длинный"),
    email: z.preprocess(
      (v) => {
        if (v == null || v === "") return undefined;
        if (typeof v === "string") {
          const t = v.trim();
          return t === "" ? undefined : t;
        }
        return v;
      },
      emailSchema.optional(),
    ),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// Вход
export const loginRequestSchema = z.object({
  login: loginSchema,
  password: z.string().min(1, "Пароль обязателен").max(PASSWORD_MAX_LENGTH, "Пароль слишком длинный"),
});

// Создание ссылки
export const createLinkSchema = z.object({
  slug: slugSchema.optional(), // если не указан, генерируем автоматически
});

// Минимальная сумма платежа 1 ₽ (антифрод)
const AMOUNT_KOP_MIN_PAYMENT = BigInt(100);
const AMOUNT_KOP_MAX_PAYMENT = BigInt("5000000"); // 50 000 ₽ за один платёж (антифрод)

// Создание платежа
export const createPaymentSchema = z.object({
  amountKop: amountKopSchema
    .refine((v) => v >= AMOUNT_KOP_MIN_PAYMENT, "Минимальная сумма 1 ₽")
    .refine((v) => v <= AMOUNT_KOP_MAX_PAYMENT, "Максимальная сумма одного платежа 50 000 ₽"),
  comment: z.string().max(500, "Комментарий не должен превышать 500 символов").optional(),
  idempotencyKey: z.string().min(1, "idempotencyKey обязателен").max(255),
});

// Лимиты вывода (антифрод): мин 100 ₽, макс 100 000 ₽ за заявку
const AMOUNT_KOP_MIN_PAYOUT = BigInt(10000); // 100 ₽
const AMOUNT_KOP_MAX_PAYOUT = BigInt("10000000"); // 100 000 ₽

// Создание заявки на вывод
/** Номер карты для вывода в Paygine (при автовыводе). Только цифры, 8–19 символов. */
const panSchema = z
  .string()
  .transform((s) => s.replace(/\s/g, ""))
  .refine((s) => s.length >= 8 && s.length <= 19 && /^\d+$/.test(s), "Номер карты: 8–19 цифр");

export const createPayoutSchema = z.object({
  amountKop: amountKopSchema
    .refine((v) => v >= AMOUNT_KOP_MIN_PAYOUT, "Минимальная сумма вывода 100 ₽")
    .refine((v) => v <= AMOUNT_KOP_MAX_PAYOUT, "Максимальная сумма одной заявки 100 000 ₽"),
  details: z
    .string()
    .min(1, "Реквизиты обязательны")
    .max(1000, "Реквизиты не должны превышать 1000 символов"),
  /** ФИО получателя при переводе по номеру телефона */
  recipientName: z.string().max(255).optional(),
  /** Номер карты для немедленной отправки в Paygine (при включённом автовыводе). */
  pan: panSchema.optional(),
});

// Заявка на подключение (оставить заявку)
export const createRegistrationRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Укажите ФИО").max(255),
  dateOfBirth: z.string().trim().min(1, "Укажите дату рождения").max(20),
  phone: phoneRegistrationSchema,
  activityType: z.string().trim().min(1, "Укажите вид деятельности").max(255),
  establishment: z.string().trim().max(255).optional().default(""),
  email: emailSchema,
});

// PATCH /api/profile — обновление логина, email, анкеты (частичное)
export const patchProfileSchema = z.object({
  login: loginSchema.optional(),
  email: z
    .union([z.literal(""), emailSchema])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  fullName: z
    .string()
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim()))
    .refine((v) => v === null || v.length <= 255, "ФИО слишком длинное"),
  birthDate: z
    .string()
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : (v ?? "").trim()))
    .refine(
      (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Дата рождения должна быть в формате YYYY-MM-DD",
    ),
  establishment: z
    .string()
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : (v ?? "").trim()))
    .refine((v) => v === null || v.length <= 255, "Название заведения слишком длинное"),
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
