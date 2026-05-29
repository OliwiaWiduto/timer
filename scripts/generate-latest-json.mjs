import fs from "node:fs";
import path from "node:path";

const version = (process.env.VERSION ?? "").replace(/^v/, "");
const tag = process.env.TAG ?? `v${version}`;
const repo = process.env.GITHUB_REPOSITORY;
const bundleDir = process.env.BUNDLE_DIR;

if (!version || !repo || !bundleDir) {
  console.error("VERSION, GITHUB_REPOSITORY, and BUNDLE_DIR are required");
  process.exit(1);
}

const tarName = "Freelance Timer.app.tar.gz";
const tarPath = path.join(bundleDir, tarName);
const sigPath = `${tarPath}.sig`;

if (!fs.existsSync(tarPath) || !fs.existsSync(sigPath)) {
  console.error("Missing updater bundle or signature:", tarPath, sigPath);
  process.exit(1);
}

const signature = fs.readFileSync(sigPath, "utf8").trim();
// GitHub release uploads turn spaces in asset names into dots (e.g. "Freelance.Timer.app.tar.gz").
const uploadTarName = tarName.replaceAll(" ", ".");
const url = `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(uploadTarName)}`;

const latest = {
  version,
  notes: process.env.RELEASE_NOTES ?? "",
  pub_date: new Date().toISOString(),
  platforms: {
    "darwin-aarch64": { signature, url },
  },
};

fs.writeFileSync("latest.json", `${JSON.stringify(latest, null, 2)}\n`);
console.log("Wrote latest.json for", version);
