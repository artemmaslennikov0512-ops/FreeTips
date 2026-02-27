# Выкладка сайта в интернет и редактирование в Cursor

Два варианта: **редактируешь локально в Cursor и обновляешь сервер через Git** либо **подключаешься к серверу по SSH и редактируешь файлы прямо на нём** в Cursor. В обоих случаях не нужно вручную «заменять папку» на сервере — только обновление кода (git pull или правки по SSH).

---

## Деплой на Beget

Для Next.js + Node.js + PostgreSQL + Docker подходит только **VPS** на Beget. Тарифы «Хостинг» (общий хостинг с PHP) не подходят — там нет Node.js и нельзя запускать свои контейнеры.

### 1. Заказать VPS на Beget

1. Зайди на [beget.com](https://beget.com) → раздел **VPS** (или «Виртуальные серверы»).
2. Выбери тариф (достаточно минимального для старта; при росте нагрузки можно увеличить).
3. Выбери ОС: **Ubuntu 22.04** или **Debian 12**.
4. После оплаты в панели Beget появятся данные доступа: **IP-адрес**, **логин** и **пароль по SSH** (или инструкция по первому входу). Сохрани их.

### 2. Подключиться по SSH и подготовить сервер

С твоего компьютера (PowerShell или терминал):

```bash
ssh root@IP_ТВОЕГО_VPS
```

(или `ssh пользователь@IP`, если в панели указан не root). При первом подключении прими отпечаток ключа хоста.

На сервере установи Docker, Docker Compose и Git (на Ubuntu/Debian):

```bash
apt update && apt install -y git curl
curl -fsSL https://get.docker.com | sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 3. Домен и папка проекта

- **Домен:** если домен куплен на Beget, в панели управления доменами создай **A-запись** на IP твоего VPS. Если домен на другом регистраторе — там же добавь A-запись на этот IP.
- **Папка проекта:** на VPS клонируй репозиторий (например в `/var/www/1tips`):

```bash
mkdir -p /var/www && cd /var/www
git clone <URL_твоего_репозитория> 1tips
cd 1tips
```

Создай на сервере файл `.env` (скопируй с локальной машины через `scp` или вставь вручную). Обязательно задай:

- `NEXT_PUBLIC_APP_URL=https://твой-домен.ru`
- остальные переменные из твоего локального `.env` (JWT_*, POSTGRES_*, PAYGINE_* и т.д.).

### 4. Запуск приложения

```bash
cd /var/www/1tips
docker compose up -d --build
```

Первый суперадмин (один раз):

```bash
docker compose exec web sh -c "npx tsx prisma/seed.ts"
```

### 5. HTTPS и прокси (Nginx)

Приложение слушает порт **3000** внутри сервера. Снаружи нужно открыть только **80** и **443** и проксировать запросы на 3000. Установи Nginx и сертификат Let's Encrypt:

```bash
apt install -y nginx certbot python3-certbot-nginx
certbot --nginx -d твой-домен.ru
```

Пример конфига Nginx для сайта (файл `/etc/nginx/sites-available/1tips`, затем `ln -s /etc/nginx/sites-available/1tips /etc/nginx/sites-enabled/` и `nginx -t && systemctl reload nginx`):

```nginx
server {
    listen 80;
    server_name твой-домен.ru www.твой-домен.ru;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

После этого запусти получение сертификата: `certbot --nginx -d твой-домен.ru`. Certbot сам добавит HTTPS. Либо можно использовать Caddy — он сам получает сертификаты.

После этого обновления делаешь как в общих вариантах выше: **вариант 1** — правки в Cursor локально → `git push` → на сервере `git pull` и `./scripts/deploy-update.sh`; **вариант 2** — Cursor Remote SSH к этому VPS, правки в папке `/var/www/1tips`, затем `./scripts/deploy-update.sh`.

---

## Вариант 1: Редактирование в Cursor локально + обновление сервера через Git

Подходит, если хочешь держать код на своём компьютере и выкатывать изменения одной командой.

### Шаг 1: Репозиторий в интернете

- Создай репозиторий на GitHub / GitLab / Bitbucket.
- Локально в папке проекта:
  ```bash
  git init
  git add .
  git commit -m "Initial"
  git remote add origin <URL репозитория>
  git push -u origin main
  ```
- Файл `.env` в репозиторий не коммить (он уже в `.gitignore`).

### Шаг 2: Сервер (VPS)

- Арендуй VPS (например: Timeweb, Selectel, Reg.ru, или зарубежные DigitalOcean, Hetzner).
- Установи на сервер: Docker и Docker Compose, Git.
- Клонируй репозиторий в папку, например `/var/www/1tips`:
  ```bash
  sudo mkdir -p /var/www && cd /var/www
  sudo git clone <URL репозитория> 1tips
  cd 1tips
  ```
- Создай на сервере файл `.env` (скопируй с локальной машины или заполни вручную). **Секреты и пароли только в `.env` на сервере, не в репозитории.**
- Задай в `.env` на сервере:
  - `NEXT_PUBLIC_APP_URL=https://твой-домен.ru`
  - Все нужные переменные (JWT_*, POSTGRES_*, PAYGINE_* и т.д.).
- Запуск:
  ```bash
  docker compose up -d --build
  ```
- Первый суперадмин (один раз):
  ```bash
  docker compose exec web sh -c "npx tsx prisma/seed.ts"
  ```
- Настрой перед сервером Nginx (или другой прокси) с HTTPS (Let's Encrypt) и проксированием на порт 3000.

### Шаг 3: Обновление без замены папки

Когда правишь код **в Cursor на своём компьютере**:

1. Сохраняешь файлы, коммитишь, пушишь:
   ```bash
   git add .
   git commit -m "Описание изменений"
   git push
   ```
2. На сервере обновляешь только код и пересобираешь контейнер:
   ```bash
   cd /var/www/1tips
   git pull
   docker compose up -d --build
   ```
   Папку целиком менять не нужно — `git pull` подтянет только изменения.

Удобно вынести это в скрипт на сервере (см. ниже `scripts/deploy-update.sh`): тогда после `git push` заходишь на сервер по SSH и запускаешь один скрипт.

---

## Вариант 2: Редактирование на сервере через Cursor (Remote SSH)

Подходит, если хочешь открыть в Cursor именно папку проекта **на сервере** и править файлы там. Папку на сервере не заменяешь — ты в ней и работаешь.

### Шаг 1: Деплой на сервер один раз

- Как в варианте 1: VPS, Docker, клонирование репозитория в `/var/www/1tips`, `.env`, `docker compose up -d --build`, seed.

### Шаг 2: Подключение Cursor к серверу по SSH

1. В Cursor установи расширение **Remote - SSH** (аналог VS Code).
2. Настрой SSH-ключ с твоего компьютера на сервер (без пароля):
   ```bash
   ssh-keygen -t ed25519 -C "cursor"
   ssh-copy-id user@IP_или_домен_сервера
   ```
3. В Cursor: `Ctrl+Shift+P` (или `Cmd+Shift+P`) → «Remote-SSH: Connect to Host» → вводишь `user@IP_или_домен_сервера`.
4. После подключения: File → Open Folder → выбираешь папку проекта на сервере (например `/var/www/1tips`).

Дальше все правки делаешь в этой папке в Cursor — они сразу на сервере. Папку ничем не «заменяешь».

### Шаг 3: Применение изменений на сайте

После правок нужно пересобрать и перезапустить приложение на том же сервере:

```bash
cd /var/www/1tips
docker compose up -d --build
```

Или используй скрипт `scripts/deploy-update.sh` (см. ниже): он сделает пересборку и перезапуск.

---

## Скрипт обновления на сервере

Создан файл `scripts/deploy-update.sh`: его кладут на сервер в папку проекта и запускают после `git pull` (вариант 1) или после правок по SSH (вариант 2). Он не заменяет папку — только пересобирает и поднимает контейнеры.

Использование на сервере:

```bash
cd /var/www/1tips
# если вариант 1 — сначала: git pull
./scripts/deploy-update.sh
```

---

## Что важно для продакшена

- В `.env` на сервере обязательно задать **`NEXT_PUBLIC_APP_URL`** (полный URL сайта, например `https://твой-домен.ru`) — иначе редиректы оплаты не будут работать.
- Секреты (JWT_*, POSTGRES_*, PAYGINE_*, SUPERADMIN_*) хранить только в `.env` на сервере или в секрет-менеджере, не в репозитории.
- Перед приложением поставить обратный прокси (Nginx/Caddy) с HTTPS (Let's Encrypt).
- Регулярно делать бэкапы БД (volume `pgdata` или `pg_dump`).

---

## Кратко

| Задача | Решение |
|--------|--------|
| Редактировать в Cursor и не заменять папку на сервере | **Вариант 1:** правки локально → `git push` → на сервере `git pull` + `./scripts/deploy-update.sh`. **Вариант 2:** Cursor Remote SSH → открываешь папку на сервере и правишь там; для применения — `./scripts/deploy-update.sh`. |
| Где хранить секреты | Только в `.env` на сервере (или в секрет-менеджере), не в Git. |
| Обязательная переменная в проде | `NEXT_PUBLIC_APP_URL=https://твой-домен.ru` |
