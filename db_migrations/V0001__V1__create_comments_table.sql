CREATE TABLE t_p72666246_children_progress_tr.comments (
  id SERIAL PRIMARY KEY,
  child_id VARCHAR(64) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);