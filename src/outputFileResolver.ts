import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

export type ResolutionResult = 
    | { type: 'success', path: string }
    | { type: 'not_found' }
    | { type: 'multiple_signatures', matches: string[] };

const ambiguityLocks = new Set<string>();
const ambiguityMatches = new Map<string, string[]>();

export async function resolveOutputFile(workspaceRoot: string): Promise<ResolutionResult> {
    // Priority 1: repomix.config.json
    const configPath = path.join(workspaceRoot, 'repomix.config.json');
    if (fs.existsSync(configPath)) {
        try {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const configData = JSON.parse(configContent);
            if (configData && configData.output && typeof configData.output.filePath === 'string') {
                ambiguityLocks.delete(workspaceRoot);
                ambiguityMatches.delete(workspaceRoot);
                logger.info(`Resolved output file via repomix.config.json: ${configData.output.filePath}`);
                return { type: 'success', path: configData.output.filePath };
            }
        } catch (e) {
            logger.warn(`Failed to parse repomix.config.json: ${e}`);
        }
    }

    // Priority 2: Workspace Settings (reposync.outputFileName)
    const config = vscode.workspace.getConfiguration('reposync');
    const userFileName = config.get<string | null>('outputFileName');
    if (userFileName) {
        // If a user explicitly sets a file, clear any temporary ambiguity lock
        ambiguityLocks.delete(workspaceRoot);
        ambiguityMatches.delete(workspaceRoot);
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

    if (matches.length > 1) {
        ambiguityLocks.add(workspaceRoot);
        
        // Merge with existing ambiguous matches to avoid losing any due to transient read errors
        const existing = ambiguityMatches.get(workspaceRoot) || [];
        const uniqueMatches = Array.from(new Set([...existing, ...matches]));
        ambiguityMatches.set(workspaceRoot, uniqueMatches);
        
        logger.warn(`Multiple files matched the Repomix signature: ${uniqueMatches.join(', ')}`);
        return { type: 'multiple_signatures', matches: uniqueMatches };
    }
    
    if (ambiguityLocks.has(workspaceRoot)) {
        const cached = ambiguityMatches.get(workspaceRoot) || [];
        logger.warn(`Locked in ambiguous state due to previous multiple matches: ${cached.join(', ')}`);
        return { type: 'multiple_signatures', matches: cached };
    }

    if (matches.length === 1) {
        logger.info(`Resolved output file via auto-detection (signature match): ${matches[0]}`);
        return { type: 'success', path: matches[0] };
    }

    return { type: 'not_found' };
}
