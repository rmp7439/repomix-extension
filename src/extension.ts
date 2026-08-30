import * as vscode from 'vscode';
import { GitRefWatcher } from './gitRefWatcher';
import { logger } from './logger';
import { regenerate } from './regenerate';
import { writeAtomicallyAndVerify } from './outputWriter';
import { StatusBar } from './statusBar';
import { forceRun, simulateTrigger } from './commands';
import { ensureGitignore } from './gitignoreHelper';
import * as path from 'path';
import * as fs from 'fs';

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
                
                const enabled = config.get<boolean>('enabled', true);
                if (!enabled) {
                    logger.info('Repomix Sync is disabled. Skipping regeneration.');
                    return;
                }

                statusBar.updateState('regenerating');

                const outputFileName = config.get<string>('outputFileName', 'repo.txt');
                const style = config.get<string>('style', 'plain');
                const finalFilePath = path.join(folder.uri.fsPath, outputFileName);
                const tempFilePath = path.join(folder.uri.fsPath, `${outputFileName}.tmp`);

                try {
                    await regenerate(folder.uri.fsPath, tempFilePath, style);
                    const result = writeAtomicallyAndVerify(tempFilePath, finalFilePath);
                    if (result) {
                        logger.info(`Sync complete. Wrote ${result.size} bytes (hash: ${result.hash})`);
                        const time = new Date().toLocaleTimeString();
                        statusBar.updateState('synced', `at ${time} (SHA: ${newSha.substring(0, 7)})`);
                        
                        if (config.get<boolean>('notifyOnSync', false)) {
                            vscode.window.showInformationMessage(`Repomix Sync complete (SHA: ${newSha.substring(0, 7)})`);
                        }
                    }
                } catch (e) {
                    logger.error('Sync failed', e);
                    statusBar.updateState('error', String(e));
                }
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

    context.subscriptions.push(disposable, logDisposable, forceRunDisposable, simulateDisposable, statusBar);
    watchers.forEach(w => context.subscriptions.push(w));
}

export function deactivate() {}
