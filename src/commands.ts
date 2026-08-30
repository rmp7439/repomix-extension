import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from './logger';
import { StatusBar } from './statusBar';
import { regenerate } from './regenerate';
import { writeAtomicallyAndVerify } from './outputWriter';

export async function forceRun(statusBar: StatusBar) {
    logger.info('Force run triggered by user');
    await runSync(statusBar, 'Manual Force Run');
}

export async function simulateTrigger(statusBar: StatusBar) {
    logger.info('Simulate trigger invoked by user');
    await runSync(statusBar, 'Simulated SHA-123456');
}

async function runSync(statusBar: StatusBar, shaSim: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found to run Repomix Sync.');
        return;
    }

    const config = vscode.workspace.getConfiguration('repomixSync');
    const enabled = config.get<boolean>('enabled', true);
    if (!enabled) {
        vscode.window.showWarningMessage('Repomix Sync is currently disabled.');
        return;
    }

    statusBar.updateState('regenerating');

    const folder = workspaceFolders[0];
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
            statusBar.updateState('synced', `at ${time} (${shaSim})`);
            vscode.window.showInformationMessage(`Repomix Sync complete (${shaSim})`);
        }
    } catch (e) {
        logger.error('Sync failed', e);
        statusBar.updateState('error', String(e));
        vscode.window.showErrorMessage(`Repomix Sync failed: ${e}`);
    }
}
