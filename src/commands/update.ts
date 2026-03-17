import { writeFileSync } from "fs";
import { join } from "path";
import { getRoutesBetween, getRoutesById } from "../scrapers/buzyt.js";
import { db, DATA_DIR } from "../db/client.js";

const AMM_COORD_PAIRS = [
  { aLat: 25.65, aLng: -100.289, bLat: 25.78, bLng: -100.31 }, // Sur → Norte
  { aLat: 25.72, aLng: -100.19, bLat: 25.67, bLng: -100.34 }, // Oriente → Centro
  { aLat: 25.7481, aLng: -100.2978, bLat: 25.67, bLng: -100.335 }, // San Nicolás → Centro
  { aLat: 25.678, aLng: -100.225, bLat: 25.652, bLng: -100.402 }, // Guadalupe → San Pedro
  { aLat: 25.673, aLng: -100.46, bLat: 25.67, bLng: -100.335 }, // Santa Catarina → Centro
  { aLat: 25.796, aLng: -100.324, bLat: 25.67, bLng: -100.335 }, // Escobedo → Centro
  { aLat: 25.781, aLng: -100.188, bLat: 25.67, bLng: -100.335 }, // Apodaca → Centro
];

const BATCH_SIZE = 10;

const insertRoute = db.prepare(`
  INSERT OR REPLACE INTO routes
  (id, short_name, long_name, slug, type, color, encoded_line, entity_id, source, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'buzyt', datetime('now'))
`);

const insertStop = db.prepare(`
  INSERT INTO stops (route_id, trip_headsign, name, lat, lng, order_index, source)
  VALUES (?, ?, ?, ?, ?, ?, 'buzyt')
`);

async function discoverRouteIds(): Promise<string[]> {
  console.log("\nObteniendo rutas...");
  const routeIds = new Set<string>();

  for (const pair of AMM_COORD_PAIRS) {
    const routes = await getRoutesBetween(
      pair.aLat,
      pair.aLng,
      pair.bLat,
      pair.bLng,
    );
    routes.forEach((r) => routeIds.add(r.id));
    process.stdout.write(`  → ${routeIds.size} rutas únicas descubiertas\r`);
  }

  console.log(`\n  Total: ${routeIds.size} rutas`);
  return Array.from(routeIds);
}

async function fetchAndStoreRoutes(ids: string[]): Promise<void> {
  console.log("\nDescargando detalle y paradas de cada ruta...");

  // Limpiar paradas previas de buz.yt para re-insertarlas frescas
  db.prepare(`DELETE FROM stops WHERE source = 'buzyt'`).run();

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const routes = await getRoutesById(batch);

    db.transaction(() => {
      for (const route of routes) {
        insertRoute.run(
          route.id,
          route.shortName,
          route.longName,
          route.slug,
          route.type,
          route.color,
          route.encodedLine,
          route.entity?.id ?? null,
        );

        for (const trip of route.trips ?? []) {
          trip.stops?.forEach((stop, index) => {
            insertStop.run(
              route.id,
              trip.headsign,
              stop.name,
              stop.lat,
              stop.lng,
              index,
            );
          });
        }
      }
    })();

    process.stdout.write(
      `  → ${Math.min(i + BATCH_SIZE, ids.length)}/${ids.length} rutas procesadas\r`,
    );
  }
}

function exportJSON(): void {
  const routes = db.prepare(`SELECT * FROM routes`).all();
  const stops = db.prepare(`SELECT * FROM stops`).all();

  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      total_routes: routes.length,
      total_stops: stops.length,
      sources: ["api.buz.yt", "catalogodatos.nl.gob.mx"],
    },
    routes: routes.map((r: any) => ({
      ...r,
      stops: stops.filter((s: any) => s.route_id === r.id),
    })),
  };

  const outputPath = join(DATA_DIR, "mty-transit.json");
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`JSON exportado en ./data/mty-transit.json`);
}

export async function runUpdate(): Promise<void> {
  console.log("Actualizando MTY Transit...\n");

  const ids = await discoverRouteIds();
  await fetchAndStoreRoutes(ids);

  const totalRoutes = (
    db.prepare(`SELECT COUNT(*) as c FROM routes`).get() as any
  ).c;
  const totalStops = (
    db.prepare(`SELECT COUNT(*) as c FROM stops`).get() as any
  ).c;

  console.log(`\n\n🎉 Base de datos actualizada en ./data/mty-transit.db`);
  console.log(`   Rutas:   ${totalRoutes}`);
  console.log(`   Paradas: ${totalStops}`);

  exportJSON();
}
