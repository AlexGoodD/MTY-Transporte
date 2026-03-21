# MTY Transporte

SDK y CLI para consultar rutas de transporte público del Área Metropolitana
de Monterrey (AMM), Nuevo León, México.

Funciona **sin servidor** — los datos se guardan localmente en SQLite y las consultas
son instantáneas.

Combina dos fuentes de datos:

- **buz.yt** — rutas y paradas vía GraphQL (consultas A→B en tiempo real)
- **SETME** — catálogo oficial del gobierno de NL con rutas, modalidades y georeferencias en KMZ

---

## Instalación

### Como CLI global

```bash
npm install -g mty-transit
```

### Como dependencia en tu proyecto

```bash
npm install mty-transit
```

### Desarrollo local

```bash
git clone https://github.com/tuusuario/mty-transit
cd mty-transit
npm install
```

---

## Inicio rápido

Antes de usar el CLI por primera vez, descarga y construye la base de datos local:

```bash
mty-transit update
```

Descarga rutas de **buz.yt** y el catálogo **SETME** (~130 rutas con sus KMZ desde
Google My Maps). La primera ejecución tarda ~1-2 minutos. Los datos se guardan
en `./data/mty-transit.db` y se exportan a `./data/mty-transit.json`.

> Solo necesitas volver a correr `update` si quieres datos frescos. Las rutas cambian poco — una vez al mes es suficiente.

---

## Comandos disponibles

| Comando   | Qué hace                                              |
| --------- | ----------------------------------------------------- |
| `update`  | Descarga rutas y paradas y construye la DB local      |
| `routes`  | Lista rutas que van de un punto A a un punto B        |
| `stops`   | Lista las paradas de las rutas entre A y B            |
| `detail`  | Muestra el recorrido completo y paradas de una ruta   |

---

## Uso del CLI

### Actualizar datos

```bash
mty-transit update
```

Descarga y combina datos de buz.yt y del catálogo SETME (gobierno de NL).

---

### Buscar rutas entre dos puntos

Devuelve todas las rutas que conectan un origen con un destino.

```bash
mty-transit routes --alat <lat> --alng <lng> --blat <lat> --blng <lng>
```

**Ejemplo** — San Nicolás de los Garza → Centro Monterrey:

```bash
mty-transit routes --alat 25.7481 --alng -100.2978 --blat 25.6700 --blng -100.3350
```

**Opciones:**

| Opción     | Descripción                    | Default   |
| ---------- | ------------------------------ | --------- |
| `--alat`   | Latitud del origen             | requerido |
| `--alng`   | Longitud del origen            | requerido |
| `--blat`   | Latitud del destino            | requerido |
| `--blng`   | Longitud del destino           | requerido |
| `--format` | `table` \| `json` \| `geojson` | `table`   |

**Salida en tabla** (default):

```
┌──────┬─────────┬────────────────────────────────────┬──────┐
│  ID  │ Número  │ Nombre                             │ Tipo │
├──────┼─────────┼────────────────────────────────────┼──────┤
│  9   │ 101     │ Ébanos                             │ Bus  │
│  138 │ A202    │ Coyoacán - Santa Catarina          │ Bus  │
└──────┴─────────┴────────────────────────────────────┴──────┘
```

**Salida en GeoJSON** (compatible con Mapbox, Leaflet, QGIS, geojson.io):

```bash
mty-transit routes --alat 25.7481 --alng -100.2978 --blat 25.67 --blng -100.33 --format geojson > routes.geojson
```

---

### Ver paradas de las rutas entre dos puntos

Igual que `routes`, pero en lugar de listar rutas devuelve las **paradas** de cada ruta que conecta los dos puntos. Lee las paradas de la DB local; requiere haber corrido `update` previamente.

```bash
mty-transit stops --alat <lat> --alng <lng> --blat <lat> --blng <lng>
```

**Ejemplo:**

```bash
mty-transit stops --alat 25.7481 --alng -100.2978 --blat 25.6700 --blng -100.3350
```

**Opciones:**

| Opción     | Descripción                    | Default   |
| ---------- | ------------------------------ | --------- |
| `--alat`   | Latitud del origen             | requerido |
| `--alng`   | Longitud del origen            | requerido |
| `--blat`   | Latitud del destino            | requerido |
| `--blng`   | Longitud del destino           | requerido |
| `--format` | `table` \| `json` \| `geojson` | `table`   |

**Salida en GeoJSON** — cada parada como un `Point` con su ruta asociada:

```bash
mty-transit stops --alat 25.7481 --alng -100.2978 --blat 25.67 --blng -100.33 --format geojson > stops.geojson
```

Cada feature incluye: `routeId`, `shortName`, `routeName`, `name`, `order`.

**Salida en JSON** — agrupado por ruta:

```json
[
  {
    "route": { "id": "138", "shortName": "A202", "longName": "Coyoacán - Santa Catarina", ... },
    "stops": [
      { "name": "Av. Constitución", "lat": 25.67, "lng": -100.33, "order_index": 0 },
      { "name": "Clínica 6 IMSS", "lat": 25.671, "lng": -100.328, "order_index": 1 }
    ]
  }
]
```

---

### Ver detalle de una ruta

Muestra el recorrido completo (polyline) y todas las paradas de una ruta específica por su ID.

```bash
mty-transit detail <id>
```

**Ejemplo:**

```bash
mty-transit detail 138
```

**Opciones:**

| Opción     | Descripción         | Default |
| ---------- | ------------------- | ------- |
| `--format` | `json` \| `geojson` | `json`  |

**Recorrido y paradas en GeoJSON:**

