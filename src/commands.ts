import * as vscode from 'vscode';
import * as path from 'path';
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

export async function selectOutputFile(workspaceRoot: string, statusBar: StatusBar, candidates?: string[]) {
    let selectedPath: string | undefined;

    if (candidates && candidates.length > 0) {
        const choice = await vscode.window.showQuickPick(candidates, {
            placeHolder: 'Multiple repomix files found. Select one to use as the output file:',
            ignoreFocusOut: true
        });
        if (choice) {
            selectedPath = path.join(workspaceRoot, choice);
        }
    } else {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select Repomix Output File',
            defaultUri: vscode.Uri.file(workspaceRoot)
        });
        if (uris && uris.length > 0) {
            selectedPath = uris[0].fsPath;
        }
    }

    if (selectedPath) {
        const relativePath = path.relative(workspaceRoot, selectedPath);
        
        // Save to workspace settings
        const config = vscode.workspace.getConfiguration('repomixSync');
        await config.update('outputFileName', relativePath, vscode.ConfigurationTarget.Workspace);
        
        logger.info(`Output file set to ${relativePath} via user selection`);
        vscode.window.showInformationMessage(`RepoSync output file set to ${relativePath}`);
        statusBar.updateState('watching');
    }
}

async function triggerSync(statusBar: StatusBar, shaSim: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found to run RepoSync.');
        return;
    }
    const folder = workspaceFolders[0];
    await runRepomixSync(folder.uri, statusBar, shaSim, true);
}
