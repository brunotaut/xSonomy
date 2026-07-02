-- xSonomy UAV news feed — Supabase / Postgres schema.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run).
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Table: articles  (one row per de-duplicated news item)
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  url           text not null unique,          -- canonical source URL = dedup key + backlink
  url_hash      text not null,                 -- sha256(url), for fast lookups
  title         text not null,
  summary       text,                          -- short, plain-text (1-3 sentences)
  image_url     text,                          -- the SOURCE's image URL (hotlinked, not stored)
  source        text not null,                 -- outlet name, e.g. "DroneLife"
  source_id     int,                           -- id from sources.json
  source_url    text,                          -- outlet homepage
  country       text,
  lang          text,
  tags          text[] not null default '{}',  -- e.g. {counter-uas, eu-regulatory, ukraine}
  companies     text[] not null default '{}',  -- orgs/manufacturers mentioned, e.g. {Anduril, DJI}
  products      text[] not null default '{}',  -- systems/products mentioned, e.g. {MQ-28 Ghost Bat}
  published_at  timestamptz,                   -- from the feed
  scraped_at    timestamptz not null default now(),
  analyzed_at   timestamptz                    -- when the LLM entity pass last ran (null = pending)
);

-- Back-fill the new columns onto pre-existing tables (idempotent).
alter table public.articles add column if not exists companies   text[] not null default '{}';
alter table public.articles add column if not exists products    text[] not null default '{}';
alter table public.articles add column if not exists analyzed_at  timestamptz;

-- ---------------------------------------------------------------------------
-- Indexes — feed is queried by recency, by tag, and by full-text search.
-- ---------------------------------------------------------------------------
create index if not exists articles_published_idx on public.articles (published_at desc);
create index if not exists articles_source_idx    on public.articles (source);
create index if not exists articles_tags_idx      on public.articles using gin (tags);
create index if not exists articles_companies_idx on public.articles using gin (companies);
create index if not exists articles_products_idx  on public.articles using gin (products);
create index if not exists articles_analyzed_idx  on public.articles (analyzed_at);

-- Full-text search over title + summary (used by the client search box).
alter table public.articles
  add column if not exists fts tsvector
  generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,''))
  ) stored;
create index if not exists articles_fts_idx on public.articles using gin (fts);

-- ---------------------------------------------------------------------------
-- Row Level Security: the public site reads with the ANON key (read-only).
-- Writes happen only from GitHub Actions using the SERVICE ROLE key,
-- which bypasses RLS — so we expose SELECT to anon, nothing else.
-- ---------------------------------------------------------------------------
alter table public.articles enable row level security;

drop policy if exists "public read" on public.articles;
create policy "public read"
  on public.articles
  for select
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- Optional helper: a view exposing only the public columns, ordered newest first.
-- The client can hit /rest/v1/articles directly; this is just a convenience.
-- ---------------------------------------------------------------------------
create or replace view public.feed as
  select id, url, title, summary, image_url, source, source_url,
         country, lang, tags, published_at
  from public.articles
  order by published_at desc nulls last;

-- ---------------------------------------------------------------------------
-- Entity resolution (resolve-entities.mjs): per-tag decision cache + per-
-- article progress stamp. Applied to the live DB as migration
-- 'entity_resolution' (2026-07-02); kept here for reference/idempotent re-runs.
-- ---------------------------------------------------------------------------
create table if not exists public.tag_resolutions (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('company','product')),
  tag         citext not null,
  decision    text not null check (decision in ('matched','created','rejected')),
  entity_id   uuid,               -- companies.id or products.id (null when rejected)
  reason      text,               -- 'exact' | 'alias' | 'normalized' | 'fuzzy:0.93' | 'llm' | 'blocklist' | …
  created_at  timestamptz not null default now(),
  unique (kind, tag)
);

alter table public.articles add column if not exists entities_resolved_at timestamptz;

create index if not exists articles_entities_unresolved_idx
  on public.articles (published_at desc)
  where entities_resolved_at is null and analyzed_at is not null;

-- ---------------------------------------------------------------------------
-- Side catalogues (resolve-entities.mjs): investment funds and government/
-- quasi-government bodies mentioned in the news, kept out of the companies
-- registry. Applied to the live DB as migration 'investors_institutions'
-- (2026-07-02); kept here for reference.
-- ---------------------------------------------------------------------------
create table if not exists public.investors (
  id            uuid primary key default gen_random_uuid(),
  slug          citext unique not null,
  name          text not null,
  investor_type text,                -- vc / pe / corporate / impact / angel …
  hq_country    text,
  website       text,
  source_urls   text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create table if not exists public.institutions (
  id               uuid primary key default gen_random_uuid(),
  slug             citext unique not null,
  name             text not null,
  institution_type text,             -- government_research / ansp / intergovernmental / think_tank / test_centre / association / foundation …
  hq_country       text,
  website          text,
  source_urls      text[] not null default '{}',
  created_at       timestamptz not null default now()
);

alter table public.investors    enable row level security;
alter table public.institutions enable row level security;
drop policy if exists "public read" on public.investors;
create policy "public read" on public.investors    for select to anon using (true);
drop policy if exists "public read" on public.institutions;
create policy "public read" on public.institutions for select to anon using (true);

-- Make sure PostgREST picks up the new table/columns immediately.
notify pgrst, 'reload schema';
