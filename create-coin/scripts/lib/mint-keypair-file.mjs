import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * @param {string} outPath
 * @param {Uint8Array} secretKey
 */
export function writeMintKeypairFile(outPath, secretKey) {
  const outputDirectory = dirname(outPath);
  try {
    mkdirSync(outputDirectory, { recursive: true });
  } catch (error) {
    throw new Error(
      `Unable to prepare mint keypair output directory ${outputDirectory}: ${error?.message ?? error}`,
      { cause: error },
    );
  }

  try {
    writeFileSync(
      outPath,
      `${JSON.stringify(Array.from(secretKey))}\n`,
      { flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(
        `Mint keypair output path already exists; refusing to overwrite: ${outPath}`,
        { cause: error },
      );
    }
    throw new Error(
      `Unable to write mint keypair file ${outPath}: ${error?.message ?? error}`,
      { cause: error },
    );
  }
}
