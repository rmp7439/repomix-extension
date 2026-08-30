import * as vscode from 'vscode';
import { GitRefWatcher } from './gitRefWatcher';
import { logger } from './logger';

export function activate(context: vscode.ExtensionContext) {
    logger.info('Repomix Sync is activating...');

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        logger.info('No workspace folders found.');
        return;
    }

    const config = vscode.workspace.getConfiguration('repomixSync');
    const remote = config.get<string>('remote', 'origin');
    const debounceMs = config.get<number>('debounceMs', 750);

    const watchers: GitRefWatcher[] = [];

    for (const folder of workspaceFolders) {
        const watcher = new GitRefWatcher(
            folder.uri.fsPath,
            remote,
            debounceMs,
            (newSha) => {
                logger.info(`Workspace ${folder.name} successfully pushed! New SHA: ${newSha}`);
                // TODO: Call regeneration logic here
            }
        );
        watcher.activate();
        watchers.push(watcher);
    }

    let disposable = vscode.commands.registerCommand('repomixSync.toggle', () => {
        vscode.window.showInformationMessage('Repomix Sync Toggled!');
    });

    let logDisposable = vscode.commands.registerCommand('repomixSync.showLog', () => {
        logger.show();
    });

    context.subscriptions.push(disposable, logDisposable);
    watchers.forEach(w => context.subscriptions.push(w));
}

export function deactivate() {}
