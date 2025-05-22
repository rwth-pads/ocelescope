// scripts/generate-pluginMap.ts
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const generatePluginMap = async () => {
  const pluginsDir = path.join(process.cwd(), "plugins");
  const outputFile = path.join(pluginsDir, "pluginMap.ts");

  function toIdentifier(plugin: string, component: string): string {
    return `${plugin}_${component}`.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  const imports: string[] = [];
  const mapLines: string[] = [];
  const typeLines: string[] = [];

  imports.push("// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY\n");

  mapLines.push("export const pluginComponentMap = {");

  const pluginDirs = fs.readdirSync(pluginsDir);

  for (const plugin of pluginDirs) {
    const pluginPath = path.join(pluginsDir, plugin);
    const indexFile = path.join(pluginPath, "index.ts");
    const pagesDir = path.join(pluginPath, "pages");

    if (!fs.existsSync(indexFile) || !fs.existsSync(pagesDir)) continue;

    const indexUrl = pathToFileURL(indexFile).href;
    const pluginModule = await import(indexUrl);
    const pluginDef = pluginModule.default;

    if (!pluginDef?.pluginName) {
      console.warn(`⚠️ Skipping ${plugin} — missing pluginName`);
      continue;
    }

    const pluginLabel = pluginDef.pluginName;

    imports.push(`// Plugin: ${plugin}`);
    mapLines.push(`  "${plugin}": {`);
    mapLines.push(`    label: ${JSON.stringify(pluginLabel)},`);
    mapLines.push(`    routes: [`);

    const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".tsx"));

    for (const file of files) {
      const pagePath = path.join(pagesDir, file);
      const routeSlug = path.basename(file, ".tsx");
      const identifier = toIdentifier(plugin, routeSlug);
      const importPath = `@/plugins/${plugin}/pages/${routeSlug}`;

      imports.push(
        `import ${identifier}, { config as ${identifier}_config } from "${importPath}";`,
      );

      mapLines.push(`      {`);
      mapLines.push(`        name: ${identifier}_config.name,`);
      mapLines.push(`        path: "${routeSlug}",`);
      mapLines.push(`        component: ${identifier}`);
      mapLines.push(`      },`);
    }

    mapLines.push(`    ]`);
    mapLines.push(`  },`);
  }

  mapLines.push("} as const;");
  // Add types
  typeLines.push("");
  typeLines.push("export type PluginName = keyof typeof pluginComponentMap;");
  typeLines.push("export type ComponentPath<P extends PluginName> =");
  typeLines.push("  P extends PluginName ?");
  typeLines.push(
    "    typeof pluginComponentMap[P]['routes'][number]['path'] : never;",
  );
  typeLines.push("");
  typeLines.push("export function getPluginUrl<P extends PluginName>(");
  typeLines.push("  plugin: P,");
  typeLines.push("  path: ComponentPath<P>");
  typeLines.push("): string {");
  typeLines.push("  return `/plugin/${plugin}/${path}`;");
  typeLines.push("}");

  const fullOutput = [...imports, "", ...mapLines, "", ...typeLines, ""].join(
    "\n",
  );

  fs.writeFileSync(outputFile, fullOutput, "utf-8");
  console.log(`✅ pluginMap.ts generated at ${outputFile}`);
};

generatePluginMap();
