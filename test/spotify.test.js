import test from "node:test";
import assert from "node:assert/strict";
import { SpotifyClient } from "../src/spotify.js";

test("SpotifyClient pages recent plays with before cursor", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const isSecondPage = String(url).includes("before=older");
    return jsonResponse({
      items: isSecondPage ? [] : [play("2026-04-29T12:00:00.000Z")],
      cursors: { before: "older" }
    });
  };

  try {
    const client = new SpotifyClient("token");
    const result = await client.getRecentPlays({ count: 100 });
    assert.equal(result.plays.length, 1);
    assert.equal(calls.length, 2);
    assert.match(calls[1], /before=older/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("SpotifyClient batches playlist additions by 100", async () => {
  const requestBodies = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    requestBodies.push(JSON.parse(options.body));
    return jsonResponse({ snapshot_id: "snapshot" }, 201);
  };

  try {
    const client = new SpotifyClient("token");
    const uris = Array.from({ length: 205 }, (_, index) => `spotify:track:${index}`);
    await client.addPlaylistItems("playlist", uris);
    assert.deepEqual(requestBodies.map((body) => body.uris.length), [100, 100, 5]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function play(playedAt) {
  return {
    played_at: playedAt,
    track: {
      type: "track",
      uri: "spotify:track:1",
      is_local: false,
      name: "Song",
      artists: []
    }
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}
