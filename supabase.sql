-- ═══════════════════════════════════════════════════════════════
--  Electrinder by RaYSun — schéma complet
--  À coller tel quel dans Supabase → SQL Editor → Run.
--  Réexécutable sans risque : rien n'est effacé, rien ne casse si
--  vous le relancez après une mise à jour de l'application.
-- ═══════════════════════════════════════════════════════════════

-- 1. Les entreprises qui s'inscrivent au stand.
--    Rien d'identifiant ici : nom d'entreprise et code postal.
create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  cree_le     timestamptz not null default now(),
  entreprise  text not null,
  role        text not null check (role in ('producteur','consommateur','mixte')),
  taille      text not null check (taille in ('xs','s','m','l')),
  code_postal text not null check (code_postal ~ '^[1-9][0-9]{3}$'),
  ville       text,
  demo        boolean not null default false
);

-- Pour une base déjà créée avant l'ajout de l'amorçage :
alter table public.participants add column if not exists demo boolean not null default false;

create index if not exists participants_cree_le_idx on public.participants (cree_le);
create index if not exists participants_demo_idx on public.participants (demo);

-- 2. Les e-mails, dans une table séparée.
--    La clé publique peut y écrire, jamais la relire : personne
--    ne peut aspirer votre fichier de contacts depuis le stand.
create table if not exists public.contacts (
  id             uuid primary key default gen_random_uuid(),
  cree_le        timestamptz not null default now(),
  participant_id uuid references public.participants (id) on delete cascade,
  email          text not null
);

-- ── Droits d'accès ────────────────────────────────────────────
alter table public.participants enable row level security;
alter table public.contacts     enable row level security;

drop policy if exists "lecture publique" on public.participants;
create policy "lecture publique"
  on public.participants for select to anon, authenticated using (true);

drop policy if exists "inscription publique" on public.participants;
create policy "inscription publique"
  on public.participants for insert to anon, authenticated with check (true);

-- Nécessaire aux boutons de remise à zéro de l'écran Réglages.
-- Supprimez cette policy après le salon : n'importe qui ayant la clé
-- publique peut vider la table tant qu'elle existe.
drop policy if exists "purge stand" on public.participants;
create policy "purge stand"
  on public.participants for delete to anon, authenticated using (true);

drop policy if exists "depot email" on public.contacts;
create policy "depot email"
  on public.contacts for insert to anon, authenticated with check (true);

-- Aucune policy de lecture sur contacts : les e-mails ne se
-- récupèrent que depuis le tableau de bord Supabase.

-- ── Temps réel ────────────────────────────────────────────────
-- C'est ce qui fait apparaître le point sur le mur à la seconde
-- où quelqu'un valide sur la tablette.
do $$
begin
  alter publication supabase_realtime add table public.participants;
exception when duplicate_object then null;
end $$;

-- ═══════════════════════════════════════════════════════════════
--  3. Les scores du jeu Electrinder.
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.scores (
  id         uuid primary key default gen_random_uuid(),
  cree_le    timestamptz not null default now(),
  nom        text not null check (char_length(nom) between 1 and 24),
  entreprise text,
  score      integer not null check (score >= 0 and score <= 200000)
);

create index if not exists scores_classement_idx on public.scores (score desc);

alter table public.scores enable row level security;

drop policy if exists "classement public" on public.scores;
create policy "classement public"
  on public.scores for select to anon, authenticated using (true);

drop policy if exists "depot score" on public.scores;
create policy "depot score"
  on public.scores for insert to anon, authenticated with check (true);

drop policy if exists "purge scores" on public.scores;
create policy "purge scores"
  on public.scores for delete to anon, authenticated using (true);

do $$
begin
  alter publication supabase_realtime add table public.scores;
exception when duplicate_object then null;
end $$;

-- ═══════════════════════════════════════════════════════════════
--  4. Réglages partagés par tous les appareils.
--     Sert notamment à la durée d'une partie : les visiteurs jouent
--     sur leur propre téléphone, qui n'a aucun réglage local.
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.reglages (
  cle    text primary key,
  valeur jsonb not null,
  maj    timestamptz not null default now()
);

alter table public.reglages enable row level security;

drop policy if exists "lecture reglages" on public.reglages;
create policy "lecture reglages"
  on public.reglages for select to anon, authenticated using (true);

drop policy if exists "ecriture reglages" on public.reglages;
create policy "ecriture reglages"
  on public.reglages for insert to anon, authenticated with check (true);

drop policy if exists "maj reglages" on public.reglages;
create policy "maj reglages"
  on public.reglages for update to anon, authenticated using (true) with check (true);

-- ═══════════════════════════════════════════════════════════════
--  Rafraîchit le cache de schéma de l'API. Sans ça, une colonne
--  ajoutée reste invisible pour l'application pendant un moment.
-- ═══════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';
