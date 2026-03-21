import polyline from "@mapbox/polyline";
import { getRoutesBetween, getRoutesById } from "../scrapers/buzyt.js";
import { getCachedAtob, setCachedAtob } from "../db/cache.js";
import { db } from "../db/client.js";
import type { GeoJSONCollection } from "../types.js";

function buildGeoJSON(routes: any[]): GeoJSONCollection {
  const features: any[] = [];

  for (const route of routes) {
    if (route.encodedLine) {
      const coords = polyline.decode(route.encodedLine);
      features.push({
        type: "Feature",
        properties: {
          id: route.id,
          name: route.longName,
          shortName: route.shortName,
          slug: route.slug,
        },
        geometry: {
          type: "LineString",
          coordinates: coords.map(([lat, lng]: [number, number]) => [lng, lat]),
        },
      });
    }

    for (const trip of route.trips ?? []) {
      for (const [index, stop] of (trip.stops ?? []).entries()) {
        features.push({
          type: "Feature",
          properties: {
            name: stop.name,
            headsign: trip.headsign,
            order: index,
            routeId: route.id,
          },
          geometry: { type: "Point", coordinates: [stop.lng, stop.lat] },
        });
      }
    }
  }

  return { type: "FeatureCollection", features };
}

export async function queryRoutes(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  format: "table" | "json" | "geojson" = "table",
): Promise<void> {
  const cached = getCachedAtob(aLat, aLng, bLat, bLng);
  let routes;

  if (cached) {
    console.error("📦 Desde caché local\n");
    routes = JSON.parse(cached.result);
  } else {
    console.error("🌐 Consultando api.buz.yt...\n");
    routes = await getRoutesBetween(aLat, aLng, bLat, bLng);
    setCachedAtob(aLat, aLng, bLat, bLng, routes);
  }

  if (format === "json") {
    console.log(JSON.stringify(routes, null, 2));
  } else if (format === "geojson") {
    const detail = await getRoutesById(routes.map((r: any) => r.id));
    console.log(JSON.stringify(buildGeoJSON(detail), null, 2));
  } else {
    console.table(
      routes.map((r: any) => ({
        ID: r.id,
        Número: r.shortName,
        Nombre: r.longName,
        Tipo: r.type,
      })),
    );
  }
}

export async function queryStops(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  format: "table" | "json" | "geojson" = "table",
): Promise<void> {
  const cached = getCachedAtob(aLat, aLng, bLat, bLng);
  let rawRoutes;

  if (cached) {
    console.error("📦 Desde caché local\n");
    rawRoutes = JSON.parse(cached.result);
  } else {
    console.error("🌐 Consultando api.buz.yt...\n");
    rawRoutes = await getRoutesBetween(aLat, aLng, bLat, bLng);
    setCachedAtob(aLat, aLng, bLat, bLng, rawRoutes);
  }

  // La API puede devolver duplicados; quedarse con la primera aparición por ID
  const seen = new Set<string>();
  const routes = rawRoutes.filter((r: any) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  const routesWithStops: { route: any; stops: any[] }[] = [];
  const missingIds: string[] = [];

  for (const route of routes) {
    const stops = db
      .prepare(
        `SELECT name, lat, lng, order_index, trip_headsign
         FROM stops WHERE route_id = ? ORDER BY order_index`,
      )
      .all(route.id) as any[];

    if (stops.length > 0) {
      routesWithStops.push({ route, stops });
    } else {
      missingIds.push(route.id);
    }
  }

  // Batch único a la API para las rutas sin paradas locales
  if (missingIds.length > 0) {
    console.error(
      `🌐 Sin paradas locales para ${missingIds.length} rutas, consultando API...`,
    );
    const detail = await getRoutesById(missingIds);
    for (const r of detail) {
      const stops = (r.trips ?? []).flatMap((t: any) =>
        (t.stops ?? []).map((s: any, i: number) => ({
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          order_index: i,
          trip_headsign: t.headsign,
        })),
      );
      const route = routes.find((x: any) => x.id === r.id);
      if (route) routesWithStops.push({ route, stops });
    }
  }

  if (format === "json") {
    console.log(JSON.stringify(routesWithStops, null, 2));
  } else if (format === "geojson") {
    const features: any[] = [];
    for (const { route, stops } of routesWithStops) {
      for (const stop of stops) {
        features.push({
          type: "Feature",
          properties: {
            routeId: route.id,
            shortName: route.shortName,
            routeName: route.longName,
            name: stop.name ?? null,
            order: stop.order_index,
          },
          geometry: { type: "Point", coordinates: [stop.lng, stop.lat] },
        });
      }
    }
    console.log(JSON.stringify({ type: "FeatureCollection", features }, null, 2));
  } else {
    const rows: any[] = [];
    for (const { route, stops } of routesWithStops) {
      for (const stop of stops) {
        rows.push({
          Ruta: `${route.shortName} — ${route.longName}`,
          Parada: stop.name ?? "(sin nombre)",
          Lat: stop.lat,
          Lng: stop.lng,
        });
      }
    }
    console.table(rows);
  }
}

export async function queryRouteDetail(
  id: string,
  format: "json" | "geojson" = "json",
): Promise<void> {
  const local = db.prepare(`SELECT * FROM routes WHERE id = ?`).get(id) as any;

  if (local) {
    const stops = db
      .prepare(
        `
      SELECT name, lat, lng, order_index FROM stops
      WHERE route_id = ? ORDER BY order_index
    `,
      )
      .all(id);

    if (format === "geojson" && local.encoded_line) {
      const coords = polyline.decode(local.encoded_line);
      const geojson: GeoJSONCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              id: local.id,
              name: local.long_name,
              shortName: local.short_name,
            },
            geometry: {
              type: "LineString",
              coordinates: coords.map(([lat, lng]) => [lng, lat]),
            },
          },
          ...stops.map((s: any, i: number) => ({
            type: "Feature" as const,
            properties: { name: s.name, order: i },
            geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
          })),
        ],
      };
      console.log(JSON.stringify(geojson, null, 2));
    } else {
      console.log(JSON.stringify({ ...local, stops }, null, 2));
    }
    return;
  }

  // Si no está en la DB local, consultar la API directamente
  console.error("🌐 No encontrado localmente, consultando API...");
  const routes = await getRoutesById([id]);
  console.log(
    JSON.stringify(
      format === "geojson" ? buildGeoJSON(routes) : routes,
      null,
      2,
    ),
  );
}
