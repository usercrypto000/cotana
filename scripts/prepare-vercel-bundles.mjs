import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(repoRoot, ".vercel-bundles");

const targets = [
  {
    name: "store",
    appDir: path.join(repoRoot, "apps", "store")
  },
  {
    name: "admin",
    appDir: path.join(repoRoot, "apps", "admin")
  }
];

const workspacePackages = [
  "analytics",
  "auth",
  "config",
  "db",
  "search",
  "types",
  "ui"
];

const copyFilter = (source) => {
  const basename = path.basename(source);

  if (basename === "node_modules" || basename === ".next" || basename === ".turbo") {
    return false;
  }

  if (basename.endsWith(".tsbuildinfo")) {
    return false;
  }

  return true;
};

function replaceWorkspaceReferences(manifest, relativeResolver) {
  const nextManifest = structuredClone(manifest);

  for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const entries = nextManifest[field];

    if (!entries || typeof entries !== "object") {
      continue;
    }

    for (const [dependencyName, version] of Object.entries(entries)) {
      if (typeof version === "string" && version.startsWith("workspace:")) {
        const packageName = dependencyName.replace("@cotana/", "");
        entries[dependencyName] = relativeResolver(packageName);
      }
    }
  }

  return nextManifest;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function prepareTarget(target) {
  const destinationRoot = path.join(outputRoot, target.name);
  await rm(destinationRoot, {
    recursive: true,
    force: true
  });
  await mkdir(destinationRoot, {
    recursive: true
  });

  await cp(target.appDir, destinationRoot, {
    recursive: true,
    filter: copyFilter
  });
  await cp(path.join(repoRoot, "tsconfig.base.json"), path.join(destinationRoot, "tsconfig.base.json"));

  const rootManifest = await readJson(path.join(target.appDir, "package.json"));
  const rewrittenRootManifest = replaceWorkspaceReferences(rootManifest, (packageName) => `file:./packages/${packageName}`);

  delete rewrittenRootManifest.packageManager;
  rewrittenRootManifest.postinstall = "prisma generate --schema ./packages/db/prisma/schema.prisma";
  rewrittenRootManifest.engines = {
    node: "24.x"
  };

  if (!rewrittenRootManifest.devDependencies) {
    rewrittenRootManifest.devDependencies = {};
  }

  if (!rewrittenRootManifest.devDependencies.prisma) {
    rewrittenRootManifest.devDependencies.prisma = "^6.17.1";
  }

  await writeJson(path.join(destinationRoot, "package.json"), rewrittenRootManifest);

  const appTsconfigPath = path.join(destinationRoot, "tsconfig.json");
  const appTsconfig = JSON.parse(await readFile(appTsconfigPath, "utf8"));
  appTsconfig.extends = "./tsconfig.base.json";
  await writeFile(appTsconfigPath, `${JSON.stringify(appTsconfig, null, 2)}\n`, "utf8");

  const packageOutputDir = path.join(destinationRoot, "packages");
  await mkdir(packageOutputDir, {
    recursive: true
  });

  for (const packageName of workspacePackages) {
    const sourceDir = path.join(repoRoot, "packages", packageName);
    const destinationDir = path.join(packageOutputDir, packageName);

    await cp(sourceDir, destinationDir, {
      recursive: true,
      filter: copyFilter
    });

    const packageManifestPath = path.join(destinationDir, "package.json");
    const packageManifest = await readJson(packageManifestPath);
    const rewrittenPackageManifest = replaceWorkspaceReferences(packageManifest, (dependencyName) => `file:../${dependencyName}`);
    await writeJson(packageManifestPath, rewrittenPackageManifest);
  }

  await writeFile(
    path.join(destinationRoot, ".vercelignore"),
    [".next", "node_modules", ".turbo", "*.tsbuildinfo"].join("\n"),
    "utf8",
  );

  await writeFile(
    path.join(destinationRoot, "vercel.json"),
    `${JSON.stringify(
      {
        $schema: "https://openapi.vercel.sh/vercel.json",
        framework: "nextjs",
        installCommand: "npm install --include=dev"
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return destinationRoot;
}

async function main() {
  await mkdir(outputRoot, {
    recursive: true
  });

  const preparedTargets = [];

  for (const target of targets) {
    const preparedPath = await prepareTarget(target);
    preparedTargets.push({
      name: target.name,
      path: preparedPath
    });
  }

  process.stdout.write(`${JSON.stringify({ preparedTargets }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
