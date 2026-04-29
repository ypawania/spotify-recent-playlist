import { chunk } from "./recent.js";

const API_BASE = "https://api.spotify.com/v1";

export class SpotifyClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async getCurrentUser() {
    return this.request("/me");
  }

  async getRecentPlays({ count, after }) {
    const plays = [];
    let before = null;
    let reachedCutoff = false;
    const cutoffMs = after ? after.getTime() : null;

    while (!reachedCutoff) {
      const params = new URLSearchParams({ limit: "50" });
      if (before) {
        params.set("before", before);
      }

      const page = await this.request(`/me/player/recently-played?${params}`);
      const items = page.items || [];
      if (items.length === 0) {
        break;
      }

      plays.push(...items);
      const oldest = items.at(-1);
      const oldestMs = oldest ? new Date(oldest.played_at).getTime() : null;
      if (cutoffMs !== null && oldestMs !== null && oldestMs <= cutoffMs) {
        reachedCutoff = true;
      }

      const nextBefore = page.cursors?.before || (oldestMs !== null ? String(oldestMs) : null);
      if (!nextBefore || nextBefore === before) {
        break;
      }

      before = nextBefore;
    }

    return {
      plays,
      exhaustedBeforeCutoff: cutoffMs !== null && !reachedCutoff
    };
  }

  async createPlaylist({ name, isPublic }) {
    return this.request("/me/playlists", {
      method: "POST",
      body: {
        name,
        public: isPublic,
        description: "Created from recently played Spotify tracks."
      }
    });
  }

  async replacePlaylistItems(playlistId, uris) {
    await this.request(`/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: "PUT",
      body: { uris: [] }
    });
    return this.addPlaylistItems(playlistId, uris);
  }

  async addPlaylistItems(playlistId, uris) {
    let lastResponse = null;
    for (const batch of chunk(uris, 100)) {
      lastResponse = await this.request(`/playlists/${encodeURIComponent(playlistId)}/tracks`, {
        method: "POST",
        body: { uris: batch }
      });
    }

    return lastResponse;
  }

  async deletePlaylist(playlistId) {
    await this.request(`/playlists/${encodeURIComponent(playlistId)}/followers`, {
      method: "DELETE",
      expectJson: false
    });
  }

  async request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        ...(options.body ? { "content-type": "application/json" } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Spotify API request failed (${response.status}) ${path}: ${text}`);
    }

    if (options.expectJson === false || response.status === 204) {
      return null;
    }

    return response.json();
  }
}
