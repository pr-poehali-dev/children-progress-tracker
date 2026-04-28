ALTER TABLE t_p72666246_children_progress_tr.comments
  ADD COLUMN IF NOT EXISTS author VARCHAR(16) NOT NULL DEFAULT 'admin';
