-- Migration: 002_search_feedback
-- Creates the search_feedback table for storing user ratings on opportunity search results.
-- Each row records a thumbs-up or thumbs-down on a single result card from the search screen.

create table if not exists search_feedback (
  id                 uuid        primary key default gen_random_uuid(),
  created_at         timestamptz not null    default now(),
  query_text         text        not null,
  result_project_id  uuid        not null    references projects(id) on delete cascade,
  result_unit_id     uuid                    references units(id) on delete set null,
  match_type         text        not null    check (match_type in ('matching', 'non_matching')),
  rating             text        not null    check (rating in ('up', 'down')),
  note               text
);

create index if not exists search_feedback_project_idx  on search_feedback (result_project_id);
create index if not exists search_feedback_created_idx  on search_feedback (created_at);
