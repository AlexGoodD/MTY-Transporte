# 🚌 MTY Transit

SDK y CLI para consultar rutas de transporte público del Área Metropolitana de Monterrey (AMM), Nuevo León, México.

Funciona **sin servidor** — los datos se guardan localmente y las consultas son instantáneas.

---

## 📦 Instalación

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

## ⚡ Inicio rápido

Antes de usar el CLI por primera vez, descarga y construye la base de datos local:

```bash
mty-transit update
```

Esto descarga datos desde:

- `api.buz.yt` — rutas, paradas y recorridos del AMM
- `catalogodatos.nl.gob.mx` — datasets oficiales del Gobierno de NL

Los datos se guardan en `./data/mty-transit.db` y se exportan a `./data/mty-transit.json`.

---

## 🖥️ Uso del CLI

### Actualizar datos

```bash
mty-transit update
```

Se recomienda ejecutar una vez al mes ya que las rutas cambian poco.

---

### Buscar rutas entre dos puntos

```bash
mty-transit rutas \
  --alat <latitud_origen> \
  --alng <longitud_origen> \
  --blat <latitud_destino> \
  --blng <longitud_destino>
```

**Ejemplo** — San Nicolás de los Garza → Centro Monterrey:

```bash
mty-transit rutas \
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

**Ejemplo con output JSON:**

```bash
mty-transit rutas \
  --alat 25.7481 --alng -100.2978 \
  --blat 25.6700 --blng -100.3350 \
  --format json
```

**Ejemplo exportando GeoJSON** (compatible con Mapbox, Leaflet, QGIS):

```bash
mty-transit rutas \
  --alat 25.7481 --alng -100.2978 \
  --blat 25.6700 --blng -100.3350 \
  --format geojson > rutas.geojson
```

---

### Ver detalle de una ruta

```bash
mty-transit detalle <id>
```

**Ejemplo:**

```bash
mty-transit detalle 9
```

**Opciones:**

| Opción     | Descripción         | Default |
| ---------- | ------------------- | ------- |
| `--format` | `json` \| `geojson` | `json`  |

**Ejemplo con recorrido y paradas en GeoJSON:**

```bash
mty-transit detalle 9 --format geojson > ruta-101.geojson
```

---

## 📦 Uso como SDK

Importa las funciones directamente en tu proyecto TypeScript o JavaScript:

```typescript
import { getRutasAtoB, getDetalleRutas, reverseGeocode } from "mty-transit";

// Rutas entre dos puntos
const rutas = await getRutasAtoB(25.7481, -100.2978, 25.67, -100.335);
console.log(rutas);
// [{ id: '6', shortName: '1', longName: 'Sector 1 Central...', type: 'Bus' }, ...]

// Detalle completo con paradas
const detalle = await getDetalleRutas(["6", "9"]);
console.log(detalle.trips.stops);
// [{ name: 'Av. Constitución', lat: 25.67, lng: -100.33 }, ...]

// Geocodificación inversa
const lugar = await reverseGeocode(25.7481, -100.2978);
console.log(lugar); // 'San Nicolás de los Garza'
```

---

## 📁 Estructura de datos

Después de ejecutar `update`, encontrarás en `./data/`:

```
data/
├── mty-transit.db      ← Base de datos SQLite (para queries del SDK)
└── mty-transit.json    ← Export completo legible en JSON
```

### Estructura del JSON exportado

```json
{
  "metadata": {
    "generado": "2026-03-16T01:30:00.000Z",
    "totalRutas": 111,
    "totalParadas": 26,
    "fuentes": ["api.buz.yt", "catalogodatos.nl.gob.mx"]
  },
  "rutas": [
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
      "paradas": [
        {
          "nombre": "Av. Constitución",
          "lat": 25.67,
          "lng": -100.33,
          "orden": 0
        }
      ]
    }
  ]
}
```

---

## 🗺️ Visualizar rutas en un mapa

El output `--format geojson` es compatible con cualquier herramienta de mapas:

### Mapbox GL JS

```javascript
map.addLayer({
  id: "rutas",
  type: "line",
  source: { type: "geojson", rutasGeoJSON },
  paint: { "line-color": "#e74c3c", "line-width": 3 },
});
```

### Leaflet

```javascript
L.geoJSON(rutasGeoJSON).addTo(map);
```

### QGIS / Google Earth

Arrastra el archivo `.geojson` directamente.

---

## 🔌 Fuentes de datos

| Fuente                    | Tipo    | Descripción                           |
| ------------------------- | ------- | ------------------------------------- |
| `api.buz.yt`              | GraphQL | Rutas, paradas y recorridos del AMM   |
| `catalogodatos.nl.gob.mx` | CSV     | Datasets oficiales del Gobierno de NL |

> **Nota:** Este proyecto no está afiliado con RutaDirecta, buz.yt ni el Gobierno de Nuevo León. Los datos son públicos y se consumen respetando las fuentes originales.

---

## 🛠️ Desarrollo

```bash
# Instalar dependencias
npm install

# Correr en modo desarrollo (sin compilar)
npx tsx src/cli.ts update
npx tsx src/cli.ts rutas --alat 25.7481 --alng -100.2978 --blat 25.67 --blng -100.33

# Compilar para producción
npm run build

# Probar el build
node dist/cli.js update
```

### Estructura del proyecto

```
mty-transit/
├── src/
│   ├── db/
│   │   ├── schema.ts       ← Definición de tablas SQLite
│   │   ├── client.ts       ← Conexión a la DB
│   │   └── cache.ts        ← Caché de queries AtoB
│   ├── scrapers/
│   │   ├── buzyt.ts        ← Cliente GraphQL de api.buz.yt
│   │   └── gobierno-nl.ts  ← Parser de CSVs del Gobierno NL
│   ├── commands/
│   │   ├── update.ts       ← Lógica del comando update
│   │   └── query.ts        ← Lógica de consultas y export
│   ├── types.ts            ← Interfaces TypeScript
│   ├── cli.ts              ← Entry point del CLI
│   └── index.ts            ← Exports del SDK
├── data/                   ← Generado por update (no se sube a git)
│   ├── mty-transit.db
│   └── mty-transit.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📋 Roadmap

- [ ] Soporte para más municipios del AMM (Apodaca, Escobedo, García)
- [ ] Comando `mty-transit paradas --ruta <id>` para listar paradas de una ruta
- [ ] Integración con Metrorrey (Línea 1, 2 y 3)
- [ ] Estimación de tiempo de viaje entre dos puntos
- [ ] Export en formato GTFS estándar

---

## 📄 Licencia

MIT — libre para uso personal y comercial.

```

Fuentes
```
