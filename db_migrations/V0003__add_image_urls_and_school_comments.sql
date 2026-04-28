ALTER TABLE t_p72666246_children_progress_tr.comments
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS child_id_nullable VARCHAR(64);

UPDATE t_p72666246_children_progress_tr.comments
  SET child_id_nullable = child_id
  WHERE child_id != '__school__';

ALTER TABLE t_p72666246_children_progress_tr.comments
  ALTER COLUMN child_id SET DEFAULT '__school__';
