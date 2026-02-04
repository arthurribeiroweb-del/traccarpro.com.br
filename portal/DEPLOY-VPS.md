# Deploy do Portal na VPS

## 1. Criar arquivo .env

Na pasta `portal/`, crie o arquivo `.env`:

```bash
nano /root/traccarpro.com.br/portal/.env
```

Conteúdo (ajuste usuário, senha, banco):

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/traccarpro_portal"
NEXT_PUBLIC_APP_URL="https://traccarpro.com.br"
```

## 2. Banco PostgreSQL

Certifique-se de que o PostgreSQL está rodando e o banco existe:

```bash
sudo -u postgres psql -c "CREATE DATABASE traccarpro_portal;"   # se ainda não existir
```

## 3. Migrations

```bash
cd /root/traccarpro.com.br/portal
npx prisma migrate deploy
```

## 4. Build

```bash
npm run build
```

## 5. Rodar o Portal

### Opção A: PM2 (recomendado)

```bash
npm install -g pm2
cd /root/traccarpro.com.br/portal
pm2 start npm --name "portal" -- start
pm2 save
pm2 startup   # para iniciar automaticamente no boot
```

### Opção B: systemd

Crie `/etc/systemd/system/traccarpro-portal.service`:

```ini
[Unit]
Description=TraccarPro Portal (Next.js)
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/traccarpro.com.br/portal
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Depois:
```bash
sudo systemctl daemon-reload
sudo systemctl enable traccarpro-portal
sudo systemctl start traccarpro-portal
```

### Opção C: nohup (temporário)

```bash
cd /root/traccarpro.com.br/portal
nohup npm run start > portal.log 2>&1 &
```

## 6. Nginx – proxy para o Portal

O Next.js roda na porta 3000. Adicione ao seu bloco `server` do nginx (ou crie um novo server block):

```nginx
location /cadastro {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

location /api {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /admin {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /proposta {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Recarregue o nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```
