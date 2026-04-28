CREATE TABLE IF NOT EXISTS t_p72666246_children_progress_tr.progress (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{"dates":[],"children":[]}',
  checked JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO t_p72666246_children_progress_tr.progress (file_name, data, checked)
  SELECT '', '{"dates":[],"children":[]}'::jsonb, '[]'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM t_p72666246_children_progress_tr.progress);
