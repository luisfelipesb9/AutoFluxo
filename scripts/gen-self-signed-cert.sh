#!/usr/bin/env bash
# Gera um certificado TLS auto-assinado para o AutoFluxo rodar em HTTPS na rede
# interna. Grava em nginx/certs/{fullchain,privkey}.pem — exatamente os caminhos
# que nginx/conf.d/autofluxo.conf espera.
#
# Uso:   scripts/gen-self-signed-cert.sh <hostname-ou-ip> [dias]
# Ex.:   scripts/gen-self-signed-cert.sh app.automix.local
#        scripts/gen-self-signed-cert.sh 192.168.1.50 825
#
# O hostname/IP entra no SAN (Subject Alternative Name) — navegadores modernos
# exigem SAN; CN sozinho não basta. Para sumir com o aviso de "não confiável", a
# Automix precisa instalar este certificado (ou uma CA interna) nas máquinas
# clientes (via GPO/MDM).
set -euo pipefail

HOST="${1:-}"
DAYS="${2:-825}"   # 825 dias = limite prático aceito por navegadores; ok para uso interno.

if [[ -z "$HOST" ]]; then
  echo "Uso: $0 <hostname-ou-ip> [dias]" >&2
  exit 1
fi

# Diretório de saída relativo à raiz do repo (este script vive em scripts/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/../nginx/certs"
mkdir -p "$CERT_DIR"

# SAN como IP ou DNS conforme o formato do argumento.
if [[ "$HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  SAN="IP:$HOST"
else
  SAN="DNS:$HOST"
fi

openssl req -x509 -newkey rsa:2048 -sha256 -nodes \
  -days "$DAYS" \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=$HOST" \
  -addext "subjectAltName=$SAN"

chmod 600 "$CERT_DIR/privkey.pem"

echo "✅ Certificado auto-assinado gerado em nginx/certs/ para: $HOST (válido $DAYS dias)"
echo "   - nginx/certs/fullchain.pem"
echo "   - nginx/certs/privkey.pem"
