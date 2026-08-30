import * as vscode from 'vscode';
import { GitRefWatcher } from './gitRefWatcher';
import { logger } from './logger';
import { StatusBar } from './statusBar';
import { forceRun, simulateTrigger } from './commands';
import { ensureGitignore } from './gitignoreHelper';
import { runSmokeTest } from './smokeTest';
import { runRepomixSync } from './syncRunner';

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

    const statusBar = new StatusBar();
    const watchers: GitRefWatcher[] = [];

    for (const folder of workspaceFolders) {
        const outputFileName = config.get<string>('outputFileName', 'repo.txt');
        ensureGitignore(folder.uri.fsPath, outputFileName);

        const watcher = new GitRefWatcher(
            folder.uri.fsPath,
            remote,
            debounceMs,
            async (newSha) => {
                logger.info(`Workspace ${folder.name} successfully pushed! New SHA: ${newSha}`);
                await runRepomixSync(folder.uri, statusBar, newSha, false);
            },
            (status) => {
                if (config.get<boolean>('enabled', true)) {
                    statusBar.updateState(status);
                }
            }
        );
        watcher.activate();
        watchers.push(watcher);
    }

    let disposable = vscode.commands.registerCommand('repomixSync.toggle', () => {
        const current = config.get<boolean>('enabled', true);
        config.update('enabled', !current, vscode.ConfigurationTarget.Workspace).then(() => {
            const newState = !current;
            statusBar.updateState(newState ? 'watching' : 'off');
            vscode.window.showInformationMessage(`Repomix Sync ${newState ? 'Enabled' : 'Disabled'}`);
        });
    });

    let logDisposable = vscode.commands.registerCommand('repomixSync.showLog', () => {
        logger.show();
    });

    let forceRunDisposable = vscode.commands.registerCommand('repomixSync.forceRun', () => {
        forceRun(statusBar);
    });

    let simulateDisposable = vscode.commands.registerCommand('repomixSync.simulateTrigger', () => {
        simulateTrigger(statusBar);
    });

    let smokeTestDisposable = vscode.commands.registerCommand('repomixSync.runSmokeTest', () => {
        runSmokeTest();
    });

    context.subscriptions.push(disposable, logDisposable, forceRunDisposable, simulateDisposable, smokeTestDisposable, statusBar);
    watchers.forEach(w => context.subscriptions.push(w));
}

export function deactivate() {}
