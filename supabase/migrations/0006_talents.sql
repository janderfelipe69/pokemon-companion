-- Itens com imagem + talentos (com os itens que cada um pede).
-- Seguro para executar mais de uma vez: não apaga nem sobrescreve o que você já editou.

-- ============================================================
-- 1. Imagem dos itens
-- (talent_items já existe desde o 0001; aqui ganha o caminho da imagem)
-- ============================================================
alter table public.talent_items add column if not exists image_path text;

-- Pasta pública onde ficam as imagens dos itens (PNG, JPG, GIF ou WebP, até 1 MB cada).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('talent-items', 'talent-items', true, 1048576, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

-- ============================================================
-- 2. Talentos e itens necessários
-- category: 'character', 'pokemon' ou o código do tipo ('bug', 'fire'...).
-- ============================================================
create table if not exists public.talents (
  id          bigint generated always as identity primary key,
  category    text not null check (btrim(category) <> ''),
  position    integer not null default 0,
  description text not null check (btrim(description) <> '')
);
create index if not exists talents_category_idx on public.talents (category, position);

create table if not exists public.talent_requirements (
  id        bigint generated always as identity primary key,
  talent_id bigint not null references public.talents (id) on delete cascade,
  item_id   bigint not null references public.talent_items (id) on delete restrict,
  quantity  integer not null check (quantity > 0),
  position  integer not null default 0,
  unique (talent_id, item_id)
);
create index if not exists talent_requirements_talent_idx on public.talent_requirements (talent_id);
create index if not exists talent_requirements_item_idx on public.talent_requirements (item_id);

alter table public.talents enable row level security;
alter table public.talent_requirements enable row level security;

drop policy if exists "Leitura pública" on public.talents;
create policy "Leitura pública" on public.talents for select to anon, authenticated using (true);

drop policy if exists "Leitura pública" on public.talent_requirements;
create policy "Leitura pública" on public.talent_requirements for select to anon, authenticated using (true);

-- Escritas administrativas são feitas pela rota protegida do servidor.

-- Salva todos os talentos de uma categoria de uma vez (tudo ou nada).
create or replace function public.save_talent_category(p_category text, p_talents jsonb)
returns void language plpgsql set search_path = '' as $$
declare
  t jsonb;
  r jsonb;
  tid bigint;
  pos integer := 0;
  rpos integer;
  kept bigint[] := '{}';
begin
  if jsonb_typeof(p_talents) <> 'array' then
    raise exception 'p_talents deve ser uma lista';
  end if;

  for t in select * from jsonb_array_elements(p_talents) loop
    pos := pos + 1;
    tid := nullif(t->>'id', '')::bigint;

    if tid is not null and exists (select 1 from public.talents where id = tid and category = p_category) then
      update public.talents set description = t->>'description', position = pos where id = tid;
    else
      insert into public.talents (category, position, description)
      values (p_category, pos, t->>'description')
      returning id into tid;
    end if;

    kept := kept || tid;
    delete from public.talent_requirements where talent_id = tid;
    rpos := 0;
    for r in select * from jsonb_array_elements(coalesce(t->'requirements', '[]'::jsonb)) loop
      rpos := rpos + 1;
      insert into public.talent_requirements (talent_id, item_id, quantity, position)
      values (tid, (r->>'itemId')::bigint, (r->>'quantity')::integer, rpos);
    end loop;
  end loop;

  delete from public.talents where category = p_category and not (id = any(kept));
end $$;

revoke execute on function public.save_talent_category(text, jsonb) from public, anon, authenticated;
grant execute on function public.save_talent_category(text, jsonb) to service_role;

-- ============================================================
-- 3. Talentos já cadastrados (só entram nas categorias que ainda estão vazias)
-- Os 18 tipos têm os mesmos 4 bônus (dano de magia e defesa, 3% e 5%); só os itens mudam.
-- Ordem: a do Inseto no jogo (Fogo: os 5 primeiros como no print). Se algum tipo tiver a
-- ordem diferente, ajuste no admin (aba Talentos). Personagem: os 5 primeiros do jogo;
-- o resto você adiciona pelo admin.
-- ============================================================
insert into public.talents (category, position, description)
select v.category, v.position, v.description
from (values
  ('character', 1, 'Your character will have an increase of 300 hitpoints in their maximum health.'),
  ('character', 2, 'Give to player more 20 speed.'),
  ('character', 3, 'Gives all your Pokemon 1% critical chance.'),
  ('character', 4, 'Gives all your Pokemon 10% critical damage.'),
  ('character', 5, 'Give to player more 20 speed.'),
  ('bug', 1, 'Increases all Bug Type spells damage by 3%.'),
  ('bug', 2, 'Increases the defense of Bug Type Pokémon by 3%.'),
  ('bug', 3, 'Increases all Bug Type spells damage by 5%.'),
  ('bug', 4, 'Increases the defense of Bug Type Pokémon by 5%.'),
  ('bug', 5, 'Increases all Bug Type spells damage by 5%.'),
  ('bug', 6, 'Increases all Bug Type spells damage by 3%.'),
  ('bug', 7, 'Increases all Bug Type spells damage by 3%.'),
  ('bug', 8, 'Increases all Bug Type spells damage by 5%.'),
  ('bug', 9, 'Increases all Bug Type spells damage by 5%.'),
  ('bug', 10, 'Increases the defense of Bug Type Pokémon by 5%.'),
  ('dark', 1, 'Increases all Dark Type spells damage by 3%.'),
  ('dark', 2, 'Increases the defense of Dark Type Pokémon by 3%.'),
  ('dark', 3, 'Increases all Dark Type spells damage by 5%.'),
  ('dark', 4, 'Increases the defense of Dark Type Pokémon by 5%.'),
  ('dark', 5, 'Increases all Dark Type spells damage by 5%.'),
  ('dark', 6, 'Increases all Dark Type spells damage by 3%.'),
  ('dark', 7, 'Increases all Dark Type spells damage by 3%.'),
  ('dark', 8, 'Increases all Dark Type spells damage by 5%.'),
  ('dark', 9, 'Increases all Dark Type spells damage by 5%.'),
  ('dark', 10, 'Increases the defense of Dark Type Pokémon by 5%.'),
  ('dragon', 1, 'Increases all Dragon Type spells damage by 3%.'),
  ('dragon', 2, 'Increases the defense of Dragon Type Pokémon by 3%.'),
  ('dragon', 3, 'Increases all Dragon Type spells damage by 5%.'),
  ('dragon', 4, 'Increases the defense of Dragon Type Pokémon by 5%.'),
  ('dragon', 5, 'Increases all Dragon Type spells damage by 5%.'),
  ('dragon', 6, 'Increases all Dragon Type spells damage by 3%.'),
  ('dragon', 7, 'Increases all Dragon Type spells damage by 3%.'),
  ('dragon', 8, 'Increases all Dragon Type spells damage by 5%.'),
  ('dragon', 9, 'Increases all Dragon Type spells damage by 5%.'),
  ('dragon', 10, 'Increases the defense of Dragon Type Pokémon by 5%.'),
  ('electric', 1, 'Increases all Electric Type spells damage by 3%.'),
  ('electric', 2, 'Increases the defense of Electric Type Pokémon by 3%.'),
  ('electric', 3, 'Increases all Electric Type spells damage by 5%.'),
  ('electric', 4, 'Increases the defense of Electric Type Pokémon by 5%.'),
  ('electric', 5, 'Increases all Electric Type spells damage by 5%.'),
  ('electric', 6, 'Increases all Electric Type spells damage by 3%.'),
  ('electric', 7, 'Increases all Electric Type spells damage by 3%.'),
  ('electric', 8, 'Increases all Electric Type spells damage by 5%.'),
  ('electric', 9, 'Increases all Electric Type spells damage by 5%.'),
  ('electric', 10, 'Increases the defense of Electric Type Pokémon by 5%.'),
  ('fairy', 1, 'Increases all Fairy Type spells damage by 3%.'),
  ('fairy', 2, 'Increases the defense of Fairy Type Pokémon by 3%.'),
  ('fairy', 3, 'Increases all Fairy Type spells damage by 5%.'),
  ('fairy', 4, 'Increases the defense of Fairy Type Pokémon by 5%.'),
  ('fairy', 5, 'Increases all Fairy Type spells damage by 5%.'),
  ('fairy', 6, 'Increases all Fairy Type spells damage by 3%.'),
  ('fairy', 7, 'Increases all Fairy Type spells damage by 3%.'),
  ('fairy', 8, 'Increases all Fairy Type spells damage by 5%.'),
  ('fairy', 9, 'Increases all Fairy Type spells damage by 5%.'),
  ('fairy', 10, 'Increases the defense of Fairy Type Pokémon by 5%.'),
  ('fighting', 1, 'Increases all Fighting Type spells damage by 3%.'),
  ('fighting', 2, 'Increases the defense of Fighting Type Pokémon by 3%.'),
  ('fighting', 3, 'Increases all Fighting Type spells damage by 5%.'),
  ('fighting', 4, 'Increases the defense of Fighting Type Pokémon by 5%.'),
  ('fighting', 5, 'Increases all Fighting Type spells damage by 5%.'),
  ('fighting', 6, 'Increases all Fighting Type spells damage by 3%.'),
  ('fighting', 7, 'Increases all Fighting Type spells damage by 3%.'),
  ('fighting', 8, 'Increases all Fighting Type spells damage by 5%.'),
  ('fighting', 9, 'Increases all Fighting Type spells damage by 5%.'),
  ('fighting', 10, 'Increases the defense of Fighting Type Pokémon by 5%.'),
  ('fire', 1, 'Increases the defense of Fire Type Pokémon by 3%.'),
  ('fire', 2, 'Increases the defense of Fire Type Pokémon by 5%.'),
  ('fire', 3, 'Increases all Fire Type spells damage by 5%.'),
  ('fire', 4, 'Increases all Fire Type spells damage by 3%.'),
  ('fire', 5, 'Increases all Fire Type spells damage by 5%.'),
  ('fire', 6, 'Increases all Fire Type spells damage by 3%.'),
  ('fire', 7, 'Increases all Fire Type spells damage by 3%.'),
  ('fire', 8, 'Increases all Fire Type spells damage by 5%.'),
  ('fire', 9, 'Increases all Fire Type spells damage by 5%.'),
  ('fire', 10, 'Increases the defense of Fire Type Pokémon by 5%.'),
  ('flying', 1, 'Increases all Flying Type spells damage by 3%.'),
  ('flying', 2, 'Increases the defense of Flying Type Pokémon by 3%.'),
  ('flying', 3, 'Increases all Flying Type spells damage by 5%.'),
  ('flying', 4, 'Increases the defense of Flying Type Pokémon by 5%.'),
  ('flying', 5, 'Increases all Flying Type spells damage by 5%.'),
  ('flying', 6, 'Increases all Flying Type spells damage by 3%.'),
  ('flying', 7, 'Increases all Flying Type spells damage by 3%.'),
  ('flying', 8, 'Increases all Flying Type spells damage by 5%.'),
  ('flying', 9, 'Increases all Flying Type spells damage by 5%.'),
  ('flying', 10, 'Increases the defense of Flying Type Pokémon by 5%.'),
  ('ghost', 1, 'Increases all Ghost Type spells damage by 3%.'),
  ('ghost', 2, 'Increases the defense of Ghost Type Pokémon by 3%.'),
  ('ghost', 3, 'Increases all Ghost Type spells damage by 5%.'),
  ('ghost', 4, 'Increases the defense of Ghost Type Pokémon by 5%.'),
  ('ghost', 5, 'Increases all Ghost Type spells damage by 5%.'),
  ('ghost', 6, 'Increases all Ghost Type spells damage by 3%.'),
  ('ghost', 7, 'Increases all Ghost Type spells damage by 3%.'),
  ('ghost', 8, 'Increases all Ghost Type spells damage by 5%.'),
  ('ghost', 9, 'Increases all Ghost Type spells damage by 5%.'),
  ('ghost', 10, 'Increases the defense of Ghost Type Pokémon by 5%.'),
  ('grass', 1, 'Increases all Grass Type spells damage by 3%.'),
  ('grass', 2, 'Increases the defense of Grass Type Pokémon by 3%.'),
  ('grass', 3, 'Increases all Grass Type spells damage by 5%.'),
  ('grass', 4, 'Increases the defense of Grass Type Pokémon by 5%.'),
  ('grass', 5, 'Increases all Grass Type spells damage by 5%.'),
  ('grass', 6, 'Increases all Grass Type spells damage by 3%.'),
  ('grass', 7, 'Increases all Grass Type spells damage by 3%.'),
  ('grass', 8, 'Increases all Grass Type spells damage by 5%.'),
  ('grass', 9, 'Increases all Grass Type spells damage by 5%.'),
  ('grass', 10, 'Increases the defense of Grass Type Pokémon by 5%.'),
  ('ground', 1, 'Increases all Ground Type spells damage by 3%.'),
  ('ground', 2, 'Increases the defense of Ground Type Pokémon by 3%.'),
  ('ground', 3, 'Increases all Ground Type spells damage by 5%.'),
  ('ground', 4, 'Increases the defense of Ground Type Pokémon by 5%.'),
  ('ground', 5, 'Increases all Ground Type spells damage by 5%.'),
  ('ground', 6, 'Increases all Ground Type spells damage by 3%.'),
  ('ground', 7, 'Increases all Ground Type spells damage by 3%.'),
  ('ground', 8, 'Increases all Ground Type spells damage by 5%.'),
  ('ground', 9, 'Increases all Ground Type spells damage by 5%.'),
  ('ground', 10, 'Increases the defense of Ground Type Pokémon by 5%.'),
  ('ice', 1, 'Increases all Ice Type spells damage by 3%.'),
  ('ice', 2, 'Increases the defense of Ice Type Pokémon by 3%.'),
  ('ice', 3, 'Increases all Ice Type spells damage by 5%.'),
  ('ice', 4, 'Increases the defense of Ice Type Pokémon by 5%.'),
  ('ice', 5, 'Increases all Ice Type spells damage by 5%.'),
  ('ice', 6, 'Increases all Ice Type spells damage by 3%.'),
  ('ice', 7, 'Increases all Ice Type spells damage by 3%.'),
  ('ice', 8, 'Increases all Ice Type spells damage by 5%.'),
  ('ice', 9, 'Increases all Ice Type spells damage by 5%.'),
  ('ice', 10, 'Increases the defense of Ice Type Pokémon by 5%.'),
  ('normal', 1, 'Increases all Normal Type spells damage by 3%.'),
  ('normal', 2, 'Increases the defense of Normal Type Pokémon by 3%.'),
  ('normal', 3, 'Increases all Normal Type spells damage by 5%.'),
  ('normal', 4, 'Increases the defense of Normal Type Pokémon by 5%.'),
  ('normal', 5, 'Increases all Normal Type spells damage by 5%.'),
  ('normal', 6, 'Increases all Normal Type spells damage by 3%.'),
  ('normal', 7, 'Increases all Normal Type spells damage by 3%.'),
  ('normal', 8, 'Increases all Normal Type spells damage by 5%.'),
  ('normal', 9, 'Increases all Normal Type spells damage by 5%.'),
  ('normal', 10, 'Increases the defense of Normal Type Pokémon by 5%.'),
  ('poison', 1, 'Increases all Poison Type spells damage by 3%.'),
  ('poison', 2, 'Increases the defense of Poison Type Pokémon by 3%.'),
  ('poison', 3, 'Increases all Poison Type spells damage by 5%.'),
  ('poison', 4, 'Increases the defense of Poison Type Pokémon by 5%.'),
  ('poison', 5, 'Increases all Poison Type spells damage by 5%.'),
  ('poison', 6, 'Increases all Poison Type spells damage by 3%.'),
  ('poison', 7, 'Increases all Poison Type spells damage by 3%.'),
  ('poison', 8, 'Increases all Poison Type spells damage by 5%.'),
  ('poison', 9, 'Increases all Poison Type spells damage by 5%.'),
  ('poison', 10, 'Increases the defense of Poison Type Pokémon by 5%.'),
  ('psychic', 1, 'Increases all Psychic Type spells damage by 3%.'),
  ('psychic', 2, 'Increases the defense of Psychic Type Pokémon by 3%.'),
  ('psychic', 3, 'Increases all Psychic Type spells damage by 5%.'),
  ('psychic', 4, 'Increases the defense of Psychic Type Pokémon by 5%.'),
  ('psychic', 5, 'Increases all Psychic Type spells damage by 5%.'),
  ('psychic', 6, 'Increases all Psychic Type spells damage by 3%.'),
  ('psychic', 7, 'Increases all Psychic Type spells damage by 3%.'),
  ('psychic', 8, 'Increases all Psychic Type spells damage by 5%.'),
  ('psychic', 9, 'Increases all Psychic Type spells damage by 5%.'),
  ('psychic', 10, 'Increases the defense of Psychic Type Pokémon by 5%.'),
  ('rock', 1, 'Increases all Rock Type spells damage by 3%.'),
  ('rock', 2, 'Increases the defense of Rock Type Pokémon by 3%.'),
  ('rock', 3, 'Increases all Rock Type spells damage by 5%.'),
  ('rock', 4, 'Increases the defense of Rock Type Pokémon by 5%.'),
  ('rock', 5, 'Increases all Rock Type spells damage by 5%.'),
  ('rock', 6, 'Increases all Rock Type spells damage by 3%.'),
  ('rock', 7, 'Increases all Rock Type spells damage by 3%.'),
  ('rock', 8, 'Increases all Rock Type spells damage by 5%.'),
  ('rock', 9, 'Increases all Rock Type spells damage by 5%.'),
  ('rock', 10, 'Increases the defense of Rock Type Pokémon by 5%.'),
  ('steel', 1, 'Increases all Steel Type spells damage by 3%.'),
  ('steel', 2, 'Increases the defense of Steel Type Pokémon by 3%.'),
  ('steel', 3, 'Increases all Steel Type spells damage by 5%.'),
  ('steel', 4, 'Increases the defense of Steel Type Pokémon by 5%.'),
  ('steel', 5, 'Increases all Steel Type spells damage by 5%.'),
  ('steel', 6, 'Increases all Steel Type spells damage by 3%.'),
  ('steel', 7, 'Increases all Steel Type spells damage by 3%.'),
  ('steel', 8, 'Increases all Steel Type spells damage by 5%.'),
  ('steel', 9, 'Increases all Steel Type spells damage by 5%.'),
  ('steel', 10, 'Increases the defense of Steel Type Pokémon by 5%.'),
  ('water', 1, 'Increases all Water Type spells damage by 3%.'),
  ('water', 2, 'Increases the defense of Water Type Pokémon by 3%.'),
  ('water', 3, 'Increases all Water Type spells damage by 5%.'),
  ('water', 4, 'Increases the defense of Water Type Pokémon by 5%.'),
  ('water', 5, 'Increases all Water Type spells damage by 5%.'),
  ('water', 6, 'Increases all Water Type spells damage by 3%.'),
  ('water', 7, 'Increases all Water Type spells damage by 3%.'),
  ('water', 8, 'Increases all Water Type spells damage by 5%.'),
  ('water', 9, 'Increases all Water Type spells damage by 5%.'),
  ('water', 10, 'Increases the defense of Water Type Pokémon by 5%.')
) as v(category, position, description)
where not exists (select 1 from public.talents t where t.category = v.category);

-- Faz a API do Supabase enxergar as tabelas novas na hora.
notify pgrst, 'reload schema';
