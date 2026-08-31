import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';
import { StatusBar } from './statusBar';
import { regenerate } from './regenerate';
import { writeAtomicallyAndVerify } from './outputWriter';
import { resolveOutputFile } from './outputFileResolver';

export async function runRepomixSync(
    folderUri: vscode.Uri,
    statusBar: StatusBar,
    newSha: string,
    isManual: boolean = false
) {
    const config = vscode.workspace.getConfiguration('repomixSync');
    const enabled = config.get<boolean>('enabled', true);
    if (!enabled && !isManual) {
        logger.info('RepoSync is disabled. Skipping regeneration.');
        return;
    }

    const resolved = await resolveOutputFile(folderUri.fsPath);
    if (resolved.type === 'not_found' || resolved.type === 'multiple_signatures') {
        const msg = resolved.type === 'not_found' 
            ? 'No Repomix output file found. Run repomix once or click the status bar to select.'
            : 'Multiple repomix files found. Click the status bar to select the correct one.';
        logger.warn(msg);
        statusBar.updateState('no_output_file');
        if (isManual) {
            vscode.window.showWarningMessage(msg);
        }
        return;
    }

    const outputFileName = resolved.path;
    const style = config.get<string>('style', 'plain');
    const finalFilePath = path.join(folderUri.fsPath, outputFileName);

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
                vscode.window.showInformationMessage(`RepoSync complete (SHA: ${newSha.substring(0, 7)})`);
            }
        }
    } catch (e) {
        logger.error('Sync failed', e);
        statusBar.updateState('error', String(e));
        if (isManual) {
            vscode.window.showErrorMessage(`RepoSync failed: ${e}`);
        }
    }
}
