export const schema = `
  CREATE TABLE IF NOT EXISTS routes (
    id           TEXT PRIMARY KEY,
    short_name   TEXT NOT NULL,
    long_name    TEXT NOT NULL,
    slug         TEXT,
    type         TEXT,
    color        TEXT,
    encoded_line TEXT,
    entity_id    TEXT,
    source       TEXT,
    updated_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS stops (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id      TEXT NOT NULL,
    trip_headsign TEXT,
    name          TEXT,
    lat           REAL NOT NULL,
    lng           REAL NOT NULL,
    order_index   INTEGER,
    source        TEXT,
    FOREIGN KEY (route_id) REFERENCES routes(id)
  );

  CREATE TABLE IF NOT EXISTS cache_atob (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    a_lat     REAL NOT NULL,
    a_lng     REAL NOT NULL,
    b_lat     REAL NOT NULL,
    b_lng     REAL NOT NULL,
    result    TEXT NOT NULL,
    cached_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_stops_route  ON stops(route_id);
  CREATE INDEX IF NOT EXISTS idx_stops_coords ON stops(lat, lng);
  CREATE INDEX IF NOT EXISTS idx_cache_coords ON cache_atob(a_lat, a_lng, b_lat, b_lng);
`;
