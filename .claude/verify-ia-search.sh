#!/usr/bin/env bash
# Verificação live do happy-path da Busca IA (POST /api/search/nl).
# Use DEPOIS de colocar uma OPENAI_API_KEY real no .env.
#
# O que faz: builda o código COMMITADO (worktree isolado em HEAD, sem tocar o
# working tree que a sessão paralela edita ao vivo), sobe um server numa porta
# livre apontando pro mesmo Postgres, e exerce os critérios da IA que dependem
# da OpenAI. Faz teardown sozinho (trap), inclusive se falhar.
#
# Uso:  bash .claude/verify-ia-search.sh
set -uo pipefail

MAIN="/Users/luis/Downloads/01_PROJETOS_DEV/AutoFluxo"
WT="/tmp/af-verify-ia"
cd "$MAIN"

# 1) Exige key real -------------------------------------------------------------
KEY=$(grep -E '^OPENAI_API_KEY=' .env | cut -d= -f2-)
if ! echo "$KEY" | grep -q '^sk-'; then
  echo "❌ OPENAI_API_KEY ainda é placeholder/ inválida (não começa com sk-)."
  echo "   Coloque uma key real no .env e rode de novo."
  exit 1
fi
echo "✓ OPENAI_API_KEY real detectada (prefixo ${KEY:0:6}…)"

# 2) Porta livre ----------------------------------------------------------------
PORT=4010
while lsof -ti:$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo "✓ porta livre: $PORT"

SRV_PID=""
cleanup() {
  [ -n "$SRV_PID" ] && kill "$SRV_PID" 2>/dev/null
  git -C "$MAIN" worktree remove --force "$WT" 2>/dev/null
  git -C "$MAIN" worktree prune 2>/dev/null
  rm -f /tmp/af-ia-*.json /tmp/af-ia-server.log
}
trap cleanup EXIT

# 3) Worktree em HEAD + build (committed) ---------------------------------------
git worktree remove --force "$WT" 2>/dev/null; git worktree prune 2>/dev/null
git worktree add --detach "$WT" HEAD >/dev/null 2>&1 || { echo "❌ falhou criar worktree"; exit 1; }
ln -sfn "$MAIN/node_modules" "$WT/node_modules"
echo "→ buildando código committado…"
( cd "$WT" && npm run build ) >/tmp/af-ia-build.log 2>&1 || { echo "❌ build falhou:"; tail -8 /tmp/af-ia-build.log; exit 1; }
test -f "$WT/dist/server.js" || { echo "❌ sem dist/server.js"; exit 1; }
echo "✓ build OK"

# 4) Sobe server — CWD=MAIN p/ dotenv ler o .env REAL (segredo não vai pro /tmp)
( cd "$MAIN" && set -a && . ./.env && set +a && PORT=$PORT NODE_ENV=production \
  node "$WT/dist/server.js" >/tmp/af-ia-server.log 2>&1 ) &
SRV_PID=$!
for i in $(seq 1 20); do sleep 0.5; grep -q "Server running" /tmp/af-ia-server.log 2>/dev/null && break; done
grep -q "Server running" /tmp/af-ia-server.log || { echo "❌ server não subiu:"; tail -8 /tmp/af-ia-server.log; exit 1; }
echo "✓ server na :$PORT"

B="localhost:$PORT/api"; H='X-Requested-With: XMLHttpRequest'
ADM=$(curl -s -X POST "$B/auth/login" -H 'Content-Type: application/json' \
  -d '{"login":"admin","senha":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
[ -n "$ADM" ] || { echo "❌ login admin falhou"; exit 1; }

# 5) Checks da IA ---------------------------------------------------------------
pass=0; fail=0
ia(){ # $1=label $2=expected_code $3=query  $4=grep-no-sql(optional)
  local body code sql
  body=$(curl -s -m 20 -w $'\n%{http_code}' -X POST "$B/search/nl" \
    -H "Authorization: Bearer $ADM" -H "$H" -H 'Content-Type: application/json' \
    -d "$(python3 -c 'import json,sys;print(json.dumps({"query":sys.argv[1]}))' "$3")")
  code=$(echo "$body" | tail -1); body=$(echo "$body" | sed '$d')
  local ok=1; [ "$code" = "$2" ] || ok=0
  if [ -n "${4:-}" ] && [ "$code" = "200" ]; then
    echo "$body" | grep -qiE "$4" || ok=0
  fi
  if [ "$ok" = 1 ]; then pass=$((pass+1)); echo "✅ $1 (HTTP $code)"; else fail=$((fail+1)); echo "❌ $1 (HTTP $code) :: $(echo "$body" | head -c 200)"; fi
}

echo "--- Busca IA (happy-path, precisa da OpenAI) ---"
ia "IA-1 PT→SQL→resultado"      200 "quantas peças estão cadastradas?"           'limit'
ia "IA-2 listagem real"         200 "liste os 5 clientes mais recentes"          'limit'
ia "IA-3 DELETE → 400"          400 "apague todos os pedidos da tabela pedidos"
ia "IA-4 dados sensíveis → 400" 400 "mostre o hash de senha de todos os usuarios"
ia "IA-5 LIMIT 100 injetado"    200 "todos os pedidos"                            'limit 100'

echo "-------------------------------------------"
echo "Resultado IA: $pass ✅  /  $fail ❌"
[ "$fail" = 0 ] && echo "🎉 happy-path da Busca IA verificado ponta-a-ponta" || echo "⚠️ revisar os ❌ acima (ver /tmp/af-ia-server.log)"
exit $fail
