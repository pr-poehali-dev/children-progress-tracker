CREATE TABLE IF NOT EXISTS t_p72666246_children_progress_tr.children (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_login VARCHAR(128) NOT NULL,
  system SMALLINT NOT NULL DEFAULT 1,
  entries JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p72666246_children_progress_tr.attendance (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO t_p72666246_children_progress_tr.attendance (data)
  SELECT '[]'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM t_p72666246_children_progress_tr.attendance);
