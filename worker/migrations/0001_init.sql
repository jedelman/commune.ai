-- Append-only governance/event ledger: "those ratios get logged."
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  world_id   TEXT NOT NULL,
  player_id  TEXT,
  kind       TEXT NOT NULL,         -- governance | claim_role | release_role | join | add_node
  payload    TEXT NOT NULL,         -- JSON detail (which dial, old → new, etc.)
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS events_world_ts ON events (world_id, created_at);
