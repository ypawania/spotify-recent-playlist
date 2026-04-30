# Spotify Recent Playlist

A local Node.js CLI for creating Spotify playlists from recently played tracks.

## Features

- Create a playlist from the latest `N` unique tracks.
- Create a playlist from tracks played after a specific time.
- Replace an existing playlist with a fresh selection.
- Keep playlists private by default.
- Deduplicate repeat listens while preserving most-recent-first order.

## Usage

```sh
npm run recent -- --count 30
npm run recent -- --after "2026-04-01 09:00"
npm run recent -- --count 20 --name "Recent listens" --mode create
npm run recent -- --after "today 09:00" --mode replace --playlist-id SPOTIFY_PLAYLIST_ID
```

Remove a playlist created during testing:

```sh
npm run recent -- --delete-playlist SPOTIFY_PLAYLIST_ID
```

## Development

```sh
npm test
npm run check:secrets
```

Requires Node.js 22 or newer.
