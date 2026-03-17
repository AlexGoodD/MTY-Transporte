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
