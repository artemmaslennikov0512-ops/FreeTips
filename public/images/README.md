# Тематические фото для лендинга

Скачайте фото одной командой:
```powershell
.\scripts\download-images.ps1
```

Или скачайте вручную и положите сюда:

| Файл | Секция |
|------|--------|
| about.jpg | О сервисе |
| how.jpg | Как это работает |
| adapt.jpg | Адаптация |
| faq.jpg | FAQ |
| contacts.jpg | Контакты |
| card-waiter.jpg | Карточка «Официантам» |
| card-courier.jpg | Карточка «Курьерам» |
| card-salon.jpg | Карточка «Мастерам и барберам» |
| card-hotel.jpg | Карточка «Персоналу отелей» |

Затем в `config/site.ts` укажите локальные пути:

```ts
sectionImages: {
  about: "/images/about.jpg",
  how: "/images/how.jpg",
  adapt: "/images/adapt.jpg",
  forWho: "/images/forWho.jpg", // можно оставить forWho или не использовать
  forWhoCards: ["/images/card-waiter.jpg", "/images/card-courier.jpg", "/images/card-salon.jpg", "/images/card-hotel.jpg"],
  faq: "/images/faq.jpg",
  contacts: "/images/contacts.jpg",
}
```
