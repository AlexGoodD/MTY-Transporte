# MTY Transporte

SDK y CLI para consultar rutas de transporte público del Área Metropolitana
de Monterrey (AMM), Nuevo León, México.

Funciona **sin servidor** — los datos se guardan localmente y las consultas
son instantáneas.

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

Los datos se guardan en `./data/mty-transit.db` y se exportan
a `./data/mty-transit.json`.

---

## Uso del CLI

### Actualizar datos

```bash
mty-transit update
```

Se recomienda ejecutar una vez al mes — las rutas cambian poco.

---

### Buscar rutas entre dos puntos

```bash
mty-transit routes \
  --alat <latitud_origen> \
  --alng <longitud_origen> \
  --blat <latitud_destino> \
  --blng <longitud_destino>
```

**Ejemplo** — San Nicolás de los Garza → Centro Monterrey:

```bash
mty-transit routes \
  --alat 25.7481 --alng -100.2978 \
  --blat 25.6700 --blng -100.3350
```

**Opciones:**

| Opción     | Descripción                    | Default   |
| ---------- | ------------------------------ | --------- |
| `--alat`   | Latitud del origen             | requerido |
| `--alng`   | Longitud del origen            | requerido |
| `--blat`   | Latitud del destino            | requerido |
| `--blng`   | Longitud del destino           | requerido |
| `--format` | `table` \| `json` \| `geojson` | `table`   |

**Output JSON:**

```bash
mty-transit routes \
  --alat 25.7481 --alng -100.2978 \
  --blat 25.6700 --blng -100.3350 \
  --format json
```

**Output GeoJSON** (compatible con Mapbox, Leaflet, QGIS):

```bash
mty-transit routes \
  --alat 25.7481 --alng -100.2978 \
  --blat 25.6700 --blng -100.3350 \
  --format geojson > routes.geojson
```

---

### Ver detalle de una ruta

```bash
mty-transit detail <id>
```

**Ejemplo:**

```bash
mty-transit detail 9
```

| Opción     | Descripción         | Default |
| ---------- | ------------------- | ------- |
| `--format` | `json` \| `geojson` | `json`  |

**Recorrido y paradas en GeoJSON:**

```bash
mty-transit detail 9 --format geojson > route-101.geojson
```

---

## Uso como SDK

```typescript
import { getRoutesBetween, getRoutesById, reverseGeocode } from "mty-transit";

// Rutas entre dos puntos
const routes = await getRoutesBetween(25.7481, -100.2978, 25.67, -100.335);
console.log(routes);
// [{ id: '6', shortName: '1', longName: 'Sector 1 Central...', type: 'Bus' }, ...]

// Detalle completo con paradas y recorrido
const detail = await getRoutesById(["6", "9"]);
console.log(detail.trips.stops);
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
├── mty-transit.db      ← SQLite para queries del SDK
└── mty-transit.json    ← Export legible en JSON
```

### Estructura del JSON

```json
{
  "meta": {
    "generated_at": "2026-03-16T01:30:00.000Z",
    "total_routes": 111,
    "total_stops": 26,
    "sources": ["transit-data"]
  },
  "routes": [
    {
      "id": "9",
      "short_name": "101",
      "long_name": "Ébanos",
      "slug": "ruta-101-ebanos.3ya",
      "type": "Bus",
      "color": null,
      "encoded_line": "w`g|C|sbcR...",
      "source": "buzyt",
      "updated_at": "2026-03-16T01:30:00.000Z",
      "stops": [
        {
          "name": "Av. Constitución",
          "lat": 25.67,
          "lng": -100.33,
          "order_index": 0
        }
      ]
    }
  ]
}
```

---

## Visualizar en un mapa

El output `--format geojson` es compatible con cualquier herramienta:

### Mapbox GL JS

```javascript
map.addLayer({
  id: "routes",
  type: "line",
  source: { type: "geojson", routesGeoJSON },
  paint: { "line-color": "#e74c3c", "line-width": 3 },
});
```

### Leaflet

```javascript
L.geoJSON(routesGeoJSON).addTo(map);
```

### Online (sin código)

Arrastra el archivo `.geojson` a **[geojson.io](https://geojson.io)**.

---

## 🛠️ Desarrollo

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npx tsx src/cli.ts update
npx tsx src/cli.ts routes --alat 25.7481 --alng -100.2978 --blat 25.67 --blng -100.33

# Compilar
npm run build

# Probar build
node dist/cli.js update
```

### Estructura del proyecto

```
MTY-Transporte/
├── src/
│   ├── db/
│   │   ├── schema.ts       ← Tablas SQLite
│   │   ├── client.ts       ← Conexión a la DB
│   │   └── cache.ts        ← Caché de consultas
│   ├── scrapers/
│   │   └── buzyt.ts        ← Cliente de datos de transporte
│   ├── commands/
│   │   ├── update.ts       ← Comando update
│   │   └── query.ts        ← Comandos de consulta
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
se obtienen de fuentes públicas del AMM. No está afiliado con ninguna
entidad gubernamental ni empresa de transporte.

---

## Licencia

MIT — libre para uso personal y educativo.

```

```
