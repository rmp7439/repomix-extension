import * as vscode from 'vscode';
import { GitRefWatcher } from './gitRefWatcher';
import { logger } from './logger';
import { StatusBar } from './statusBar';
import { forceRun, simulateTrigger, selectOutputFile } from './commands';
import { ensureGitignore } from './gitignoreHelper';
import { runSmokeTest } from './smokeTest';
import { runRepomixSync } from './syncRunner';
import { resolveOutputFile } from './outputFileResolver';

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
    const pollIntervalMs = config.get<number>('pollIntervalMs', 3000);

    const statusBar = new StatusBar();
    const watchers: GitRefWatcher[] = [];

    for (const folder of workspaceFolders) {
        // Initial resolution check to update status bar if missing
        resolveOutputFile(folder.uri.fsPath).then(resolved => {
            if (resolved.type === 'not_found' || resolved.type === 'multiple_signatures') {
                statusBar.updateState('no_output_file');
            } else {
                ensureGitignore(folder.uri.fsPath, resolved.path);
            }
        });

        // Watch for root-level config or output file creations
        const rootWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(folder, '*{.txt,.xml,.md,.json}')
        );
        rootWatcher.onDidCreate(() => {
            resolveOutputFile(folder.uri.fsPath).then(resolved => {
                if (resolved.type === 'success') {
                    statusBar.updateState('watching');
                    ensureGitignore(folder.uri.fsPath, resolved.path);
                }
            });
        });
        context.subscriptions.push(rootWatcher);

        const watcher = new GitRefWatcher(
            folder.uri.fsPath,
            remote,
            debounceMs,
            pollIntervalMs,
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

    let selectFileDisposable = vscode.commands.registerCommand('repomixSync.selectOutputFile', () => {
        const folder = workspaceFolders[0];
        selectOutputFile(folder.uri.fsPath, statusBar);
    });

    context.subscriptions.push(disposable, logDisposable, forceRunDisposable, simulateDisposable, smokeTestDisposable, selectFileDisposable, statusBar);
    watchers.forEach(w => context.subscriptions.push(w));
}

export function deactivate() {}
