const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../..");

const copies = [
  ["lib/api-zod/src", "lib/api-zod/dist"],
  [
    "lib/integrations-openai-ai-server/src",
    "lib/integrations-openai-ai-server/dist",
  ],
];

for (const [from, to] of copies) {
  const src = path.join(root, from);
  const dest = path.join(root, to);

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

console.log("Shared libs prepared.");