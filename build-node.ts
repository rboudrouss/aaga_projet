#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run --allow-net
/**
 * Build script to generate Node.js compatible JavaScript from Deno TypeScript
 * This bundles the CLI and all dependencies into a single JS file that can run with Node.js
 */

import * as esbuild from "npm:esbuild@0.20.2";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.11.0";

console.log("Building CLI for Node.js...");

try {
  // Ensure dist directory exists
  await Deno.mkdir("dist", { recursive: true });

  console.log("Bundling TypeScript with esbuild + Deno loader...");

  // Build the CLI application for Node.js
  await esbuild.build({
    plugins: [...denoPlugins()],
    entryPoints: ["cli.ts"],
    bundle: true,
    outfile: "dist/cli.cjs",
    format: "cjs", // CommonJS format for better compatibility
    platform: "node", // Target Node.js
    target: "node18", // Target Node.js 18+
    minify: false, // Keep readable for debugging
    sourcemap: true, // Generate source maps
    banner: {
      js: "#!/usr/bin/env node\n", // Make it executable
    },
  });

  // Post-process: Remove any duplicate shebangs
  console.log("Post-processing output...");
  let content = await Deno.readTextFile("dist/cli.cjs");

  // Remove all shebangs and add only one at the beginning
  const lines = content.split('\n');
  const filteredLines = lines.filter(line => !line.trim().startsWith('#!'));
  content = '#!/usr/bin/env node\n' + filteredLines.join('\n');

  await Deno.writeTextFile("dist/cli.cjs", content);

  await Deno.writeTextFile("dist/cli.js", content);

  console.log(" Build complete!");
  console.log(` Output: dist/cli.cjs (and dist/cli.js)`);
  console.log(` Format: CommonJS`);
  console.log(` Platform: Node.js`);

  if (Deno.build.os !== "windows") {
    await Deno.chmod("dist/cli.cjs", 0o755);
    await Deno.chmod("dist/cli.js", 0o755);
    console.log(" Made executable (chmod +x)");
  }

  console.log("\nUsage:");
  console.log("  node dist/cli.js --help");
  console.log("  ./dist/cli.js --help  (on Unix-like systems)");

  esbuild.stop();
} catch (error) {
  console.error("Build failed:", error);
  Deno.exit(1);
}

