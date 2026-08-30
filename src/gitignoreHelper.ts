import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

export async function ensureGitignore(workspaceRoot: string, outputFileName: string) {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    
    if (fs.existsSync(gitignorePath)) {
        try {
            const content = fs.readFileSync(gitignorePath, 'utf8');
            const lines = content.split('\n').map(l => l.trim());
            if (lines.includes(outputFileName)) {
                return; // Already ignored
            }
        } catch (e) {
            logger.warn(`Could not read .gitignore: ${e}`);
        }
    }

    const config = vscode.workspace.getConfiguration('repomixSync');
    if (!config.get<boolean>('autoGitignore', true)) {
        return;
    }

    const selection = await vscode.window.showWarningMessage(
        `⚠️ Security Warning: If Repomix's security checks were disabled during generation, sensitive data like API keys could end up committed if pushed. Would you like to add ${outputFileName} to your .gitignore now to prevent this?`,
        'Yes', 'No'
    );

    if (selection === 'Yes') {
        try {
            fs.appendFileSync(gitignorePath, `\n# Repomix Sync output\n${outputFileName}\n`);
            logger.info(`Added ${outputFileName} to .gitignore`);
            vscode.window.showInformationMessage(`Added ${outputFileName} to .gitignore`);
        } catch (e) {
            logger.error('Failed to update .gitignore', e);
            vscode.window.showErrorMessage(`Failed to update .gitignore: ${e}`);
        }
    }
}
