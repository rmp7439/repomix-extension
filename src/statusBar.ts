import * as vscode from 'vscode';

export type SyncState = 'off' | 'watching' | 'regenerating' | 'synced' | 'error' | 'detached' | 'no_remote' | 'no_output_file';

export class StatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private state: SyncState = 'off';

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'repomixSync.showLog';
        this.updateState('watching');
        this.statusBarItem.show();
    }

    public updateState(state: SyncState, detail?: string) {
        this.state = state;
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = 'repomixSync.showLog';
        switch (state) {
            case 'off':
                this.statusBarItem.text = '$(debug-pause) Repomix Sync: Off';
                this.statusBarItem.tooltip = 'Repomix Sync is disabled';
                break;
            case 'no_output_file':
                this.statusBarItem.text = '$(warning) Repomix Sync: No output file set — click to select';
                this.statusBarItem.tooltip = 'Click to select the repomix output file for this workspace.';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                this.statusBarItem.command = 'repomixSync.selectOutputFile';
                break;
            case 'watching':
                this.statusBarItem.text = '$(eye) Repomix Sync: Watching';
                this.statusBarItem.tooltip = 'Watching for git push events';
                break;
            case 'regenerating':
                this.statusBarItem.text = '$(sync~spin) Repomix Sync: Regenerating...';
                this.statusBarItem.tooltip = 'Regenerating repomix context';
                break;
            case 'synced':
                this.statusBarItem.text = '$(check) Repomix Sync: Synced';
                this.statusBarItem.tooltip = detail ? `Synced: ${detail}` : 'Synced successfully';
                break;
            case 'error':
                this.statusBarItem.text = '$(error) Repomix Sync: Error';
                this.statusBarItem.tooltip = detail ? `Error: ${detail}` : 'Error during sync';
                break;
            case 'detached':
                this.statusBarItem.text = '$(debug-pause) Repomix Sync: Detached HEAD';
                this.statusBarItem.tooltip = 'Paused: Detached HEAD state detected';
                break;
            case 'no_remote':
                this.statusBarItem.text = '$(warning) Repomix Sync: No Git Repo';
                this.statusBarItem.tooltip = 'Waiting for valid .git repository setup';
                break;
        }
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}
