-- ============================================================
-- PropIQ — Initial Schema
-- Migration: 001_schema.sql
-- Compatible with: Supabase (PostgreSQL 15)
--
-- Entity hierarchy:
--   neighborhoods (1) → projects (many) → units (many)
-- ============================================================


-- ── Shared trigger function for auto-updating updated_at ────────────────────
-- All three tables share this single trigger function.

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TABLE: neighborhoods
--
-- A reusable location entity shared across multiple projects.
-- Captures area character, transport, amenities, and the buyer
-- demographic most likely to purchase in this neighbourhood.
-- ============================================================

CREATE TABLE neighborhoods (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL    DEFAULT now(),
  updated_at       timestamptz NOT NULL    DEFAULT now(),

  -- Identity
  name             text        NOT NULL,
  city             text        NOT NULL,

  -- Demographic / buyer profile
  -- Values drawn from BuyerProfile in domain.ts:
  --   'families' | 'young_professionals' | 'retirees' | 'investors' | 'students'
  target_buyers    text[]      NOT NULL    DEFAULT '{}',

  -- Character
  transport_links      text,
  nearby_amenities     text,
  neighbourhood_notes  text
);

CREATE TRIGGER set_neighborhoods_updated_at
  BEFORE UPDATE ON neighborhoods
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================
-- TABLE: projects
--
-- A single real estate development (building or complex).
-- Belongs to one neighborhood; contains many units.
-- ============================================================

CREATE TABLE projects (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL    DEFAULT now(),
  updated_at       timestamptz NOT NULL    DEFAULT now(),

  -- Relationship
  neighborhood_id  uuid        NOT NULL
    REFERENCES neighborhoods (id) ON DELETE CASCADE,

  -- Identity
  title            text        NOT NULL,
  developer        text,
  source           text,        -- agency or broker name
  commission       text,        -- e.g. "0%", "3%", "1000 EUR flat"

  -- Building
  total_apartments integer,
  total_floors     integer,

  -- BuildingStage values from domain.ts:
  --   'act16' | 'act15' | 'act14' | 'building_started' | 'preparation' | 'planning'
  current_stage    text        NOT NULL
    CHECK (current_stage IN (
      'act16', 'act15', 'act14',
      'building_started', 'preparation', 'planning'
    )),

  completion_date  date,
  building_notes   text,

  -- Financials
  currency         text,
  price_sqm        numeric,
  price_date       date,

  -- Payment schedule — array of { percentage: number, trigger: string } objects
  payment_schedule jsonb,

  -- Notes
  notes            text,
  ai_summary       text
);

CREATE INDEX idx_projects_neighborhood_id ON projects (neighborhood_id);

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================
-- TABLE: units
--
-- Individual apartments, garages, parking spaces, or storage
-- units belonging to a project. All statuses are imported
-- (available + sold + booked) — sold/booked patterns reveal
-- which unit types, floors, and orientations buyers prefer.
-- ============================================================

CREATE TABLE units (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL    DEFAULT now(),
  updated_at       timestamptz NOT NULL    DEFAULT now(),

  -- Relationship
  project_id       uuid        NOT NULL
    REFERENCES projects (id) ON DELETE CASCADE,

  -- Identity
  -- UnitType values from domain.ts:
  --   'apartment' | 'studio' | 'garage' | 'parking' | 'storage'
  unit_type        text        NOT NULL
    CHECK (unit_type IN ('apartment', 'studio', 'garage', 'parking', 'storage')),

  apartment_number text,        -- e.g. "A12", "201"
  identifier       text,        -- developer-internal reference or notary code
  floor            integer,

  -- Areas (square metres)
  net_area         numeric,     -- private floor area, excluding common parts
  common_area      numeric,     -- this unit's share of shared areas
  total_area       numeric,     -- net_area + common_area; used for pricing

  -- Pricing (VAT inclusive, in parent project's currency)
  price_sqm_vat    numeric,     -- price per m² including VAT
  total_price_vat  numeric,     -- total_area × price_sqm_vat

  -- Characteristics
  -- UnitDirection values from domain.ts:
  --   'south' | 'north' | 'east' | 'west' |
  --   'south_east' | 'south_west' | 'north_east' | 'north_west'
  direction        text
    CHECK (direction IN (
      'south', 'north', 'east', 'west',
      'south_east', 'south_west', 'north_east', 'north_west'
    )),

  -- UnitStatus values from domain.ts: 'available' | 'booked' | 'sold'
  status           text        NOT NULL
    CHECK (status IN ('available', 'booked', 'sold')),

  -- Notes
  notes            text,
  ai_summary       text
);

CREATE INDEX idx_units_project_id ON units (project_id);
CREATE INDEX idx_units_status     ON units (status);

CREATE TRIGGER set_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY — Phase 2 preparation
--
-- Uncomment and adapt when auth is introduced in Phase 2.
-- The patterns below assume a single authenticated user per
-- Supabase project (personal dev tool, no multi-tenancy yet).
--
-- Step 1 — Enable RLS on each table:
--   ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE units         ENABLE ROW LEVEL SECURITY;
--
-- Step 2 — Grant full access to the authenticated role
-- (adjust when user-scoped isolation is needed):
--   CREATE POLICY "authenticated users can do everything"
--     ON neighborhoods FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
--   CREATE POLICY "authenticated users can do everything"
--     ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
--   CREATE POLICY "authenticated users can do everything"
--     ON units FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
-- Step 3 — If multi-user is added later, scope policies to
-- auth.uid() and add a user_id column to each table:
--   USING (user_id = auth.uid())
--   WITH CHECK (user_id = auth.uid())
-- ============================================================
