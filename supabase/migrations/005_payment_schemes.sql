-- ============================================================
-- PropIQ — Payment Schemes
-- Migration: 005_payment_schemes.sql
--
-- Replaces the unused `payment_schedule` jsonb column on `projects`
-- with a proper `project_payment_schemes` table that supports:
--   - One default scheme per project (extracted from AI on import)
--   - Multiple alternative schemes with flat €/m² price modifiers
--
-- Data migration: moves existing payment_schedule rows into the new
-- table before dropping the column.
-- ============================================================


-- ── Create project_payment_schemes table ────────────────────────────────────

CREATE TABLE project_payment_schemes (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  project_id         uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name               text        NOT NULL,
  -- Array of { percentage: number, trigger: string } objects — same shape as
  -- PaymentInstallment[] in domain.ts
  installments       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  is_default         boolean     NOT NULL DEFAULT false,
  -- Flat adjustment per m² in the project's currency.
  -- Always 0 for the default scheme.
  -- Positive = premium (low-down investor scheme), negative = discount (cash buyer).
  price_modifier_sqm numeric     NOT NULL DEFAULT 0,
  notes              text
);

-- Enforce exactly one default scheme per project at the DB level.
-- Partial index: only rows where is_default = true are indexed,
-- so the uniqueness constraint applies only to default rows.
CREATE UNIQUE INDEX one_default_per_project
  ON project_payment_schemes (project_id)
  WHERE is_default = true;

CREATE INDEX idx_payment_schemes_project_id
  ON project_payment_schemes (project_id);

CREATE TRIGGER set_payment_schemes_updated_at
  BEFORE UPDATE ON project_payment_schemes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE project_payment_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated full access" ON project_payment_schemes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── Data migration: existing payment_schedule → new table ──────────────────
--
-- For each project that has a non-null payment_schedule jsonb array,
-- derive a name by concatenating the percentages with dashes (e.g. "20-80"),
-- then insert a default scheme row.
--
-- For projects with null payment_schedule, insert a placeholder default row
-- (name = 'Default', installments = []). Users can edit these from the form.

INSERT INTO project_payment_schemes (project_id, name, installments, is_default, price_modifier_sqm)
SELECT
  id AS project_id,
  CASE
    WHEN payment_schedule IS NOT NULL AND jsonb_array_length(payment_schedule) > 0
      THEN (
        SELECT string_agg(elem->>'percentage', '-' ORDER BY ordinality)
        FROM jsonb_array_elements(payment_schedule) WITH ORDINALITY AS t(elem, ordinality)
      )
    ELSE 'Default'
  END AS name,
  COALESCE(payment_schedule, '[]'::jsonb) AS installments,
  true  AS is_default,
  0     AS price_modifier_sqm
FROM projects;


-- ── Drop the now-superseded column ───────────────────────────────────────────

ALTER TABLE projects DROP COLUMN payment_schedule;
