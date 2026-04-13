/**
 * Манифест разделов операционного кабинета заведения (бронь, залы, гости, меню…).
 * Используется GET /api/establishment/operations и страница «Операции».
 */

export type EstablishmentOperationsModule = {
  id: string;
  title: string;
  description: string;
  /** Путь в ЛК заведения (Next.js), null если экрана ещё нет */
  cabinetPath: string | null;
  /** Базовый путь REST API этого раздела, null если API не заведён */
  apiBase: string | null;
  /** Реализован минимально полезный функционал */
  implemented: boolean;
};

export const ESTABLISHMENT_OPERATIONS_MODULES: EstablishmentOperationsModule[] = [
  {
    id: "halls",
    title: "Залы и столы",
    description: "Залы, столы, вместимость; основа для брони и привязки к официанту.",
    cabinetPath: "/establishment/halls",
    apiBase: "/api/establishment/halls",
    implemented: true,
  },
  {
    id: "bookings",
    title: "Бронь",
    description: "Слоты, календарь, статусы визита и привязка к столу.",
    cabinetPath: null,
    apiBase: null,
    implemented: false,
  },
  {
    id: "guests",
    title: "Гости",
    description: "Контакты, история визитов, заметки.",
    cabinetPath: null,
    apiBase: null,
    implemented: false,
  },
  {
    id: "menu",
    title: "Меню",
    description: "Категории и позиции; позже — выгрузка в зал или синхронизация с кассой.",
    cabinetPath: null,
    apiBase: null,
    implemented: false,
  },
  {
    id: "service",
    title: "Сервис стола",
    description: "Открытый заказ, официант, смена; оплату настроим отдельно.",
    cabinetPath: null,
    apiBase: null,
    implemented: false,
  },
];
