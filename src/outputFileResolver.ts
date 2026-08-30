import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

export type ResolutionResult = 
    | { type: 'success', path: string }
    | { type: 'not_found' }
    | { type: 'multiple_signatures' };

export async function resolveOutputFile(workspaceRoot: string): Promise<ResolutionResult> {
    // Priority 1: repomix.config.json
    const configPath = path.join(workspaceRoot, 'repomix.config.json');
    if (fs.existsSync(configPath)) {
        try {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const configData = JSON.parse(configContent);
            if (configData && configData.output && typeof configData.output.filePath === 'string') {
                logger.info(`Resolved output file via repomix.config.json: ${configData.output.filePath}`);
                return { type: 'success', path: configData.output.filePath };
            }
        } catch (e) {
            logger.warn(`Failed to parse repomix.config.json: ${e}`);
        }
    }

    // Priority 2: Workspace Settings (repomixSync.outputFileName)
    const config = vscode.workspace.getConfiguration('repomixSync');
    const userFileName = config.get<string | null>('outputFileName');
    if (userFileName) {
        logger.info(`Resolved output file via workspace setting: ${userFileName}`);
        return { type: 'success', path: userFileName };
    }

    // Priority 3: Signature Scanning
    const files = fs.readdirSync(workspaceRoot);
    const validExtensions = ['.txt', '.xml', '.md'];
    
    const candidates = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        if (!validExtensions.includes(ext)) return false;
        
        const fullPath = path.join(workspaceRoot, file);
        const stat = fs.statSync(fullPath);
        return stat.isFile();
    });

    const matches: string[] = [];
    const signature = "This file is a merged representation of the entire codebase, combined into a single document by Repomix.";

    for (const file of candidates) {
        const fullPath = path.join(workspaceRoot, file);
        try {
            // Read first chunk to check signature
            const fd = fs.openSync(fullPath, 'r');
            const buffer = Buffer.alloc(1024);
            const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
            fs.closeSync(fd);
            
            const chunk = buffer.toString('utf8', 0, bytesRead);
            if (chunk.includes(signature)) {
                matches.push(file);
            }
        } catch (e) {
            // Ignore unreadable files
        }
    }

    if (matches.length === 1) {
        logger.info(`Resolved output file via auto-detection (signature match): ${matches[0]}`);
        return { type: 'success', path: matches[0] };
    } else if (matches.length > 1) {
        logger.warn(`Multiple files matched the Repomix signature: ${matches.join(', ')}`);
        return { type: 'multiple_signatures' };
    }

    return { type: 'not_found' };
}
