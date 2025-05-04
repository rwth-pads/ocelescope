// scripts/buildPluginIndex.ts
import { Plugin, PluginDefinition, PluginRoute } from "@/plugins/types";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

async function main() {
  const pluginsDir = path.join(process.cwd(), "plugins");
  const outputFile = path.join(pluginsDir, "pluginIndex.json");

  const index: Plugin[] = [];

  const categories = fs.readdirSync(pluginsDir);

  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);
    if (!fs.lstatSync(categoryPath).isDirectory()) continue;

    const plugins = fs.readdirSync(categoryPath);

    for (const plugin of plugins) {
      const pluginRoot = path.join(categoryPath, plugin);
      const pluginPages = path.join(pluginRoot, "pages");
      const pluginIndexFile = path.join(pluginRoot, "index.ts");

      if (!fs.existsSync(pluginIndexFile)) continue;

      try {
        const fileURL = pathToFileURL(pluginIndexFile).href;
        const module = await import(fileURL);
        const pluginDef = module.default as PluginDefinition;

        if (!pluginDef.pluginName) {
          throw new Error("Missing pluginName in plugin definition");
        }

        const pages = await Promise.all(
          fs.readdirSync(pluginPages).map(async (page) => {
            const pageUrl = pathToFileURL(path.join(pluginPages, page)).href;
            const pageModule = await import(pageUrl);

            if (typeof pageModule.config.label === "string") {
              return undefined;
            }
            return {
              component: path.parse(page).name,
              label: pageModule.config.name as string,
            } satisfies PluginRoute;
          }),
        );

        index.push({
          name: plugin,
          label: pluginDef.pluginName,
          category,
          routes: pages.filter((page) => page !== undefined) as PluginRoute[],
        });
      } catch (err) {
        console.error(`❌ Error loading plugin: ${plugin}`, err);
      }
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(index, null, 2));
  console.log(`✅ Plugin index written to ${outputFile}`);
}

main(); // 👈 invoke the async wrapper
