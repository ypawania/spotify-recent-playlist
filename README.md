# Spotify Recent Playlist

A local CLI for creating or updating Spotify playlists from recently played songs.

## Setup

1. Create a Spotify app at <https://developer.spotify.com/dashboard>.
2. Add `http://127.0.0.1:51737/callback` as a redirect URI.
3. Copy `.env.example` to `.env` and fill in your Spotify client credentials.

`.env` is ignored by Git. OAuth tokens are stored outside the repo in your user config directory.

## Usage

```sh
npm run recent -- --count 30
npm run recent -- --after "2026-04-01 09:00"
npm run recent -- --count 20 --name "Recent listens" --mode create
npm run recent -- --after "today 09:00" --mode replace --playlist-id SPOTIFY_PLAYLIST_ID
```

By default, playlists are private and duplicate tracks are removed.

## Testing

```sh
npm test
npm run check:secrets
```
