# Kitty Finance ♥

Controle financeiro pessoal com visual delicado em rosa pastel, laços e uma gatinha mascote original.

Receitas, despesas, contas a pagar, metas, relatórios e calendário financeiro, com login e dados salvos de verdade.

## Funcionalidades

- **Dashboard**: saldo disponível, receitas e despesas do mês (com variação contra o mês anterior), total economizado, contas próximas do vencimento, despesas recentes, gráfico de receitas x despesas e evolução do saldo. Tem seletor de mês.
- **Receitas**: cadastro, edição e exclusão, com filtro por mês, período ou tudo, por categoria e com busca.
- **Despesas**: tudo isso mais status (pago ou pendente) e forma de pagamento, com filtros combinados e totais do filtro.
- **Contas a pagar**: vencimento, contas atrasadas, alerta de "vence logo", marcar e desmarcar como paga, e repetição mensal (ao pagar, a do próximo mês é criada).
- **Metas**: barra de progresso, guardar e retirar dinheiro, histórico de aportes e sugestão de quanto guardar por mês até o prazo.
- **Relatórios**: gastos por categoria, receitas e despesas por mês, comparação entre meses, evolução do saldo, percentual de economia e categoria com maior gasto.
- **Calendário**: recebimentos, despesas, contas pagas, pendentes e atrasadas e prazos de metas, cada um com sua cor.
- **Perfil**: nome, foto, moeda (R$, US$ e €, só a formatação), tema claro, escuro ou do sistema, tom de destaque, decorações, avisos no app e notificações do navegador, troca de senha, backup em JSON e apagar dados.
- **Conta de demonstração**: dados fictícios, claramente sinalizados e separados das contas reais.

## Como os valores são calculados

- **Saldo disponível** = receitas recebidas − despesas pagas − contas pagas − dinheiro guardado em metas (tudo até hoje).
- **Despesas do mês** = despesas lançadas no mês (pagas e pendentes) + contas pagas no mês.
- **Total economizado** = soma do que está guardado nas metas.
- Valores são guardados em centavos (inteiros), sem erro de arredondamento.

## Tecnologias

React 19 + TypeScript, Tailwind CSS 4, Lucide, Recharts e Vite. A API é Express e usa **SQLite** local (arquivo `data/`) ou **Postgres** quando existe `DATABASE_URL` (na Vercel). As senhas usam scrypt e as sessões são assinadas com HMAC.

## Rodar na sua máquina

Requer Node 22.5 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:5173. A API roda em http://localhost:3333 e os dados ficam em `data/kitty-finance.db`.

Versão compilada (app e API na mesma porta):

```bash
npm run build && npm start
```

## Publicar na Vercel

`npm run vercel-build` gera `.vercel/output`, com o site estático e a API como função Node. Basta ligar um banco Postgres ao projeto (por exemplo, Neon pela aba Storage), que define `DATABASE_URL`. As tabelas são criadas sozinhas no primeiro acesso.
