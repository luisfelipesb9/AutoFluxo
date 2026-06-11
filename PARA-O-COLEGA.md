# AutoFluxo — o que já está pronto e o que falta (explicação simples)

Imagina que a gente está construindo um **sistema para uma oficina / loja de autopeças**.
Quando um carro chega: alguém faz um **pedido** → o cliente **paga** → o pessoal do
**estoque separa as peças** → o **montador monta** → o pedido fica **pronto**.
Nosso sistema controla esse caminho inteiro.

---

## O sistema tem duas partes (pensa num restaurante 🍔)

- **O salão** — onde você senta, olha o cardápio e clica = o **Frontend** (as telas bonitas).
- **A cozinha** — onde a comida é feita de verdade, com as regras e os ingredientes guardados = o **Backend** (o "cérebro" + a "memória").

O salão é a parte que se vê. A cozinha é a parte que faz acontecer.

---

## O que foi construído: a COZINHA (backend) 👨‍🍳

- **A memória** (banco de dados — tipo um caderno gigante) que guarda usuários, peças,
  clientes, carros, pedidos e pagamentos.
- **As regras de cada etapa**: criar pedido → pagar → separar → montar → concluir.
  Cada etapa só acontece na ordem certa (não dá pra montar antes de pagar, por exemplo).
- **Um segurança na porta** 🛡️: cada pessoa só faz o que pode — o **caixa** cobra,
  o **estoque** separa, o **montador** monta, o **admin** gerencia. Quem tenta fazer
  o que não pode, leva "barrado".
- **Coisas espertas**: o estoque **nunca fica negativo** (não dá pra separar peça que
  não existe), cada pagamento gera uma **nota fiscal com número único**, e tudo que
  acontece é anotado num **diário** (registro de ações).
- **Tudo testado** ✅: mais de **250 testes automáticos** + uma **simulação completa**
  (criei um pedido, paguei, separei do estoque, montei e conclui) — passou tudo.

---

## O que ainda falta (e onde VOCÊ entra) 🚧

1. **Ligar o salão na cozinha.** Hoje as telas mostram dados **de mentirinha** (fake) —
   elas ainda **não conversam** com a cozinha. O próximo passo é fazer as telas
   pedirem/gravarem os dados **de verdade** no backend. (Já deixei marcado no código
   onde trocar o "fake" pela chamada real.)
2. **Completar o cardápio da cozinha (Swagger).** É uma página que lista tudo que a
   cozinha sabe fazer. Falta terminar essa lista.

---

## Como rodar na sua máquina (copia e cola) 💻

> Precisa ter **Docker** e **Node.js** instalados.

```bash
git clone <url-do-repo> && cd AutoFluxo
git checkout feat/backend-pedido-flow
npm install
docker compose up -d db            # liga o banco de dados
cp .env.example .env               # cria as configurações
npm run build
NODE_ENV=production npm run migrate:up    # monta as tabelas
NODE_ENV=production npm run migrate:seed  # cria os usuários de teste
NODE_ENV=production node dist/server.js   # liga a COZINHA  -> http://localhost:4000
```

Em **outro terminal**, liga o SALÃO (as telas):

```bash
python3 -m http.server 3000 --directory frontend   # -> http://localhost:3000/login.html
```

Abra **http://localhost:3000/login.html** no navegador.

- **Login das telas (fake):** usuário `admin` (ou `caixa`, `estoque`, `vendedor`,
  `montador`) + **qualquer senha**.
- **Login de verdade na cozinha (API/Swagger):** `admin` / `admin123`
  (veja em http://localhost:4000/api/docs/).

> 💡 Detalhe chato: nos comandos de `migrate`/servidor a gente põe `NODE_ENV=production`
> só pra evitar um errinho de log no modo de desenvolvimento. É só isso.

---

## Resumindo em 1 frase

A **cozinha (backend) está pronta e testada**; falta **ligar as telas (frontend) nela**
e **completar o cardápio (Swagger)** — e é aí que a gente continua. 🚀
