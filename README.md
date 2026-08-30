# Repomix Sync

A VS Code extension that automatically regenerates a repomix-packed context file (`repo.txt`) every time you successfully push to GitHub. Zero manual steps — so you always have a fresh, ready-to-paste context file for LLM tools.

## Demo

![Demo: Git push triggers regeneration](https://via.placeholder.com/800x400.png?text=Demo:+git+push+triggers+repomix)

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
| `repomixSync.outputFileName` | `string` | `"repo.txt"` | Target output filename |
| `repomixSync.style` | `"plain"\|"xml"\|"markdown"` | `"plain"` | Repomix style format |
| `repomixSync.remote` | `string` | `"origin"` | The remote to watch for pushes |
| `repomixSync.debounceMs` | `number` | `750` | Debounce window (ms) for rapid consecutive pushes |
| `repomixSync.notifyOnSync` | `boolean` | `false` | Show a notification toast when sync completes |
| `repomixSync.autoGitignore` | `boolean` | `true` | Offer to add output file to `.gitignore` on startup |

## Known Limitations

- **Submodules**: Currently ignores submodules. Only the top-level repository's pushes are watched.
- **Remote Filesystems**: Watching `.git/refs` on network drives, WSL, SSHFS, or Docker volumes relies on native `fs.watch` which may miss events.
- **Failed Pushes**: The extension listens to the ref changing, so failed/rejected pushes naturally produce no event.
- **Web**: Does not work on `github.dev` or `vscode.dev` since it requires node file system access.
