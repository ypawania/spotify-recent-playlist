export function selectRecentTracks(plays, { count, after } = {}) {
  const cutoffMs = after ? after.getTime() : null;
  const seen = new Set();
  const selected = [];

  for (const play of plays) {
    const playedAtMs = new Date(play.played_at).getTime();
    if (cutoffMs !== null && playedAtMs <= cutoffMs) {
      continue;
    }

    const track = play.track;
    if (!track || track.type !== "track" || track.is_local || !track.uri) {
      continue;
    }

    if (seen.has(track.uri)) {
      continue;
    }

    seen.add(track.uri);
    selected.push({
      uri: track.uri,
      name: track.name,
      artists: (track.artists || []).map((artist) => artist.name).filter(Boolean),
      playedAt: play.played_at
    });

    if (count && selected.length >= count) {
      break;
    }
  }

  return selected;
}

export function makeDefaultPlaylistName({ count, after, now = new Date() }) {
  if (after) {
    return `Recent listens after ${after.toISOString().slice(0, 16).replace("T", " ")}`;
  }

  if (count) {
    return `Recent ${count} listens`;
  }

  return `Recent listens ${now.toISOString().slice(0, 10)}`;
}

export function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
