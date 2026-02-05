# Deploy do Portal na VPS

## 1) Criar arquivo .env

Na pasta `portal/`, crie o arquivo `.env`:

```bash
nano /root/traccarpro.com.br/portal/.env
```

Conteudo base:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@127.0.0.1:5432/traccarpro_portal"
NEXT_PUBLIC_APP_URL="https://traccarpro.com.br"
ADMIN_USER="admin"
ADMIN_PASS="troque-esta-senha"
ADMIN_SESSION_SECRET="troque-este-segredo-com-pelo-menos-32-caracteres"
```

## 2) Banco PostgreSQL

Instale e suba o PostgreSQL (uma vez):

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Crie banco e senha:

```bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'SUA_SENHA';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='traccarpro_portal'" | grep -q 1 || sudo -u postgres createdb traccarpro_portal
```

## 3) Aplicar schema Prisma

```bash
cd /root/traccarpro.com.br/portal
npx prisma db push
npx prisma generate
```

## 4) Build

```bash
cd /root/traccarpro.com.br/portal
npm run build
```

## 5) Rodar o Portal (PM2 recomendado)

```bash
npm install -g pm2
cd /root/traccarpro.com.br/portal
pm2 start npm --name "portal" -- start
pm2 save
pm2 startup
```

## 6) Nginx - proxy para o Portal

**Importante para upload de documentos:** No bloco `server` do Nginx, adicione `client_max_body_size 10M;` (sem isso, uploads acima de 1MB falham).

Se o mesmo dominio tambem usa Traccar em `/login` e `/api`, **nao use** `location /api` generico para o portal.
Roteie somente os endpoints do portal e coloque essas regras antes de `location /api` e `location /` do Traccar:

```nginx
upstream portal_backend {
    server 127.0.0.1:3000;
    keepalive 16;
}

location = /cadastro {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /cadastro/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /_next/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /admin {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /admin/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /proposta {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /proposta/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /api/signup-requests {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /api/signup-requests/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /api/onboarding {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /api/onboarding/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /api/admin/signup-requests {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /api/admin/signup-requests/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /api/admin/auth/login {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /api/admin/auth/logout {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Recarregue o nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 7) Protecao simples do /admin

Com as variaveis `ADMIN_USER`, `ADMIN_PASS` e `ADMIN_SESSION_SECRET` no `.env`, o portal agora exige login em:

- `/admin`
- `/admin/*`
- `/api/admin/*`

Depois de alterar credenciais, reinicie o portal:

```bash
cd /root/traccarpro.com.br/portal
pm2 restart portal
```

## 8) Backup automatico do PostgreSQL

Scripts incluidos:

- `scripts/postgres-backup.sh`
- `scripts/install-postgres-backup-cron.sh`

Instalar cron diario (03:17 UTC por padrao):

```bash
cd /root/traccarpro.com.br/portal
chmod +x scripts/*.sh
sudo APP_DIR=/root/traccarpro.com.br/portal bash scripts/install-postgres-backup-cron.sh
```

Rodar backup manual de teste:

```bash
APP_DIR=/root/traccarpro.com.br/portal BACKUP_DIR=/var/backups/traccarpro/postgres scripts/postgres-backup.sh
ls -lah /var/backups/traccarpro/postgres
```

## 9) Monitoramento PM2 com restart + alerta

Scripts incluidos:

- `scripts/monitor-pm2-portal.sh`
- `scripts/install-pm2-monitor-cron.sh`

Instalar monitor a cada 2 minutos:

```bash
cd /root/traccarpro.com.br/portal
chmod +x scripts/*.sh
sudo APP_DIR=/root/traccarpro.com.br/portal bash scripts/install-pm2-monitor-cron.sh
```

Opcional: configurar webhook de alerta em `/etc/default/traccarpro-portal-monitor`:

```bash
sudo nano /etc/default/traccarpro-portal-monitor
# ALERT_WEBHOOK_URL="https://seu-webhook"
```

Teste manual:

```bash
APP_DIR=/root/traccarpro.com.br/portal ENV_FILE=/etc/default/traccarpro-portal-monitor scripts/monitor-pm2-portal.sh
```

Ver logs:

```bash
tail -f /var/log/traccarpro-postgres-backup.log
tail -f /var/log/traccarpro-portal-monitor.log
```
