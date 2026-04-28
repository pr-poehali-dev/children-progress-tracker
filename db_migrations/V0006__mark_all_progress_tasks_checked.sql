
UPDATE t_p72666246_children_progress_tr.progress
SET checked = (
  SELECT jsonb_agg(key)
  FROM (
    SELECT (ci-1)::text || '_' || (ri-1)::text || '_' || (ti-1)::text as key
    FROM t_p72666246_children_progress_tr.progress,
    jsonb_array_elements(data->'children') WITH ORDINALITY AS c(child, ci),
    jsonb_array_elements(child->'rows') WITH ORDINALITY AS r(row, ri),
    jsonb_array_elements(row->'tasks') WITH ORDINALITY AS t(task, ti)
    WHERE task::text != 'null'
  ) keys
),
updated_at = now()
WHERE id = 1;
