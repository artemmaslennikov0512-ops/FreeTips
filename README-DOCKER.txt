Docker Compose лежит в этой папке (1tips).

Если вы уже в папке 1tips (путь заканчивается на ...\сайт\1tips):
  docker compose up --build -d

Если вы в папке «сайт» (родительская), сначала перейдите:
  cd 1tips
  docker compose up --build -d

Остановка (из папки 1tips):
  docker compose down

Туннель (tunnel4.com и др.) и оплата Paygine:
  Если после нажатия «Оплатить» не открывается форма Paygine и в консоли 404 на домене туннеля —
  туннель подменяет заголовок Location в редиректе 307. В панели туннеля отключите опцию
  «Rewrite redirects» / «Preserve Location header», чтобы редирект вёл на test.paygine.com.
  В Cursor: Ports → шестерёнка у порта → проверить настройки редиректов.
