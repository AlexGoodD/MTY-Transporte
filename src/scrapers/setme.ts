import AdmZip from "adm-zip";
import Papa from "papaparse";
import { load } from "cheerio";
import polyline from "@mapbox/polyline";

const CSV_URL =
  "https://catalogodatos.nl.gob.mx/dataset/8e733b18-0a06-4188-9041-9b6422b156b2/resource/96a453fd-95ee-4ee2-9529-15824922a1c7/download/2024_2025_paradas_tp.csv";

export interface SetmeStop {
  name: string;
  lat: number;
  lng: number;
  order_index: number;
}

export interface SetmeRoute {
  id: string;
  short_name: string;
  long_name: string;
  modalidad: string;
  encoded_line: string | null;
  stops: SetmeStop[];
}

export function slugifySetme(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractMid(url: string): string | null {
  try {
    return new URL(url).searchParams.get("mid");
  } catch {
    return null;
  }
}

function extractShortName(routeName: string): string {
  const match = routeName.match(/(?:Ruta\s+)?([A-Za-z]?\d+[A-Za-z]?)/);
  return match ? match[1] : routeName.split(" ")[0];
}

async function downloadKML(mid: string): Promise<string> {
  const url = `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; mty-transit/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());

  // ZIP magic bytes: 50 4B 03 04
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    const zip = new AdmZip(buffer);
    const entry = zip.getEntry("doc.kml");
    if (!entry) throw new Error("No doc.kml en el KMZ");
    return entry.getData().toString("utf8");
  }

  return buffer.toString("utf8");
}

function parseKML(kml: string): {
  stops: SetmeStop[];
  encodedLine: string | null;
} {
  const $ = load(kml, { xmlMode: true });
  const stops: SetmeStop[] = [];
  let encodedLine: string | null = null;

  $("Placemark").each((_, el) => {
    // Paradas (Point)
    const pointText = $(el).find("Point coordinates").first().text().trim();
    if (pointText) {
      const parts = pointText.split(",");
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        const name = $(el).find("name").first().text().trim();
        stops.push({ name, lat, lng, order_index: stops.length });
      }
    }

    // Trayecto (LineString) — tomar el primero disponible
    if (!encodedLine) {
      const lineText = $(el)
        .find("LineString coordinates")
        .first()
        .text()
        .trim();
      if (lineText) {
        const pairs = lineText
          .split(/\s+/)
          .map((pt) => {
            const [lngS, latS] = pt.split(",");
            return [parseFloat(latS), parseFloat(lngS)] as [number, number];
          })
          .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
        if (pairs.length > 1) encodedLine = polyline.encode(pairs);
      }
    }
  });

  return { stops, encodedLine };
}

export async function fetchSetmeRoutes(): Promise<SetmeRoute[]> {
  console.log("\nDescargando catálogo SETME...");
  const csvRes = await fetch(CSV_URL);
  if (!csvRes.ok) throw new Error(`Error descargando CSV: ${csvRes.status}`);
  const csvText = await csvRes.text();

  const { data } = Papa.parse<{
    periodo: string;
    mes_publicacion: string;
    modalidad_SETME: string;
    nombre_ruta: string;
    georeferencia: string;
  }>(csvText, { header: true, skipEmptyLines: true });

  console.log(`  ${data.length} rutas en el catálogo\n`);

  const seenIds = new Set<string>();
  const routes: SetmeRoute[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const mid = extractMid(row.georeferencia);
    if (!mid) continue;

    const baseId = `setme_${slugifySetme(row.nombre_ruta)}`;
    const id = seenIds.has(baseId) ? `${baseId}_${i}` : baseId;
    seenIds.add(id);

    process.stdout.write(
      `  → [${i + 1}/${data.length}] ${row.nombre_ruta.trim()}\r`,
    );

    try {
      const kml = await downloadKML(mid);
      const { stops, encodedLine } = parseKML(kml);
      routes.push({
        id,
        short_name: extractShortName(row.nombre_ruta),
        long_name: row.nombre_ruta.trim(),
        modalidad: row.modalidad_SETME,
        encoded_line: encodedLine,
        stops,
      });
    } catch (e) {
      process.stdout.write("\n");
      console.warn(
        `  ⚠  "${row.nombre_ruta.trim()}": ${(e as Error).message}`,
      );
    }

    // Pausa para no saturar Google Maps
    if (i < data.length - 1) await new Promise((r) => setTimeout(r, 250));
  }

  process.stdout.write("\n");
  return routes;
}
