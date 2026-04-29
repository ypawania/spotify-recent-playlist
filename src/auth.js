import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { getTokenPath } from "./config.js";

const SCOPES = [
  "user-read-recently-played",
  "playlist-modify-private",
  "playlist-modify-public"
];

export async function getAccessToken(config) {
  const cached = readTokenCache();
  if (cached?.refresh_token) {
    if (cached.access_token && cached.expires_at && Date.now() < cached.expires_at - 60_000) {
      return cached.access_token;
    }

    return refreshAccessToken(config, cached.refresh_token);
  }

  return authorizeWithBrowser(config);
}

async function authorizeWithBrowser(config) {
  const redirect = new URL(config.redirectUri);
  const expectedState = crypto.randomUUID();
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("state", expectedState);

  const codePromise = waitForAuthorizationCode(redirect, expectedState);
  console.log("Open this URL in your browser to authorize Spotify access:");
  console.log(authUrl.toString());

  const code = await codePromise;
  const token = await requestToken(config, {
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri
  });
  writeTokenCache(token);
  return token.access_token;
}

function waitForAuthorizationCode(redirect, expectedState) {
  const port = Number(redirect.port || 80);
  const hostname = redirect.hostname;
  const pathname = redirect.pathname;

  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url, `http://${request.headers.host}`);
      if (requestUrl.pathname !== pathname) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const error = requestUrl.searchParams.get("error");
      const state = requestUrl.searchParams.get("state");
      const code = requestUrl.searchParams.get("code");

      if (error) {
        response.writeHead(400);
        response.end("Spotify authorization failed. You can close this tab.");
        server.close();
        reject(new Error(`Spotify authorization failed: ${error}`));
        return;
      }

      if (state !== expectedState || !code) {
        response.writeHead(400);
        response.end("Invalid Spotify authorization response. You can close this tab.");
        server.close();
        reject(new Error("Invalid Spotify authorization response."));
        return;
      }

      response.writeHead(200, { "content-type": "text/plain" });
      response.end("Spotify authorization complete. You can close this tab.");
      server.close();
      resolve(code);
    });

    server.on("error", reject);
    server.listen(port, hostname);
  });
}

async function refreshAccessToken(config, refreshToken) {
  const token = await requestToken(config, {
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  const merged = { ...readTokenCache(), ...token, refresh_token: token.refresh_token || refreshToken };
  writeTokenCache(merged);
  return merged.access_token;
}

async function requestToken(config, body) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(body)
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Spotify token request failed (${response.status}): ${json.error_description || json.error || "unknown error"}`);
  }

  return {
    ...json,
    expires_at: Date.now() + json.expires_in * 1000
  };
}

function readTokenCache() {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(tokenPath, "utf8"));
}

function writeTokenCache(token) {
  const tokenPath = getTokenPath();
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2), { mode: 0o600 });
}
