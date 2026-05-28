import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/** Check GitHub Releases for a newer signed build; install on user confirmation. */
export async function checkForAppUpdate(): Promise<void> {
  if (!import.meta.env.PROD || !isTauri()) return;

  try {
    const update = await check();
    if (!update) return;

    const notes = update.body?.trim();
    const message = [
      `Freelance Timer ${update.version} is available.`,
      notes ? `\n${notes}` : "",
      "\n\nInstall now? The app will restart.",
    ].join("");

    if (!window.confirm(message)) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    console.warn("Update check failed:", err);
  }
}
