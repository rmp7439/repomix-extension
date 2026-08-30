import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';
import { StatusBar } from './statusBar';
import { regenerate } from './regenerate';
import { writeAtomicallyAndVerify } from './outputWriter';

export async function runRepomixSync(
    folderUri: vscode.Uri,
    statusBar: StatusBar,
    newSha: string,
    isManual: boolean = false
) {
    const config = vscode.workspace.getConfiguration('repomixSync');
    const enabled = config.get<boolean>('enabled', true);
    if (!enabled && !isManual) {
        logger.info('Repomix Sync is disabled. Skipping regeneration.');
        return;
    }

    const outputFileName = config.get<string>('outputFileName', 'repo.txt');
    const style = config.get<string>('style', 'plain');
    const finalFilePath = path.join(folderUri.fsPath, outputFileName);
    
    if (!fs.existsSync(finalFilePath)) {
        const msg = `Output file ${outputFileName} not found — run repomix once manually to create it.`;
        logger.warn(msg);
        if (isManual) {
            vscode.window.showWarningMessage(msg);
        }
        return;
    }

    statusBar.updateState('regenerating');

    const tempFilePath = path.join(folderUri.fsPath, `${outputFileName}.tmp`);

    try {
        await regenerate(folderUri.fsPath, tempFilePath, style, [outputFileName]);
        const result = writeAtomicallyAndVerify(tempFilePath, finalFilePath);
        if (result) {
            logger.info(`Sync complete. Wrote ${result.size} bytes (hash: ${result.hash})`);
            const time = new Date().toLocaleTimeString();
            statusBar.updateState('synced', `at ${time} (SHA: ${newSha.substring(0, 7)})`);
            
            if (isManual || config.get<boolean>('notifyOnSync', false)) {
                vscode.window.showInformationMessage(`Repomix Sync complete (SHA: ${newSha.substring(0, 7)})`);
            }
        }
    } catch (e) {
        logger.error('Sync failed', e);
        statusBar.updateState('error', String(e));
        if (isManual) {
            vscode.window.showErrorMessage(`Repomix Sync failed: ${e}`);
        }
    }
}
