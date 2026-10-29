-- The Trust Trail is append-only. A correction is a new row, never an edit.
REVOKE UPDATE, DELETE ON trail_entries FROM PUBLIC;
CREATE RULE trail_no_update AS ON UPDATE TO trail_entries DO INSTEAD NOTHING;
CREATE RULE trail_no_delete AS ON DELETE TO trail_entries DO INSTEAD NOTHING;
