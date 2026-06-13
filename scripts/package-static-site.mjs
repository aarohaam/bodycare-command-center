import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const stageDir = path.join("work", "site-archive");

await rm(stageDir, { recursive: true, force: true });
await mkdir(path.join(stageDir, ".openai"), { recursive: true });

await cp("dist", stageDir, { recursive: true });
await cp(".openai/hosting.json", path.join(stageDir, ".openai", "hosting.json"));
await cp("dist/index.js", path.join(stageDir, "index.js"));

console.log(`Sites archive staged at ${stageDir}`);
