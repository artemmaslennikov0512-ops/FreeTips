/**
 * Манифест разделов операционного кабинета заведения (бронь, залы, гости, меню…).
 * Используется GET /api/establishment/operations и страница «Зал и сервис» в ЛК заведения.
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
    description: "Слоты, статусы визита, стол и карточка гостя.",
    cabinetPath: "/establishment/bookings",
    apiBase: "/api/establishment/bookings",
    implemented: true,
  },
  {
    id: "guests",
    title: "Гости",
    description: "Контакты и заметки; привязка к брони.",
    cabinetPath: "/establishment/guests",
    apiBase: "/api/establishment/guests",
    implemented: true,
  },
  {
    id: "menu",
    title: "Меню",
    description: "Категории и позиции, цена в копейках; позже — касса и зал.",
    cabinetPath: "/establishment/menu",
    apiBase: "/api/establishment/menu",
    implemented: true,
  },
  {
    id: "service",
    title: "Сервис стола",
    description: "Кто обслуживает стол; чек и оплата — отдельно.",
    cabinetPath: "/establishment/service",
    apiBase: "/api/establishment/service-sessions",
    implemented: true,
  },
];
