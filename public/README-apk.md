# Скачивание приложения (APK)

Чтобы кнопка «Скачать приложение (APK)» в личном кабинете работала, поместите собранный APK в этот каталог с именем **freetips.apk**.

**Проще всего** из корня проекта после сборки Android выполнить:
```bash
npm run copy-apk
```
Скрипт скопирует `android/app/build/outputs/apk/debug/app-debug.apk` в `public/freetips.apk`.

Вручную (из **корня проекта**):
```powershell
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk -Destination public\freetips.apk
```
Если вы в папке `android`:
```powershell
Copy-Item app\build\outputs\apk\debug\app-debug.apk -Destination ..\public\freetips.apk
```
Для release: скопируйте подписанный APK в `public/freetips.apk`.

Файл доступен по адресу: `https://ваш-домен/freetips.apk`.

Версия для OTA (`GET /api/app/version`) берётся **только** из `public/app-version.json` (синхрон с `build.gradle.kts` через `npm run copy-apk`). **Не задавайте** `APP_APK_*` в `.env` на сервере.

Проверка перед деплоем: `npm run verify-apk-sync`. На сервере после `git pull`: `bash scripts/server-deploy-apk-sync.sh`.
