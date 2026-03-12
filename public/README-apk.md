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
