create or replace function public.admin_bulk_upsert_products(p_operations jsonb)
returns table (
  id uuid,
  sku_digiflazz text,
  name text,
  category text,
  provider text,
  base_price_minor bigint,
  is_active boolean,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  operation_record jsonb;
begin
  if jsonb_typeof(p_operations) <> 'array' then
    raise exception 'p_operations must be a JSON array';
  end if;

  for operation_record in
    select value
    from jsonb_array_elements(p_operations)
  loop
    if not (operation_record ? 'sku_digiflazz') then
      raise exception 'sku_digiflazz is required';
    end if;

    insert into public.products (
      sku_digiflazz,
      name,
      category,
      provider,
      base_price_minor,
      is_active,
      metadata
    )
    values (
      trim(operation_record ->> 'sku_digiflazz'),
      trim(operation_record ->> 'name'),
      trim(operation_record ->> 'category'),
      trim(operation_record ->> 'provider'),
      (operation_record ->> 'base_price_minor')::bigint,
      coalesce((operation_record ->> 'is_active')::boolean, true),
      coalesce(operation_record -> 'metadata', '{}'::jsonb)
    )
    on conflict (sku_digiflazz)
    do update set
      name = excluded.name,
      category = excluded.category,
      provider = excluded.provider,
      base_price_minor = excluded.base_price_minor,
      is_active = excluded.is_active,
      metadata = coalesce(public.products.metadata, '{}'::jsonb) || coalesce(excluded.metadata, '{}'::jsonb),
      updated_at = timezone('utc', now());
  end loop;

  return query
  select
    p.id,
    p.sku_digiflazz,
    p.name,
    p.category,
    p.provider,
    p.base_price_minor,
    p.is_active,
    p.metadata,
    p.created_at,
    p.updated_at
  from public.products p
  where lower(p.sku_digiflazz) in (
    select lower(value ->> 'sku_digiflazz')
    from jsonb_array_elements(p_operations)
  )
  order by p.name asc;
end;
$$;
