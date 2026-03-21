import { Command } from "commander";
import { runUpdate } from "./commands/update.js";
import { queryRoutes, queryRouteDetail, queryStops } from "./commands/query.js";

const program = new Command();

program
  .name("mty-transit")
  .description("CLI/SDK de rutas de transporte público del AMM")
  .version("0.1.0");

program
  .command("update")
  .description("Descarga y actualiza la base de datos local")
  .action(runUpdate);

program
  .command("routes")
  .description("Rutas entre dos puntos")
  .requiredOption("--alat <lat>", "Latitud origen", parseFloat)
  .requiredOption("--alng <lng>", "Longitud origen", parseFloat)
  .requiredOption("--blat <lat>", "Latitud destino", parseFloat)
  .requiredOption("--blng <lng>", "Longitud destino", parseFloat)
  .option("--format <format>", "table | json | geojson", "table")
  .action((opts) =>
    queryRoutes(opts.alat, opts.alng, opts.blat, opts.blng, opts.format),
  );

program
  .command("stops")
  .description("Paradas de las rutas entre dos puntos")
  .requiredOption("--alat <lat>", "Latitud origen", parseFloat)
  .requiredOption("--alng <lng>", "Longitud origen", parseFloat)
  .requiredOption("--blat <lat>", "Latitud destino", parseFloat)
  .requiredOption("--blng <lng>", "Longitud destino", parseFloat)
  .option("--format <format>", "table | json | geojson", "table")
  .action((opts) =>
    queryStops(opts.alat, opts.alng, opts.blat, opts.blng, opts.format),
  );

program
  .command("detail <id>")
  .description("Detalle completo de una ruta con paradas y recorrido")
  .option("--format <format>", "json | geojson", "json")
  .action((id, opts) => queryRouteDetail(id, opts.format));

program.parse();
