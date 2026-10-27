# Nexo Estoque

Gerenciamento de Produtos

Aplicação React + TypeScript para cadastro de produtos de informática e controle de entradas e saídas.
O histórico de movimentações pode ser exportado para uma planilha `.xlsx`.

## Rodar localmente

```bash
npm install
npm run dev
```

Sem variáveis do Supabase, o app abre em modo demonstração com alguns produtos de exemplo. O acesso inicial é `admin` (senha). Esse login é apenas uma barreira visual no navegador e não protege os dados.

## Supabase

O projeto Supabase já está configurado localmente em `.env.local` (arquivo ignorado pelo Git). Para outro ambiente, configure estas variáveis na raiz:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

Reinicie o servidor depois de alterar as variáveis. Use somente a chave pública `anon`/publishable no frontend. Nunca coloque `service_role`, senha do banco ou a connection string PostgreSQL em variáveis `VITE_*`. A connection string é exclusiva para ferramentas de servidor/administrativas e não é necessária pelo app web.

No SQL Editor do Supabase, abra [supabase/schema.sql](supabase/schema.sql), copie o arquivo inteiro e execute. Ele cria as tabelas, índices, políticas RLS e a função transacional de movimentação.

Antes de entrar no app, crie o usuário administrador em **Authentication → Users → Add user** no painel do Supabase. O login do app usa o e-mail e a senha desse usuário via Supabase Auth; não existe senha administrativa embutida no frontend.

## Segurança

Sem variáveis do Supabase, o app continua disponível em modo demonstração com a senha `admin`; esse modo não persiste dados. Com Supabase configurado, o app restaura e encerra sessões pelo Supabase Auth. O schema habilita RLS e permite acesso apenas a usuários autenticados. Não crie políticas abertas para `anon` em produção. A chave pública do Supabase não substitui políticas de acesso.
