import assert from "node:assert/strict";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeMintKeypairFile } from "../scripts/lib/mint-keypair-file.mjs";

const DUMMY_SECRET_KEY_BYTES = Uint8Array.from({ length: 64 }, (_, i) =>
  (i * 17 + 23) % 256
);
const SERIALIZED_DUMMY_SECRET = JSON.stringify(Array.from(DUMMY_SECRET_KEY_BYTES));

function temporaryDirectory(t) {
  const directory = mkdtempSync(join(tmpdir(), "pump-create-coin-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function captureError(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
}

test("creates a new mint keypair file with JSON output and 0600 permissions", (t) => {
  const directory = temporaryDirectory(t);
  const outPath = join(directory, "nested", "mint.json");

  writeMintKeypairFile(outPath, DUMMY_SECRET_KEY_BYTES);

  assert.equal(readFileSync(outPath, "utf8"), `${SERIALIZED_DUMMY_SECRET}\n`);
  assert.equal(statSync(outPath).mode & 0o777, 0o600);
});

test("does not overwrite an existing path", (t) => {
  const directory = temporaryDirectory(t);
  const outPath = join(directory, "mint.json");
  const original = Buffer.from("existing dummy data\n");
  writeFileSync(outPath, original, { mode: 0o640 });

  const error = captureError(() =>
    writeMintKeypairFile(outPath, DUMMY_SECRET_KEY_BYTES)
  );

  assert.deepEqual(
    readFileSync(outPath),
    original,
    "existing file must remain byte-for-byte unchanged",
  );
  assert.match(error?.message ?? "", /already exists/i);
  assert.equal((error?.message ?? "").includes(SERIALIZED_DUMMY_SECRET), false);
});

test("refuses a symlink without changing its target", (t) => {
  const directory = temporaryDirectory(t);
  const targetPath = join(directory, "target.txt");
  const linkPath = join(directory, "mint.json");
  const original = Buffer.from("symlink target dummy data\n");
  writeFileSync(targetPath, original, { mode: 0o640 });
  symlinkSync(targetPath, linkPath);

  const error = captureError(() =>
    writeMintKeypairFile(linkPath, DUMMY_SECRET_KEY_BYTES)
  );

  assert.equal(lstatSync(linkPath).isSymbolicLink(), true);
  assert.deepEqual(
    readFileSync(targetPath),
    original,
    "symlink target must remain byte-for-byte unchanged",
  );
  assert.match(error?.message ?? "", /already exists/i);
  assert.equal((error?.message ?? "").includes(SERIALIZED_DUMMY_SECRET), false);
});

test("reports output-directory failures without exposing secret material", (t) => {
  const directory = temporaryDirectory(t);
  const parentPath = join(directory, "not-a-directory");
  const outPath = join(parentPath, "mint.json");
  writeFileSync(parentPath, "dummy parent file\n");

  const error = captureError(() =>
    writeMintKeypairFile(outPath, DUMMY_SECRET_KEY_BYTES)
  );

  assert.match(error?.message ?? "", /mint keypair output directory/i);
  assert.equal((error?.message ?? "").includes(SERIALIZED_DUMMY_SECRET), false);
});

test("reports file-write failures without exposing secret material", (t) => {
  const directory = temporaryDirectory(t);
  const outPath = join(directory, "mint\0.json");

  const error = captureError(() =>
    writeMintKeypairFile(outPath, DUMMY_SECRET_KEY_BYTES)
  );

  assert.match(error?.message ?? "", /unable to write mint keypair file/i);
  assert.equal((error?.message ?? "").includes(SERIALIZED_DUMMY_SECRET), false);
});
