#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getAccessToken } from "./auth.js";
import { getSpotifyConfig } from "./config.js";
import { makeDefaultPlaylistName, selectRecentTracks } from "./recent.js";
import { SpotifyClient } from "./spotify.js";
import { parseLocalTime } from "./time.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const count = args.count ? Number(args.count) : null;
  const after = args.after ? parseLocalTime(args.after) : null;
  if (!args.deletePlaylist && !count && !after) {
    throw new Error("Provide either --count N or --after TIME.");
  }

  if (count !== null && (!Number.isInteger(count) || count < 1)) {
    throw new Error("--count must be a positive integer.");
  }

  const client = new SpotifyClient(await getAccessToken(getSpotifyConfig()));

  if (args.deletePlaylist) {
    await client.deletePlaylist(args.deletePlaylist);
    console.log(`Deleted playlist from your library: ${args.deletePlaylist}`);
    return;
  }

  const recent = await client.getRecentPlays({ count, after });
  const tracks = selectRecentTracks(recent.plays, { count, after });
  if (tracks.length === 0) {
    throw new Error("No matching recent tracks found.");
  }

  if (recent.exhaustedBeforeCutoff) {
    console.warn("Spotify did not return plays old enough to prove the full cutoff range was covered.");
  }

  const mode = await resolveMode(args);
  const name = args.name || makeDefaultPlaylistName({ count, after });
  const isPublic = Boolean(args.public);
  const uris = tracks.map((track) => track.uri);
  let playlistId = args.playlistId;

  if (mode === "replace") {
    if (!playlistId) {
      playlistId = await ask("Playlist ID to replace: ");
    }
    await client.replacePlaylistItems(playlistId, uris);
  } else {
    const playlist = await client.createPlaylist({ name, isPublic });
    playlistId = playlist.id;
    await client.addPlaylistItems(playlistId, uris);
  }

  console.log(`${mode === "replace" ? "Updated" : "Created"} playlist ${playlistId} with ${tracks.length} track(s).`);
  console.log("Tracks:");
  for (const track of tracks) {
    console.log(`- ${track.name} - ${track.artists.join(", ") || "Unknown artist"}`);
  }
}

function parseArgs(argv) {
  const args = { mode: "ask", public: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--count") {
      args.count = argv[++index];
    } else if (arg === "--after") {
      args.after = argv[++index];
    } else if (arg === "--name") {
      args.name = argv[++index];
    } else if (arg === "--mode") {
      args.mode = argv[++index];
    } else if (arg === "--playlist-id") {
      args.playlistId = argv[++index];
    } else if (arg === "--replace") {
      args.mode = "replace";
    } else if (arg === "--create") {
      args.mode = "create";
    } else if (arg === "--public") {
      args.public = true;
    } else if (arg === "--private") {
      args.public = false;
    } else if (arg === "--delete-playlist") {
      args.deletePlaylist = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!["ask", "create", "replace"].includes(args.mode)) {
    throw new Error("--mode must be ask, create, or replace.");
  }

  return args;
}

async function resolveMode(args) {
  if (args.mode !== "ask") {
    return args.mode;
  }

  if (!process.stdin.isTTY) {
    return args.playlistId ? "replace" : "create";
  }

  const answer = (await ask("Create a new playlist or replace an existing one? [create/replace] ")).toLowerCase();
  return answer.startsWith("r") ? "replace" : "create";
}

async function ask(question) {
  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

function printHelp() {
  console.log(`Usage:
  npm run recent -- --count 30
  npm run recent -- --after "2026-04-01 09:00"
  npm run recent -- --count 20 --mode create --name "Recent listens"
  npm run recent -- --count 20 --mode replace --playlist-id PLAYLIST_ID
  npm run recent -- --delete-playlist PLAYLIST_ID

Options:
  --count N              Select N unique recently played tracks.
  --after TIME           Select tracks played after a local time.
  --mode MODE            ask, create, or replace. Default: ask.
  --playlist-id ID       Playlist to replace.
  --name NAME            Name for a new playlist.
  --public               Create public playlists. Default is private.
  --delete-playlist ID   Remove a playlist created during testing from your library.
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
