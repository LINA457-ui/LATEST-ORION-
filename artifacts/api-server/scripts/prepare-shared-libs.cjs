const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../..");

const copies = [
  ["lib/api-zod/src", "lib/api-zod/dist"],
  ["lib/integrations-openai-ai-server/src", "lib/integrations-openai-ai-server/dist"],
];

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  for (const item of fs.readdirSync(src)) {
    const from = path.join(src, item);
    const stat = fs.statSync(from);

    if (stat.isDirectory()) {
      copyDir(from, path.join(dest, item));
      continue;
    }

    if (item.endsWith(".ts")) {
      let code = fs.readFileSync(from, "utf8");

      code = code
        .replace(/from "\.\/([^"]+)"/g, 'from "./$1.js"')
        .replace(/from "\.\/([^"]+)\/index"/g, 'from "./$1/index.js"');

      const outName = item.replace(/\.ts$/, ".js");
      fs.writeFileSync(path.join(dest, outName), code);
    } else {
      fs.copyFileSync(from, path.join(dest, item));
    }
  }
}

for (const [from, to] of copies) {
  copyDir(path.join(root, from), path.join(root, to));
}

console.log("Shared libs prepared.");