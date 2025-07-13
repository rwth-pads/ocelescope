import path from "path";
import fs from "fs";
import fse from "fs-extra";
import { Project, SyntaxKind } from "ts-morph";

const syncPublicFolder = async () => {
  // Resolve everything relative to this script's directory
  const ROOT = path.resolve(__dirname); // go up to project root
  const pluginsDir = path.join(ROOT, "../plugins");
  const publicPluginsFolder = path.join(ROOT, "../public/plugins");

  await fse.emptyDir(publicPluginsFolder);

  const pluginDirs = fs.readdirSync(pluginsDir);
  const project = new Project({
    tsConfigFilePath: path.join(ROOT, "../tsconfig.json"),
  });

  for (const dirName of pluginDirs) {
    const pluginPath = path.join(pluginsDir, dirName);
    const indexFile = path.join(pluginPath, "index.ts");
    if (!fs.existsSync(indexFile)) continue;

    // Load plugin source file via ts-morph
    const source = project.addSourceFileAtPath(indexFile);
    const defaultExportSymbol = source.getDefaultExportSymbol();
    const decl = defaultExportSymbol?.getDeclarations()[0];
    let pluginName = dirName; // fallback

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

    const destDir = path.join(publicPluginsFolder, pluginName);
    await fse.ensureDir(destDir);

    const coverFile = path.join(pluginPath, "cover.png");
    if (fs.existsSync(coverFile)) {
      await fse.copy(coverFile, path.join(destDir, "cover.png"));
      console.log(`✅ Copied cover.png for ${pluginName}`);
    }
  }

  console.log("🎉 Public plugin covers synced.");
};

syncPublicFolder().catch((err) => {
  console.error("❌ Failed to sync public plugin folders:", err);
});
