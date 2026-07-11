import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(fs.readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const root = lock.packages?.[""];

if (!root || lock.lockfileVersion !== 3) {
  throw new Error("package-lock.json must be lockfileVersion 3 with a root package");
}

function verifySection(name) {
  const expected = manifest[name] ?? {};
  const actual = root[name] ?? {};
  const names = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  const errors = [];
  for (const dependency of [...names].sort()) {
    if (!(dependency in expected)) errors.push(`${name}: unexpected ${dependency}`);
    else if (!(dependency in actual)) errors.push(`${name}: missing ${dependency}`);
    else if (expected[dependency] !== actual[dependency]) {
      errors.push(
        `${name}: ${dependency} is ${expected[dependency]} in package.json but ${actual[dependency]} in package-lock.json`,
      );
    }
  }
  return errors;
}

const errors = [
  ...verifySection("dependencies"),
  ...verifySection("devDependencies"),
];
if (errors.length > 0) {
  throw new Error(`Dependency lock mismatch:\n${errors.join("\n")}`);
}

console.log("package.json and package-lock.json are synchronized.");
