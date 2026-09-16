# Загрузка Sharvognal на Ubuntu

Приложение, Node.js, код и база данных принадлежат пользователю `deploy`.
Системные пакеты, nginx и регистрацию службы настраиваем через `sudo`.
Ниже предполагается Ubuntu VPS с доступом по SSH и правами sudo.

Замените `SERVER_IP` на IP сервера, а `example.com` — на свой домен.
В DNS домена создайте A-запись на IP сервера. Для HTTPS сервер должен быть
доступен снаружи на портах 80 и 443, включая firewall в панели хостинга.

## 1. Создать пользователя deploy

Первый вход сделайте под root или администратором, которого выдал хостинг:

```powershell
ssh root@SERVER_IP
```

Один раз создайте пользователя `deploy` и дайте ему право выполнять системные
команды через `sudo`:

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo -iu deploy
```

После переключения проверьте, что вы действительно работаете под `deploy`:

```bash
whoami
pwd
```

Должно быть:

```text
deploy
/home/deploy
```

Дальше все команды приложения выполняются под `deploy`. Команды с `sudo` в
следующих шагах нужны только для системных частей: пакетов, nginx и systemd.

Для следующих подключений заходите сразу так:

```powershell
ssh deploy@SERVER_IP
```

## 2. Установить программы и Node.js 24

```bash
sudo apt update
sudo apt install -y git curl xz-utils nginx snapd
```

Установим официальный бинарный Node.js в домашний каталог `deploy`.
Команды поддерживают серверы x86_64 и ARM64:

```bash
NODE_VERSION=v24.21.0
case "$(uname -m)" in
  x86_64) NODE_ARCH=x64 ;;
  aarch64) NODE_ARCH=arm64 ;;
  *) echo 'Для этой архитектуры нужен другой пакет Node.js'; exit 1 ;;
esac
NODE_ARCHIVE="node-${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
NODE_DOWNLOAD_DIR=$(mktemp -d)
cd "$NODE_DOWNLOAD_DIR"
curl -fSLO "https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARCHIVE}"
curl -fSLO "https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt"
awk -v name="$NODE_ARCHIVE" '$2 == name { print }' SHASUMS256.txt > CHECKSUM.txt
sha256sum --check CHECKSUM.txt
```

Если проверка вывела `OK`, распакуйте:

```bash
mkdir -p /home/deploy/.local/node
tar -xJf "$NODE_ARCHIVE" -C /home/deploy/.local/node --strip-components=1
/home/deploy/.local/node/bin/node --version
```

Версия 24.21.0 указана на официальной странице [Node.js](https://nodejs.org/en/download)
на момент подготовки инструкции. У проекта нет внешних зависимостей: `npm install` не требуется.

## 3. Скачать проект с GitHub

Для первой установки:

```bash
cd /home/deploy
git clone --branch sharvognal-v1 --single-branch https://github.com/andrejj51/sharvognal.git sharvognal
mkdir -p /home/deploy/sharvognal-data/runtime
chmod 700 /home/deploy/sharvognal-data /home/deploy/sharvognal-data/runtime
cd /home/deploy/sharvognal
/home/deploy/.local/node/bin/node --test tests/*.test.mjs
```

Код находится в `/home/deploy/sharvognal`, данные — в `/home/deploy/sharvognal-data`.
На первом запуске создаётся новая база: пользователей и матчей из локального проекта в GitHub нет.
Если каталог проекта уже существует, используйте команды обновления в конце инструкции.

## 4. Настроить постоянный запуск

Откройте файл:

```bash
sudo nano /etc/systemd/system/sharvognal.service
```

Вставьте, заменив домен:

```ini
[Unit]
Description=Sharvognal ping-pong club
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/sharvognal
ExecStart=/home/deploy/.local/node/bin/node /home/deploy/sharvognal/server.mjs
Environment=NODE_ENV=production
Environment=PORT=8787
Environment=PINGPONG_HOST=127.0.0.1
Environment=PINGPONG_PUBLIC_URL=https://example.com
Environment=PINGPONG_DB=/home/deploy/sharvognal-data/ping-pong.sqlite
Environment=PINGPONG_RUNTIME=/home/deploy/sharvognal-data/runtime
Environment=PINGPONG_SETUP_GUIDE=/home/deploy/sharvognal-data/ADMIN-SETUP.txt
Restart=on-failure
RestartSec=3
UMask=0077

[Install]
WantedBy=multi-user.target
```

В nano: `Ctrl+O`, Enter, `Ctrl+X`. Адрес `PINGPONG_PUBLIC_URL` должен быть без завершающего `/`.

Запустите и проверьте:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sharvognal
sudo systemctl status sharvognal --no-pager
curl http://127.0.0.1:8787/api/health
```

В ответе проверки должно быть `"ready":true`. Приложение слушает только localhost.

## 5. Настроить nginx

```bash
sudo nano /etc/nginx/sites-available/sharvognal
```

Вставьте, заменив домен:

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/sharvognal /etc/nginx/sites-enabled/sharvognal
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

Команду `ln -s` выполните один раз. Перезагружайте nginx только если `nginx -t` завершился успешно.
Настройка прокси описана в [документации nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).

Если UFW уже включён, разрешите HTTP и HTTPS:

```bash
sudo ufw allow 'Nginx Full'
```

## 6. Включить HTTPS

Когда DNS домена указывает на сервер и порт 80 доступен:

```bash
sudo snap install --classic certbot
sudo /snap/bin/certbot --nginx -d example.com --redirect
sudo /snap/bin/certbot renew --dry-run
```

Это выпускает сертификат, настраивает nginx и проверяет автоматическое продление.
См. [официальную инструкцию Certbot](https://certbot.eff.org/instructions?os=snap&ws=nginx).

Откройте `https://example.com`. Первую настройку клуба выполняйте через HTTPS:
приложение настроено выдавать защищённые cookies для этого адреса.

## 7. Создать первого администратора

Под пользователем `deploy` прочитайте код:

```bash
cat /home/deploy/sharvognal-data/ADMIN-SETUP.txt
```

На сайте нажмите «Настроить клуб», введите код и создайте свой профиль, логин и пароль.
Код предназначен для первого администратора.

## Обновлять сайт

Под `deploy`:

```bash
cd /home/deploy/sharvognal
git pull --ff-only origin sharvognal-v1
/home/deploy/.local/node/bin/node --test tests/*.test.mjs
sudo systemctl restart sharvognal
curl http://127.0.0.1:8787/api/health
```

Перезапускайте службу после успешного обновления и тестов.
База лежит отдельно и при обновлении кода сохраняется.

## Логи и копия базы

Логи:

```bash
sudo journalctl -u sharvognal -n 100 --no-pager
```

Для согласованной копии базы остановите приложение на время копирования:

```bash
mkdir -p /home/deploy/sharvognal-data/backups
sudo systemctl stop sharvognal
cp /home/deploy/sharvognal-data/ping-pong.sqlite "/home/deploy/sharvognal-data/backups/ping-pong-$(date +%Y%m%d-%H%M%S).sqlite"
sudo systemctl start sharvognal
```

## Про лимит входа за nginx

Приложение берёт реальный адрес клиента из `X-Forwarded-For`, только если запрос
пришёл от локального nginx. Поэтому в конфигурации выше важно оставлять строку:

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
```

Так лимит 30 попыток за 15 минут применяется отдельно к каждому посетителю.
