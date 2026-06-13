#!/usr/bin/env bash
# Bootstrap do primeiro certificado Let's Encrypt para o AutoFluxo, via desafio
# HTTP-01 (webroot). SÓ funciona se o DOMÍNIO for público e a porta 80 do servidor
# estiver acessível pela internet. Para rede puramente interna use, em vez disto,
# scripts/gen-self-signed-cert.sh.
#
# Uso:   DOMAIN=app.automix.com.br EMAIL=voce@automix.com.br scripts/init-letsencrypt.sh
# Teste: STAGING=1 usa o ambiente de staging do Let's Encrypt (sem rate limit; gera
#        cert NÃO confiável — só para validar o fluxo antes de pedir o cert real).
set -euo pipefail

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
STAGING="${STAGING:-0}"
COMPOSE="docker compose --env-file .env.production -f docker-compose.prod.yml"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Uso: DOMAIN=<dominio> EMAIL=<email> $0   (opcional: STAGING=1)" >&2
  exit 1
fi

WEBROOT="./nginx/certbot/www"
CERT_DIR="./nginx/certs"
mkdir -p "$WEBROOT" "$CERT_DIR"

# 1) Cert temporário para o nginx conseguir subir na 443 ANTES de termos o cert real
#    (sem ssl_certificate válido o nginx falha ao carregar).
if [[ ! -s "$CERT_DIR/fullchain.pem" ]]; then
  echo "→ Gerando cert temporário (1 dia) para o nginx subir..."
  openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 1 \
    -keyout "$CERT_DIR/privkey.pem" -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=$DOMAIN" -addext "subjectAltName=DNS:$DOMAIN"
fi

# 2) Sobe o nginx — ele passa a servir o desafio em /.well-known/acme-challenge/.
echo "→ Subindo nginx..."
$COMPOSE up -d nginx

# 3) Pede o certificado real via webroot.
STAGING_FLAG=""
[[ "$STAGING" == "1" ]] && STAGING_FLAG="--staging"
echo "→ Solicitando certificado Let's Encrypt para $DOMAIN..."
$COMPOSE run --rm certbot certonly --webroot -w /var/www/certbot \
  $STAGING_FLAG \
  -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

# 4) Copia o cert real para o caminho que o nginx lê (nginx/certs/).
echo "→ Copiando cert para nginx/certs/..."
$COMPOSE run --rm --entrypoint sh certbot -c \
  "cp -L /etc/letsencrypt/live/$DOMAIN/fullchain.pem /certs/fullchain.pem && \
   cp -L /etc/letsencrypt/live/$DOMAIN/privkey.pem  /certs/privkey.pem"

# 5) Recarrega o nginx para usar o cert novo.
echo "→ Recarregando nginx..."
$COMPOSE exec nginx nginx -s reload || $COMPOSE restart nginx

echo "✅ Certificado Let's Encrypt ativo para $DOMAIN."
echo "   Suba o serviço de renovação automática com:"
echo "   $COMPOSE --profile letsencrypt up -d"
