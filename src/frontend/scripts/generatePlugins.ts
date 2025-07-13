import fs from "fs";
import path from "path";
import { Project, SyntaxKind } from "ts-morph";

const PLUGIN_DIR = path.resolve(__dirname, "../plugins");
const OUT_FILE = path.resolve(__dirname, "../lib/plugins/plugin-map.ts");

const project = new Project({
  tsConfigFilePath: path.resolve(__dirname, "../tsconfig.json"),
});

const pluginFolders = fs
  .readdirSync(PLUGIN_DIR)
  .filter((name) => fs.statSync(path.join(PLUGIN_DIR, name)).isDirectory());

let imports: string[] = [];
let pluginEntries: string[] = [];

let importCounter = 0;

for (const folderName of pluginFolders) {
  const pluginPath = `@/plugins/${folderName}`;
  const pluginIndexPath = path.join(PLUGIN_DIR, folderName, "index.ts");
  const indexSource = project.addSourceFileAtPathIfExists(pluginIndexPath);

  const pluginVar = `${folderName}_plugin`;
  imports.push(`import ${pluginVar} from '${pluginPath}';`);

  let pluginName = folderName;

  if (indexSource) {
    const defaultExportSymbol = indexSource.getDefaultExportSymbol();
    const decl = defaultExportSymbol?.getDeclarations()[0];
    if (decl && decl.getKind() === SyntaxKind.VariableDeclaration) {
      const objectLiteral = decl.getFirstDescendantByKind(
        SyntaxKind.ObjectLiteralExpression,
      );
      const nameProp = objectLiteral?.getProperty("name");

      if (nameProp?.getKind() === SyntaxKind.PropertyAssignment) {
        const initializer = nameProp.getFirstDescendantByKind(
          SyntaxKind.StringLiteral,
        );
        if (initializer) {
          pluginName = initializer.getLiteralValue();
        }
      }
    }
  }

  // Collect route definitions from pages/
  const routeFolder = path.join(PLUGIN_DIR, folderName, "pages");
  const routeDefs: string[] = [];

  if (fs.existsSync(routeFolder)) {
    const files = fs
      .readdirSync(routeFolder)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

    for (const file of files) {
      const absFile = path.join(routeFolder, file);
      const routeSource = project.addSourceFileAtPath(absFile);
      const exportSymbol = routeSource.getDefaultExportSymbol();
      const decl = exportSymbol?.getDeclarations()?.[0];

      const objectLiteral = decl?.getFirstDescendantByKind(
        SyntaxKind.ObjectLiteralExpression,
      );
      const nameProp = objectLiteral?.getProperty("name");

      if (nameProp?.getKind() === SyntaxKind.PropertyAssignment) {
        const initializer = nameProp.getFirstDescendantByKind(
          SyntaxKind.StringLiteral,
        );
        const routeName = initializer?.getLiteralValue();

        if (routeName) {
          const importVar = `R${importCounter++}`;
          const importPath = `${pluginPath}/pages/${file.replace(/\.(ts|tsx)$/, "")}`;
          imports.push(`import ${importVar} from '${importPath}';`);
          routeDefs.push(`    "${routeName}": ${importVar}`);
        }
      }
    }
  }

  pluginEntries.push(`  "${pluginName}": {
    ...${pluginVar},
    routes: {
${routeDefs.join(",\n")}
    }
  }`);
}

const output = `// 🚨 AUTO-GENERATED FILE — DO NOT EDIT
${imports.join("\n")}

const pluginMap= {
${pluginEntries.join(",\n")}
} as const;

export default pluginMap;
`;

fs.writeFileSync(OUT_FILE, output);
console.log("✅ plugin-map.ts generated!");
