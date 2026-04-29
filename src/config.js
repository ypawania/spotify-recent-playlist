import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const APP_NAME = "spotify-recent-playlist";

export function loadEnvFile(filePath = path.join(process.cwd(), ".env")) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function getSpotifyConfig() {
  loadEnvFile();

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:51737/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env or the environment.");
  }

  return { clientId, clientSecret, redirectUri };
}

export function getConfigDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, APP_NAME);
  }

  return path.join(os.homedir(), ".config", APP_NAME);
}

export function getTokenPath() {
  return path.join(getConfigDir(), "tokens.json");
}
