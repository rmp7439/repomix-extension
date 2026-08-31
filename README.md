# RepoSync

A VS Code extension that automatically regenerates a repomix-packed context file every time you successfully push to GitHub. It saves you from running manual scripts so you always have a fresh, ready-to-paste context file for LLM tools.

## Setup & Installation

The `repomix` library is bundled directly into the extension, so you don't need to install the CLI separately.

1. Install the RepoSync extension.
2. Open a repository folder in VS Code.
3. Create your initial output file once, either by running `repomix` yourself (CLI) or via repomix.com, and place it in your workspace root — OR just push once with no existing file and use the "Select Output File" picker prompt that appears.
4. From then on, every successful push automatically regenerates that same file.

### How output file detection works

The extension automatically tries to find your Repomix output file in this strict priority order:

1. **`repomix.config.json`**: If this config exists in the root and defines `output.filePath`, it is always used.
2. **Workspace Setting**: If you manually select a file using the "Select Output File" command, it gets saved to `.vscode/settings.json` and takes priority.
3. **Automatic Signature Detection**: The extension scans root `.txt`, `.xml`, and `.md` files for the Repomix header signature. 

**Ambiguity handling**: If signature scanning finds *multiple* matching files, the extension halts and locks into a "Needs Selection" warning state on the status bar. It will never guess silently. You must click the warning to choose which file to use (which saves it as a workspace setting). If no file is found, it similarly prompts you to select one.

## Configuration

| Setting | Type | Default | Description |
|---|---|---|---|
| `reposync.enabled` | `boolean` | `true` | Enable/disable automatic regeneration on git push |
| `reposync.remote` | `string` | `"origin"` | Primary remote to watch for pushes |
| `reposync.debounceMs` | `number` | `750` | Debounce window in milliseconds for rapid consecutive pushes |
| `reposync.pollIntervalMs` | `number` | `3000` | Interval in milliseconds to poll the git ref file as a backup mechanism (useful for OneDrive/Dropbox synced folders where native watching fails) |
| `reposync.notifyOnSync` | `boolean` | `false` | Show a notification toast in addition to the status bar update |
| `reposync.autoGitignore` | `boolean` | `true` | Automatically offer to add the output file to .gitignore |
| `reposync.outputFileName` | `string` | `null` | The exact path of the repomix output file. If not set, the extension attempts auto-detection. |

## Commands

- **RepoSync: Toggle**: Enable or disable the automatic background syncing.
- **RepoSync: Force Regenerate Now**: Manually trigger a regeneration right away.
- **RepoSync: Simulate Push Event**: Simulate a push event to test if the watcher and sync logic responds correctly.
- **RepoSync: Show Log**: Open the output channel log to see background events and errors.
- **RepoSync: Select Output File**: Opens a file picker to explicitly choose the output file, overriding auto-detection.
- **RepoSync: Run Smoke Test**: Run a fully automated built-in test suite in a temporary directory to verify the extension end-to-end.

## Known Limitations and Design Notes

- **Cloud-Synced Folders**: Native file-system watching can be extremely unreliable in cloud-synced folders (OneDrive, Dropbox, Google Drive). This is why a polling fallback exists alongside the native watcher (configurable via `reposync.pollIntervalMs`).
- **Submodules**: Submodules aren't specially handled in v1. Only the top-level repository's pushes are watched.
- **Security Warning**: If Repomix's security checks were disabled during generation, sensitive data like API keys could end up committed. This is why the extension prominently warns and prompts to add your output file to `.gitignore` the first time it detects a new output file.

## How to Verify It's Working

You can run the built-in `RepoSync: Run Smoke Test` command, or verify it manually with this checklist:

- [ ] Open a git repository in VS Code
- [ ] Push from VS Code's Source Control UI → file updates
- [ ] Push from an integrated terminal → file updates
- [ ] Push from an external terminal while VS Code is open → file updates
- [ ] Force-push → file updates
- [ ] New branch's first push → file updates
- [ ] Toggle off, push, confirm nothing happens; toggle on, push, confirm it resumes

## Bugs Found and Fixed During Development

- **Output file self-packing**: Fixed a bug where repomix packed its own previous output file into the new output, growing it exponentially.
- **Unreliable file watching in synced folders**: OneDrive interfered with native fs events on `.git/refs`, solved by implementing a hybrid watch/poll mechanism.
- **Toggle state not flipping correctly**: Fixed a bug where reading a stale configuration object meant the toggle command always disabled the extension instead of flipping the state.
- **Ambiguous file detection**: Fixed auto-detection flip-flopping due to transient read-locks by adding a strict ambiguity lock that halts until manually resolved.
