-- Phase F: Enable Row Level Security
-- Access model: any authenticated user can read/write all data.
-- This is a personal tool; per-user isolation can be added later if needed.

ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE units         ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated full access" ON neighborhoods
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON units
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access" ON search_feedback
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
