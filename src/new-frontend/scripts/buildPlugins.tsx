import { Plugin, PluginDefinition } from "@/plugins/types";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

async function main() {
  const pluginsDir = path.join(process.cwd(), "plugins");
  const outputFile = path.join(pluginsDir, "pluginIndex.json");

  const index: Plugin[] = [];

  const plugins = fs.readdirSync(pluginsDir);

  for (const plugin of plugins) {
    const pluginRoot = path.join(pluginsDir, plugin);
    const pluginIndexFile = path.join(pluginRoot, "index.ts");

    if (!fs.existsSync(pluginIndexFile)) continue;

    try {
      const fileURL = pathToFileURL(pluginIndexFile).href;
      const module = await import(fileURL);
      const pluginDef = module.default as PluginDefinition;

      if (!pluginDef.pluginName) {
        throw new Error("Missing pluginName in plugin definition");
      }

      index.push({
        name: plugin,
        label: pluginDef.pluginName,
        routes: pluginDef.routes,
      });
    } catch (err) {
      console.error(`❌ Error loading plugin: ${plugin}`, err);
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(index, null, 2));
  console.log(`✅ Plugin index written to ${outputFile}`);
}

main();
