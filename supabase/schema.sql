-- Nexo Estoque schema for Supabase.
-- Run this script in the Supabase SQL Editor.

begin;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  category text not null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  min_stock integer not null default 5 check (min_stock >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  type text not null check (type in ('entrada', 'saida')),
  quantity integer not null check (quantity > 0),
  client_name text not null,
  movement_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists movements_movement_date_idx
  on public.movements (movement_date desc);

create index if not exists movements_product_id_idx
  on public.movements (product_id);

alter table public.products enable row level security;
alter table public.movements enable row level security;

grant usage on schema public to authenticated;
grant select, insert on public.products to authenticated;
grant select on public.movements to authenticated;

drop policy if exists products_select_authenticated on public.products;
create policy products_select_authenticated
  on public.products for select to authenticated
  using (auth.uid() is not null);

drop policy if exists products_insert_authenticated on public.products;
create policy products_insert_authenticated
  on public.products for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists movements_select_authenticated on public.movements;
create policy movements_select_authenticated
  on public.movements for select to authenticated
  using (auth.uid() is not null);

create or replace function public.register_stock_movement(
  p_product_id uuid,
  p_type text,
  p_quantity integer,
  p_client_name text,
  p_movement_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_product_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória' using errcode = '42501';
  end if;

  if p_type is null or p_type not in ('entrada', 'saida') or p_quantity is null or p_quantity <= 0 then
    raise exception 'Movimentação inválida';
  end if;

  if nullif(trim(p_client_name), '') is null or p_movement_date is null then
    raise exception 'Cliente/fornecedor e data são obrigatórios';
  end if;

  if p_type = 'entrada' then
    update public.products
      set quantity = quantity + p_quantity
      where id = p_product_id
      returning id into updated_product_id;
  else
    update public.products
      set quantity = quantity - p_quantity
      where id = p_product_id and quantity >= p_quantity
      returning id into updated_product_id;
  end if;

  if updated_product_id is null then
    raise exception 'Produto inexistente ou estoque insuficiente';
  end if;

  insert into public.movements (product_id, type, quantity, client_name, movement_date)
  values (p_product_id, p_type, p_quantity, trim(p_client_name), p_movement_date);
end;
$$;

revoke all on function public.register_stock_movement(uuid, text, integer, text, date)
  from public, anon, authenticated;
grant execute on function public.register_stock_movement(uuid, text, integer, text, date)
  to authenticated;

commit;