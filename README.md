# Repomix Sync

A VS Code extension that automatically regenerates a repomix-packed context file (`repo.txt`) every time you successfully push to GitHub. Zero manual steps — so you always have a fresh, ready-to-paste context file for LLM tools.

## Demo

![Demo: Git push triggers regeneration](https://via.placeholder.com/800x400.png?text=Demo:+git+push+triggers+repomix)

## Setup

1. Install the Repomix Sync extension.
2. Open a repository folder in VS Code.
3. The extension will automatically try to find your repomix output file in this order:
   - Reading the `repomix.config.json` (if it exists).
   - Reading the `.vscode/settings.json` workspace setting.
   - Scanning root `.txt`/`.xml`/`.md` files for the repomix signature.
   - If it can't find it automatically, the status bar will say `⚠️ No output file set`. Click it to select your file.
4. (Optional) Run `Repomix Sync: Toggle` to disable/enable.

## Manual Test Checklist

Anyone installing this extension can verify it themselves using this built-in checklist:

- [ ] Push from VS Code's Source Control UI → file updates
- [ ] Push from an integrated terminal → file updates
- [ ] Push from an external terminal while VS Code is open → file updates
- [ ] Force-push → file updates
- [ ] New branch's first push → file updates
- [ ] Toggle off, push, confirm nothing happens; toggle on, push, confirm it resumes

Alternatively, run the built-in **"Repomix Sync: Run Smoke Test"** command to simulate a push in a temporary local repository and confirm the extension works end-to-end!

## Configuration

| Setting | Type | Default | Description |
|---|---|---|---|
| `repomixSync.enabled` | `boolean` | `true` | Enable/disable automatic regeneration |
| `repomixSync.remote`         | `origin` | The remote to watch for pushes (e.g. origin or upstream) |
| `repomixSync.outputFileName` | `null` | The exact path of the output file. Set this via the `Select Output File` command or let auto-detection find it. |
| `repomixSync.debounceMs`     | `750` | Debounce window (ms) for rapid consecutive pushes |
| `repomixSync.notifyOnSync` | `boolean` | `false` | Show a notification toast when sync completes |
| `repomixSync.autoGitignore` | `boolean` | `true` | Offer to add output file to `.gitignore` on startup |

## Known Limitations

- **Cloud-Synced Folders (OneDrive/Dropbox) & Remote Filesystems**: Native file system watching is inherently unreliable on network drives, WSL, SSHFS, Docker volumes, and cloud-synced folders (like OneDrive). To solve this, Repomix Sync uses a robust hybrid approach: it watches for native file events and *also* polls the git ref in the background. You can control the polling frequency using the `repomixSync.pollIntervalMs` setting.
- **Submodules**: Currently ignores submodules. Only the top-level repository's pushes are watched.
- **Failed Pushes**: The extension listens to the ref changing, so failed/rejected pushes naturally produce no event.
- **Web**: Does not work on `github.dev` or `vscode.dev` since it requires node file system access.
