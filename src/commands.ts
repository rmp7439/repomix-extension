import * as vscode from 'vscode';
import { logger } from './logger';
import { StatusBar } from './statusBar';
import { runRepomixSync } from './syncRunner';

export async function forceRun(statusBar: StatusBar) {
    logger.info('Force run triggered by user');
    await triggerSync(statusBar, 'Manual Force Run');
}

export async function simulateTrigger(statusBar: StatusBar) {
    logger.info('Simulate trigger invoked by user');
    await triggerSync(statusBar, 'Simulated SHA-123456');
}

async function triggerSync(statusBar: StatusBar, shaSim: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found to run Repomix Sync.');
        return;
    }
    const folder = workspaceFolders[0];
    await runRepomixSync(folder.uri, statusBar, shaSim, true);
}
