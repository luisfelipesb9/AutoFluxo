# Deploy do AutoFluxo em HTTPS (servidor interno da Automix)

Guia para colocar o sistema no ar com **HTTPS**, **redirect HTTP→HTTPS** e
`HTTPS=true` no `.env` de produção. Cobre os dois caminhos de certificado:
**Let's Encrypt** (domínio público) e **auto-assinado** (rede interna).

A arquitetura: **o nginx termina o TLS** e faz proxy para o backend Express (porta
4000, HTTP interno). O backend já está pronto para isso (`trust proxy`, HSTS e o
redirect de fallback são ligados pela flag `HTTPS=true`). O frontend é estático e
descobre o protocolo (`https://`) sozinho.

```
cliente ──HTTPS:443──> nginx ──HTTP:4000──> app (Express) ──> Postgres
            │ :80 → 301 https
            └ serve frontend estático + proxy /api/
```

---

## 1. Pré-requisitos a coletar/confirmar com a Automix

> Sem o acesso ao servidor nada sobe. Use esta lista para destravar o deploy.

**Acesso e máquina**
- [ ] SSH: usuário, host/IP, chave (ou senha) e se tem **sudo/root**.
- [ ] SO e versão (Ubuntu/Debian/RHEL…) e se **Docker + Docker Compose** podem ser
      instalados/usados. (Se Docker for proibido → nginx nativo no host; a config
      `nginx/conf.d/autofluxo.conf` serve igual, trocando `upstream` para `127.0.0.1:4000`.)

**Rede / portas / firewall**
- [ ] Portas **80 e 443 livres**? Já existe outro nginx/IIS/proxy ocupando-as?
- [ ] Firewall da rede interna **libera 80/443** para os clientes que vão acessar?

**Decisão do certificado** (define qual caminho seguir na seção 3)
- [ ] Existe **domínio/hostname** de acesso? Qual exatamente? (vai em `server_name`,
      no SAN do cert e no `CORS_ORIGIN`.)
- [ ] É **público** (resolve na internet) e a **porta 80 fica exposta**? → **Let's Encrypt**.
      É **só interno**? → **auto-assinado** (ou CA interna, abaixo).
- [ ] O servidor tem **saída para a internet** (para o certbot falar com a Let's Encrypt)?
- [ ] A Automix tem uma **CA interna corporativa**? Se sim, melhor emitir o cert por ela
      (sem aviso no navegador) e definir **quem distribui** o CA/cert nas máquinas (GPO/MDM).
- [ ] Quem **gerencia o DNS** (apontar hostname → IP; e DNS-01 se for o caso)?

**Banco e operação**
- [ ] Usar **nosso Postgres em container** ou um **Postgres existente** da Automix?
      Se existente: host, porta, credenciais e política de backup (e ajuste `DB_HOST`).
- [ ] Janela de manutenção e quem **aprova** o deploy.
- [ ] Requisito de **política TLS** (versão mínima / ciphers), se houver.

---

## 2. Preparar o `.env.production`

No servidor, na raiz do repo:

```bash
cp .env.production.example .env.production
```

Preencha (ver comentários no arquivo):
- `HTTPS=true`
- `CORS_ORIGIN=https://<host>`  (o hostname/domínio real)
- `JWT_SECRET` → `openssl rand -base64 32`
- `DB_PASSWORD` forte (e `DB_READONLY_PASSWORD` se for usar a busca por IA)

> `.env.production` **não é commitado** (está no `.gitignore`).

---

## 3. Provisionar o certificado (escolha UM caminho)

### Caminho A — Auto-assinado (rede interna)

```bash
scripts/gen-self-signed-cert.sh <hostname-ou-ip>     # ex.: app.automix.local ou 192.168.1.50
```

Gera `nginx/certs/fullchain.pem` e `privkey.pem` com SAN. Os navegadores mostrarão
aviso de "não confiável" até a Automix **instalar este cert (ou a CA interna)** nas
máquinas clientes.

### Caminho B — Let's Encrypt (domínio público, porta 80 acessível)

```bash
DOMAIN=app.automix.com.br EMAIL=voce@automix.com.br scripts/init-letsencrypt.sh
# (teste o fluxo antes com STAGING=1 — gera cert não-confiável, sem rate limit)
```

O script sobe o nginx, resolve o desafio HTTP-01 via webroot, baixa o cert e copia
para `nginx/certs/`. A renovação automática roda no serviço `certbot` (perfil
`letsencrypt`), a cada 12h.

---

## 4. Subir os serviços

```bash
# Caminho A (auto-assinado):
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# Caminho B (Let's Encrypt — inclui o serviço de renovação):
docker compose --env-file .env.production -f docker-compose.prod.yml --profile letsencrypt up -d --build
```

> Use **sempre** `--env-file .env.production` — é o que faz a interpolação `${DB_*}`
> do compose funcionar (o banco usa esses valores para inicializar).

### Migrations (primeira subida)

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm app npm run migrate:up
# Primeira carga de dados (usuários/seed), se aplicável:
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm app npm run migrate:seed
```

---

## 5. Verificação (critérios de aceite)

```bash
# (1) Acessível via https:// — 200 + header HSTS:
curl -kI https://<host>            # -k tolera cert auto-assinado

# (2) Redirect HTTP→HTTPS — 301 do nginx na borda:
curl -I http://<host>              # → 301 Location: https://<host>/

#     Guard do Express (acesso direto à porta do Node, sem X-Forwarded-Proto):
#     responde 308 para https. (Só relevante se a 4000 estiver exposta.)

# (3) HTTPS=true presente no .env.production → comprovado pelo HSTS ativo acima.
```

E abra `https://<host>` no navegador e faça login. (Em auto-assinado, aceite o aviso
ou instale o cert/CA antes.)

Backend e testes:
```bash
npm run test:ci      # a flag HTTPS entrou no schema; a suíte deve seguir verde
```

---

## 6. Operação

- **Logs:** `docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app nginx`
- **Reload do nginx** (ex.: após renovar cert): `... exec nginx nginx -s reload`
- **Renovação Let's Encrypt:** automática no serviço `certbot`. Após renovar, o nginx
  precisa recarregar — agende no host (cron):
  ```
  0 3 * * * cd /caminho/AutoFluxo && docker compose --env-file .env.production -f docker-compose.prod.yml exec nginx nginx -s reload
  ```
- **Backup do banco:** volume `db_data`. Ex.:
  `docker compose --env-file .env.production -f docker-compose.prod.yml exec db pg_dump -U <DB_USER> <DB_NAME> > backup.sql`

---

## 7. Nginx nativo no host (alternativa, se Docker não for permitido)

A config é a mesma. No servidor:
1. Instale nginx; copie `nginx/conf.d/autofluxo.conf` para `/etc/nginx/conf.d/`.
2. No arquivo, troque o `upstream` de `app:4000` para `127.0.0.1:4000`.
3. Coloque os certs em `/etc/nginx/certs/` (ou ajuste `ssl_certificate*`).
4. Rode o backend (porta 4000) e o Postgres no host; `nginx -t && systemctl reload nginx`.
