# TraccarPro — Site institucional

Landing page do [TraccarPro](https://traccarpro.com.br). Astro + Tailwind.

## Comandos

```bash
npm install
npm run dev     # http://localhost:4321
npm run build   # ./dist
npm run preview # preview do build
```

## Deploy

Build gera arquivos estáticos em `dist/`.

### Deploy na VPS (traccarpro.com.br como home)

Se você já tem o app em `traccarpro.com.br/login`, configure assim:

1. **Na sua máquina (local):**
   ```bash
   cd site
   npm run build
   ```

2. **Suba a pasta `dist/` para a VPS:**
   ```bash
   scp -r dist/* usuario@seu-servidor:/var/www/traccarpro-landing/
   ```
   Ou com rsync:
   ```bash
   rsync -avz --delete dist/ usuario@seu-servidor:/var/www/traccarpro-landing/
   ```

3. **Na VPS**, crie a pasta e ajuste o Nginx:
   ```bash
   sudo mkdir -p /var/www/traccarpro-landing
   sudo chown $USER:$USER /var/www/traccarpro-landing
   ```
   Use o exemplo em `scripts/nginx-traccarpro-example.conf` para configurar o Nginx de forma que:
   - `/` → sirva os arquivos estáticos da landing (pasta traccarpro-landing)
   - `/login` e outras rotas do app → façam proxy para o serviço existente

4. **Script automatizado:**
   ```bash
   bash scripts/deploy-vps.sh
   ```
   Depois faça o `scp` ou `rsync` manualmente com os dados da sua VPS.

### Deploy em Vercel / Netlify / Cloudflare Pages

- **Build command:** `npm run build`
- **Output directory:** `dist`

## WhatsApp

CTA e FAB usam `https://wa.me/559491796309` com mensagem pré-definida. Alterar em:

- `src/components/Commercial.astro`
- `src/components/WhatsAppFab.astro`

## App URL

Links "Acessar o app" apontam para `https://app.traccarpro.com.br`. Ajustar em:

- `src/components/Header.astro`
- `src/components/Hero.astro`
- `src/components/CtaFinal.astro`
