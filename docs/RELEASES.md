# Releasing Studio Voodoo Timer (macOS + auto-update)

Installed apps check for updates via [Tauri’s updater](https://v2.tauri.app/plugin/updater/) against `latest.json` on GitHub Releases.

CI builds are **Apple Silicon only** (`darwin-aarch64`). Intel Macs will never see an update from `latest.json`.

In-app updates only work in **production Tauri builds** (`npm run tauri build`), not in `tauri dev` or the Vite browser dev server.

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

1. Bump version in **`package.json`**, **`src-tauri/tauri.conf.json`**, and **`src-tauri/Cargo.toml`** (keep all three identical, e.g. `0.1.3` → `0.1.4`).
2. Commit and push to `main`.
3. **Tag release** workflow creates `v{version}` automatically if that tag does not exist yet; **Release** workflow then builds and publishes the GitHub release.

   Optional manual tag (same result):

   ```bash
   git tag v0.1.4
   git push origin v0.1.4
   ```

4. Open **Actions** → wait for **Tag release** (if needed) and **Release** to finish. The release is published immediately (`draft: false`).

Users with a previous updater-enabled build see a prompt on next launch when `latest.json` reports a higher version.

### Install / upgrade manually

In Terminal (logged in with `gh auth login`):

```bash
gh release download v0.1.2 --repo OliwiaWiduto/timer -D ~/Downloads
cd ~/Downloads
tar -xzf "Studio.Voodoo.Timer.app.tar.gz"
rm -rf "/Applications/Studio Voodoo Timer.app"
mv "Studio Voodoo Timer.app" /Applications/
xattr -cr "/Applications/Studio Voodoo Timer.app"
open "/Applications/Studio Voodoo Timer.app"
```

Or open the [v0.1.2 release](https://github.com/OliwiaWiduto/timer/releases/tag/v0.1.2) in a browser while signed in, download `Studio.Voodoo.Timer.app.tar.gz`, then extract and move to Applications.

## Local signed build (optional)

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/freelance-timer.key")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
npm run tauri build -- --target aarch64-apple-darwin --bundles app
```

Updater artifacts appear under `src-tauri/target/release/bundle/macos/` (`*.app.tar.gz` + `*.sig`).
