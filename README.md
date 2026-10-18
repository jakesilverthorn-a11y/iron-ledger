# Iron Ledger

A workout tracker that runs as an iPhone Home Screen app: 876 exercises with cartoon demos, auto-built workouts,
strength ranks vs. people your size, muscle recovery map, friends leaderboard and challenges.

**Live app:** served by GitHub Pages from the `docs/` folder.
On iPhone open the link in Safari → Share → **Add to Home Screen**.

## Folders
| Folder | What it is |
|---|---|
| `docs/` | The built app that GitHub Pages serves. Don't edit by hand. |
| `src/` | Source: `logic.js` (data + scoring), `figure.js` (cartoon demos), `social.js` + `server.js` (friends & challenges), `ui.js`, styles. |
| `assets/` | Exercise photo sprite sheets copied into `docs/`. |
| `friends-server/` | Optional Cloudflare Worker for usernames, passwords and live challenges. See `SERVER-SETUP.txt`. |
| `tools/build.py` | Rebuilds `docs/` from `src/`. |

## Change the app
```
pip install pillow
python3 tools/build.py
git add -A && git commit -m "Update" && git push
```
GitHub Pages republishes within a minute or two.

## Friends server (optional)
Follow `friends-server/SERVER-SETUP.txt`, then put the Worker address in `docs/config.js`
(`window.IL_SERVER = "https://…workers.dev"`) and push. Everyone who opens the site is connected automatically.
Test the server logic locally with `node friends-server/test.mjs`.

## Data
Workouts, height and weight stay on each phone (back up from Settings). The friends server stores only usernames,
hashed passwords, strength scores and challenge progress.
