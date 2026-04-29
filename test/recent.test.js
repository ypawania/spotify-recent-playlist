import test from "node:test";
import assert from "node:assert/strict";
import { chunk, selectRecentTracks } from "../src/recent.js";

test("selectRecentTracks deduplicates by most recent play", () => {
  const plays = [
    play("spotify:track:1", "First", "2026-04-29T12:00:00.000Z"),
    play("spotify:track:2", "Second", "2026-04-29T11:00:00.000Z"),
    play("spotify:track:1", "First", "2026-04-29T10:00:00.000Z")
  ];

  const tracks = selectRecentTracks(plays, { count: 10 });
  assert.deepEqual(tracks.map((track) => track.uri), ["spotify:track:1", "spotify:track:2"]);
});

test("selectRecentTracks filters by cutoff and skips local tracks", () => {
  const plays = [
    play("spotify:track:1", "First", "2026-04-29T12:00:00.000Z"),
    play("spotify:track:2", "Second", "2026-04-29T09:00:00.000Z"),
    play("spotify:track:3", "Local", "2026-04-29T13:00:00.000Z", { is_local: true })
  ];

  const tracks = selectRecentTracks(plays, { after: new Date("2026-04-29T10:00:00.000Z") });
  assert.deepEqual(tracks.map((track) => track.uri), ["spotify:track:1"]);
});

test("chunk splits Spotify add batches", () => {
  const items = Array.from({ length: 205 }, (_, index) => index);
  assert.deepEqual(chunk(items, 100).map((batch) => batch.length), [100, 100, 5]);
});

function play(uri, name, playedAt, overrides = {}) {
  return {
    played_at: playedAt,
    track: {
      type: "track",
      uri,
      name,
      is_local: false,
      artists: [{ name: "Artist" }],
      ...overrides
    }
  };
}
