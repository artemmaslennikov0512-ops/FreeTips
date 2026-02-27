/**
 * Конфиг сайта: навигация, футер, реквизиты оператора.
 */

export function isPlaceholder(s: string): boolean {
  return s.startsWith("[ЗАПОЛНИТЬ");
}

export const site = {
  name: "FreeTips",
  logo: { src: "/logo.svg", alt: "Логотип", href: "/" },
  /** Фото в Hero. Положите файл в public/ и укажите путь (напр. /hero-tips.jpg). Пустая строка — скрыть блок. */
  heroImage: "" as const,
  /** Тематические фото. Локальные — после запуска scripts/download-images.ps1 */
  sectionImages: {
    about: "/images/about.jpg",
    how: "/images/how.jpg",
    adapt: "/images/adapt.jpg",
    forWho: "/images/forWho.jpg",
    forWhoCards: [
      "/images/card-waiter.jpg",
      "/images/card-salon.webp",
      "/images/card-courier.webp",
      "/images/card-hotel.jpg",
    ] as const,
    faq: "/images/faq.jpg",
    contacts: "/images/contacts.jpg",
  } as const,

  nav: [
    { label: "О сервисе", href: "/#about" },
    { label: "Как работает", href: "/#how" },
    { label: "Адаптация", href: "/#ad" },
    { label: "Для кого", href: "/#for" },
    { label: "Вопросы", href: "/#quest" },
    { label: "Контакты", href: "/kontakty" },
  ],

  cta: { label: "Войти", href: "/login" },
  register: { label: "Оставить заявку", href: "/zayavka" },
  /** Slug для демо-страницы чаевых (лендинг: «Посмотреть, как это выглядит»). Создайте ссылку с этим slug в кабинете или оставьте пустым. */
  demoPaySlug: "demo" as const,

  footer: {
    docs: [
      { label: "Оферта", href: "/oferta" },
      { label: "Политика конфиденциальности", href: "/politika" },
      { label: "Политика безопасности платежей", href: "/politika-bezopasnosti" },
      { label: "Оплата, доставка и возврат", href: "/oplata-dostavka-vozvrat" },
      { label: "Контакты", href: "/kontakty" },
    ],
    operator: {
      name: "ИП ЕРЁМИН ДМИТРИЙ РОМАНОВИЧ",
      address: "Новосибирская область, Венгеровский район, село Ключевая",
      addressActual: "Новосибирская область, г. Новосибирск, ул. Михаила Кулагина, 31",
      inn: "541997879330",
      ogrn: "325547600203031",
      bank: "ФИЛИАЛ «НОВОСИБИРСКИЙ» АО «АЛЬФА-БАНК»",
      bik: "045004774",
      ks: "30101810600000000774",
      rs: "40802810123130010608",
    },
    support: {
      phone: "+7 (993) 003-88-57",
      email: "yeup.ukpukp@mail.ru",
      telegram: "",
    },
  },
} as const;
