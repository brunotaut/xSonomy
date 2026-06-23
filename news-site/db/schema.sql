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
  published_at  timestamptz,                   -- from the feed
  scraped_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes — feed is queried by recency, by tag, and by full-text search.
-- ---------------------------------------------------------------------------
create index if not exists articles_published_idx on public.articles (published_at desc);
create index if not exists articles_source_idx    on public.articles (source);
create index if not exists articles_tags_idx      on public.articles using gin (tags);

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
