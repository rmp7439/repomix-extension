import * as vscode from 'vscode';

export type SyncState = 'off' | 'watching' | 'regenerating' | 'synced' | 'error';

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
        switch (state) {
            case 'off':
                this.statusBarItem.text = '$(debug-pause) Repomix Sync: Off';
                this.statusBarItem.tooltip = 'Repomix Sync is disabled';
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
        }
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}
