# Releasing Freelance Timer (macOS + auto-update)

Installed apps check for updates via [Tauri’s updater](https://v2.tauri.app/plugin/updater/) against `latest.json` on GitHub Releases.

## Private repository = no in-app updates

This repo is **private**. The updater fetches `latest.json` over HTTPS **without** a GitHub login, so those URLs return 404 and the app silently skips the update (see the Web Inspector / `console.warn` for `Update check failed`).

**Options:**

1. **Manual install** from [Releases](https://github.com/OliwiaWiduto/timer/releases) while logged into GitHub (see below).
2. **Make the repo public** (simplest if you are OK with that) — then fix `latest.json` on the next tag (filename fix is in `scripts/generate-latest-json.mjs`).
3. **Public update host** — e.g. a small proxy or a public S3/gist that only hosts `latest.json` + `.tar.gz` (see [Tauri updater docs](https://v2.tauri.app/plugin/updater/)).

CI builds are **Apple Silicon only** (`darwin-aarch64`). Intel Macs will never see an update from `latest.json`.

## One-time setup (you)

### 1. Back up the signing key

A keypair was generated on your Mac at:

- Private: `~/.tauri/freelance-timer.key` (**never commit or share**)
- Public: `~/.tauri/freelance-timer.key.pub` (already embedded in `tauri.conf.json`)

Copy the private key file to a password manager or secure backup. If you lose it, you cannot ship updates to existing installs.

### 2. Add GitHub repository secrets

In **GitHub → OliwiaWiduto/timer → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|--------|
| `TAURI_SIGNING_PRIVATE_KEY` | Full contents of `~/.tauri/freelance-timer.key` (paste the entire file from `cat ~/.tauri/freelance-timer.key`) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Do not create this secret (key has no password). The workflow sets it to empty in CI. |
| `VITE_SUPABASE_URL` | Same as your local `.env` |
| `VITE_SUPABASE_ANON_KEY` | Same as your local `.env` |

`GITHUB_TOKEN` is provided automatically by Actions.

### 3. Install an updater-enabled build once

Apps installed **before** this updater was added will not auto-update until you install **one** release built with the updater (from GitHub or a local signed build). After that, later releases can prompt in-app.

## Publishing a new version

1. Bump version in **both** `package.json` and `src-tauri/tauri.conf.json` (e.g. `0.1.0` → `0.1.1`).
2. Commit and push to `main`.
3. Create and push a tag (version must match `tauri.conf.json`):

   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```

4. Open **Actions** → wait for **Release** to finish.
5. Open the new **draft** release on GitHub, verify assets (`latest.json`, `.tar.gz`, `.dmg`, etc.), edit release notes, then **Publish release**.

Users with a previous updater-enabled build will see a prompt on next launch when `latest.json` points to a higher version (requires a **public** release URL; see above).

### Install / upgrade manually (private repo)

In Terminal (logged in with `gh auth login`):

```bash
gh release download v0.1.2 --repo OliwiaWiduto/timer -D ~/Downloads
cd ~/Downloads
tar -xzf "Freelance.Timer.app.tar.gz"
rm -rf "/Applications/Freelance Timer.app"
mv "Freelance Timer.app" /Applications/
xattr -cr "/Applications/Freelance Timer.app"
open "/Applications/Freelance Timer.app"
```

Or open the [v0.1.2 release](https://github.com/OliwiaWiduto/timer/releases/tag/v0.1.2) in a browser while signed in, download `Freelance.Timer.app.tar.gz`, then extract and move to Applications.

## Local signed build (optional)

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/freelance-timer.key")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
npm run tauri build -- --target aarch64-apple-darwin --bundles app
```

Updater artifacts appear under `src-tauri/target/release/bundle/macos/` (`*.app.tar.gz` + `*.sig`).
