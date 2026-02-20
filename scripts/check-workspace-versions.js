const fs = require("fs");
const path = require("path");

const TARGETS = [
  { name: "admin", packagePath: path.join("apps", "admin", "package.json") },
  { name: "buyer", packagePath: path.join("apps", "buyer", "package.json") },
  { name: "seller", packagePath: path.join("apps", "seller", "package.json") },
  { name: "shared", packagePath: path.join("packages", "shared", "package.json") },
];
const KEYS = ["expo", "react", "react-dom", "react-native"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  const root = process.cwd();
  const versions = {};
  const errors = [];

  TARGETS.forEach(({ name, packagePath }) => {
    const pkgPath = path.join(root, packagePath);
    const pkg = readJson(pkgPath);
    const deps = pkg.dependencies || {};
    versions[name] = {};
    KEYS.forEach((key) => {
      versions[name][key] = deps[key] || "";
    });
  });

  KEYS.forEach((key) => {
    const expected = versions[TARGETS[0].name][key];
    TARGETS.slice(1).forEach(({ name }) => {
      if (name === "shared" && (key === "expo" || key === "react-native")) {
        return;
      }
      if (!expected && !versions[name][key]) return;
      if (versions[name][key] !== expected) {
        errors.push(
          `${key} mismatch: ${TARGETS[0].name}=${expected} but ${name}=${versions[name][key]}`,
        );
      }
    });
  });

  if (errors.length > 0) {
    console.error("Workspace version mismatch detected:");
    errors.forEach((line) => console.error(`- ${line}`));
    process.exit(1);
  }

  console.log("Workspace versions are in sync.");
  KEYS.forEach((key) => {
    console.log(`- ${key}: ${versions[TARGETS[0].name][key]}`);
  });
}

main();
