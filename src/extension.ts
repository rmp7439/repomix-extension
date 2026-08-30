import * as vscode from 'vscode';
import { GitRefWatcher } from './gitRefWatcher';
import { logger } from './logger';
import { regenerate } from './regenerate';
import { writeAtomicallyAndVerify } from './outputWriter';
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

    const watchers: GitRefWatcher[] = [];

    for (const folder of workspaceFolders) {
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

                const outputFileName = config.get<string>('outputFileName', 'repo.txt');
                const style = config.get<string>('style', 'plain');
                const finalFilePath = path.join(folder.uri.fsPath, outputFileName);
                const tempFilePath = path.join(folder.uri.fsPath, `${outputFileName}.tmp`);

                try {
                    await regenerate(folder.uri.fsPath, tempFilePath, style);
                    const result = writeAtomicallyAndVerify(tempFilePath, finalFilePath);
                    if (result) {
                        logger.info(`Sync complete. Wrote ${result.size} bytes (hash: ${result.hash})`);
                    }
                } catch (e) {
                    logger.error('Sync failed', e);
                }
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