```bash
mty-transit detail 138 --format geojson > ruta-a202.geojson
```

El GeoJSON incluye un `LineString` con el trayecto completo y un `Point` por cada parada.

---

## Uso como SDK

```typescript
import { getRoutesBetween, getRoutesById, reverseGeocode } from "mty-transit";

// Rutas entre dos puntos
const routes = await getRoutesBetween(25.7481, -100.2978, 25.67, -100.335);
console.log(routes);
// [{ id: '138', shortName: 'A202', longName: 'Coyoacán - Santa Catarina', type: 'Bus' }, ...]

// Detalle completo con paradas y recorrido
const detail = await getRoutesById(["138", "9"]);
console.log(detail[0].trips[0].stops);
// [{ name: 'Av. Constitución', lat: 25.67, lng: -100.33 }, ...]

// Geocodificación inversa (coordenadas → nombre de lugar)
const place = await reverseGeocode(25.7481, -100.2978);
console.log(place); // 'San Nicolás de los Garza'
```

---

## Estructura de datos

Después de `update`, encontrarás en `./data/`:

```
data/
├── mty-transit.db      ← SQLite para queries del SDK y el CLI
└── mty-transit.json    ← Export legible en JSON
```

### Estructura del JSON

Las rutas y paradas viven en arrays separados al nivel raíz. Para obtener las paradas de una ruta filtra por `route_id`; para buscar paradas cercanas a un punto filtra directamente sobre `stops` sin desanidar nada.

```json
{
  "meta": {
    "generated_at": "2026-03-16T01:30:00.000Z",
    "total_routes": 277,
    "total_stops": 23952,
    "sources": ["buzyt", "setme"]
  },
  "routes": [
    {
      "id": "9",
      "short_name": "101",
      "long_name": "Ébanos",
      "type": "Bus",
      "color": "#f14f00",
      "encoded_line": "w`g|C|sbcR...",
      "source": "buzyt"
    },
    {
      "id": "setme_ruta-101-ebanos",
      "short_name": "101",
      "long_name": "Ruta 101 Ebanos",
      "type": "Remanentes",
      "color": null,
      "encoded_line": "w`g|C|sbcR...",
      "source": "setme"
    }
  ],
  "stops": [
    {
      "route_id": "9",
      "name": "Av. Constitución",
      "lat": 25.67,
      "lng": -100.33,
      "order_index": 0,
      "source": "buzyt"
    },
    {
      "route_id": "setme_ruta-101-ebanos",
      "name": null,
      "lat": 25.669,
      "lng": -100.314,
      "order_index": 0,
      "source": "setme"
    }
  ]
}
```

`name: null` en paradas SETME indica una parada georreferenciada sin nombre en el KML original.

| `source` | Origen                    | `type` contiene                                              |
| -------- | ------------------------- | ------------------------------------------------------------ |
| `buzyt`  | API buz.yt                | Tipo de servicio (`Bus`, etc.)                               |
| `setme`  | Catálogo SETME / gobierno NL | Modalidad (`Directas`, `Remanentes`, `Alimentadoras`, `Troncales`, `IMA`) |

---

## Visualizar en un mapa

Todos los comandos con `--format geojson` son compatibles con cualquier herramienta de mapas.

**Online (sin código)** — arrastra el `.geojson` a [geojson.io](https://geojson.io).

**Mapbox GL JS:**

```javascript
map.addSource("stops", { type: "geojson", data: stopsGeoJSON });
map.addLayer({
  id: "stops",
  type: "circle",
  source: "stops",
  paint: { "circle-radius": 5, "circle-color": "#e74c3c" },
});
```

**Leaflet:**

```javascript
L.geoJSON(stopsGeoJSON, {
  pointToLayer: (feature, latlng) =>
    L.circleMarker(latlng, { radius: 5 }).bindPopup(feature.properties.name ?? "Parada"),
}).addTo(map);
```

---

## Desarrollo

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npx tsx src/cli.ts update
npx tsx src/cli.ts routes --alat 25.7481 --alng -100.2978 --blat 25.67 --blng -100.33
npx tsx src/cli.ts stops --alat 25.7481 --alng -100.2978 --blat 25.67 --blng -100.33
npx tsx src/cli.ts detail 138

# Compilar
npm run build

# Probar build
node dist/cli.js routes --alat 25.7481 --alng -100.2978 --blat 25.67 --blng -100.33
```

### Estructura del proyecto

```
MTY-Transporte/
├── src/
│   ├── db/
│   │   ├── schema.ts       ← Tablas SQLite
│   │   ├── client.ts       ← Conexión a la DB
│   │   └── cache.ts        ← Caché de consultas A→B (TTL 7 días)
│   ├── scrapers/
│   │   ├── buzyt.ts        ← Cliente GraphQL de buz.yt
│   │   └── setme.ts        ← Scraper catálogo SETME (CSV + KMZ)
│   ├── commands/
│   │   ├── update.ts       ← Comando update
│   │   └── query.ts        ← Comandos routes, stops y detail
│   ├── types.ts            ← Interfaces TypeScript
│   ├── cli.ts              ← Entry point CLI
│   └── index.ts            ← Exports del SDK
├── data/                   ← Generado por update (no incluir en git)
│   ├── mty-transit.db
│   └── mty-transit.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## Aviso

Este proyecto es de uso personal y educativo. Los datos de transporte
se obtienen de fuentes públicas: la API de buz.yt y el catálogo abierto
del gobierno de Nuevo León (SETME). No está afiliado con ninguna
entidad gubernamental ni empresa de transporte.

---

## Licencia

MIT — libre para uso personal y educativo.
