// deno-lint-ignore-file no-explicit-any no-process-global
/**
 * Cross-platform compatibility layer for Deno and Node.js
 * This module provides unified APIs that work in both environments
 */

/**
 * Check if we're running in Deno or Node.js
 */
export const isDeno = typeof Deno !== "undefined";
export const isNode =
  typeof process !== "undefined" && process.versions?.node !== undefined;

/**
 * Read all data from stdin
 */
export async function readAll(stream?: any): Promise<Uint8Array> {
  if (isDeno) {
    // Deno environment
    const { readAll: denoReadAll } = await import("@std/io/read-all");
    return await denoReadAll(stream || Deno.stdin);
  } else {
    // Node.js environment
    const stdin = stream || process.stdin;
    const chunks: Uint8Array[] = [];

    for await (const chunk of stdin) {
      chunks.push(chunk);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}

/**
 * Read text file
 */
export async function readTextFile(path: string): Promise<string> {
  if (isDeno) {
    return await Deno.readTextFile(path);
  } else {
    // Node.js
    const { readFile } = await import("node:fs/promises");
    return await readFile(path, "utf-8");
  }
}

/**
 * Write text file
 */
export async function writeTextFile(
  path: string,
  content: string
): Promise<void> {
  if (isDeno) {
    await Deno.writeTextFile(path, content);
  } else {
    // Node.js
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path, content, "utf-8");
  }
}

/**
 * Exit the process
 */
export function exit(code: number): never {
  if (isDeno) {
    Deno.exit(code);
  } else {
    process.exit(code);
  }
}

/**
 * Get stdin stream
 */
export const stdin = isDeno ? Deno.stdin : process.stdin;

/**
 * Check if this module is the main module
 * In Deno, pass import.meta from the calling module
 * In Node.js, this will check if the current module is main
 */
export function isMain(importMeta?: ImportMeta): boolean {
  if (isDeno) {
    // In Deno, use the passed import.meta or fall back to this module's
    return importMeta ? importMeta.main : import.meta.main;
  } else {
    // Node.js: check if this is the main module
    // In CommonJS: require.main === module
    // In ESM: import.meta.url === process.argv[1]
    return typeof require !== "undefined" && require.main === module;
  }
}

/**
 * Get command line arguments
 */
export const args = isDeno ? Deno.args : process.argv.slice(2);
