# Releasing Freelance Timer (macOS + auto-update)

Installed apps check for updates via [Tauri’s updater](https://v2.tauri.app/plugin/updater/) against `latest.json` on GitHub Releases.

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

Users with a previous updater-enabled build will see a prompt on next launch when `latest.json` points to a higher version.

## Local signed build (optional)

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/freelance-timer.key")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
npm run tauri build -- --target aarch64-apple-darwin --bundles app
```

Updater artifacts appear under `src-tauri/target/release/bundle/macos/` (`*.app.tar.gz` + `*.sig`).
