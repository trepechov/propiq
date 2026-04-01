CREATE TABLE user_criteria (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  key        text        NOT NULL,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_criteria_key_check
    CHECK (key IN ('evaluation_criteria', 'query_context', 'extraction_rules', 'neighborhood_research')),
  CONSTRAINT user_criteria_user_key_unique
    UNIQUE (user_id, key)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_criteria
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();  -- function exists from 001_schema.sql

ALTER TABLE user_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own criteria" ON user_criteria
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
