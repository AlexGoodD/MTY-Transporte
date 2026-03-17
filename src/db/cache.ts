import { db } from "./client.js";
import type { CachedResult } from "../types.js";

// Redondea a 4 decimales para aumentar hits de caché (~11m de precisión)
const round = (n: number) => Math.round(n * 10000) / 10000;

export function getCachedAtob(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  maxAgeDays = 7,
): CachedResult | null {
  return db
    .prepare(
      `
    SELECT result, cached_at FROM cache_atob
    WHERE a_lat = ? AND a_lng = ? AND b_lat = ? AND b_lng = ?
    AND cached_at > datetime('now', '-' || ? || ' days')
    ORDER BY cached_at DESC LIMIT 1
  `,
    )
    .get(
      round(aLat),
      round(aLng),
      round(bLat),
      round(bLng),
      maxAgeDays,
    ) as CachedResult | null;
}

export function setCachedAtob(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  result: unknown,
): void {
  db.prepare(
    `
    INSERT INTO cache_atob (a_lat, a_lng, b_lat, b_lng, result, cached_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `,
  ).run(
    round(aLat),
    round(aLng),
    round(bLat),
    round(bLng),
    JSON.stringify(result),
  );
}
