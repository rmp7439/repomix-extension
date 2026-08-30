import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

export class GitRefWatcher {
    private headWatcher?: vscode.FileSystemWatcher;
    private remoteRefWatcher?: vscode.FileSystemWatcher;
    private packedRefsWatcher?: vscode.FileSystemWatcher;

    private currentBranch: string | null = null;
    private currentRemoteRefSha: string | null = null;
    private debounceTimer?: NodeJS.Timeout;

    constructor(
        private readonly workspaceRoot: string,
        private readonly remoteName: string,
        private readonly debounceMs: number,
        private readonly onPushDetected: (newSha: string) => void
    ) {}

    public activate() {
        logger.info(`Activating GitRefWatcher for workspace: ${this.workspaceRoot}`);
        this.watchHead();
        this.watchPackedRefs();
        this.resolveCurrentBranchAndWatch();
    }

    public dispose() {
        this.headWatcher?.dispose();
        this.remoteRefWatcher?.dispose();
        this.packedRefsWatcher?.dispose();
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }

    private getGitPath(...subpaths: string[]): string {
        return path.join(this.workspaceRoot, '.git', ...subpaths);
    }

    private watchHead() {
        const headPath = this.getGitPath('HEAD');
        if (!fs.existsSync(headPath)) {
            logger.warn(`No .git/HEAD found at ${headPath}`);
            return;
        }

        const relativeHeadPattern = new vscode.RelativePattern(this.workspaceRoot, '.git/HEAD');
        this.headWatcher = vscode.workspace.createFileSystemWatcher(relativeHeadPattern);
        
        this.headWatcher.onDidChange(() => this.onHeadChanged());
        this.headWatcher.onDidCreate(() => this.onHeadChanged());
        logger.info(`Watching .git/HEAD for branch switches`);
    }

    private watchPackedRefs() {
        const packedRefsPath = this.getGitPath('packed-refs');
        // It's okay if it doesn't exist yet, we still watch for creation
        const relativePackedPattern = new vscode.RelativePattern(this.workspaceRoot, '.git/packed-refs');
        this.packedRefsWatcher = vscode.workspace.createFileSystemWatcher(relativePackedPattern);
        
        this.packedRefsWatcher.onDidChange(() => this.checkPackedRefs());
        this.packedRefsWatcher.onDidCreate(() => this.checkPackedRefs());
        logger.info(`Watching .git/packed-refs`);
    }

    private onHeadChanged() {
        logger.info(`.git/HEAD changed, re-resolving current branch...`);
        this.resolveCurrentBranchAndWatch();
    }

    private resolveCurrentBranchAndWatch() {
        const headPath = this.getGitPath('HEAD');
        if (!fs.existsSync(headPath)) {
            return;
        }

        try {
            const headContent = fs.readFileSync(headPath, 'utf8').trim();
            if (headContent.startsWith('ref: refs/heads/')) {
                const branchName = headContent.replace('ref: refs/heads/', '');
                if (branchName !== this.currentBranch) {
                    logger.info(`Switched to branch: ${branchName}`);
                    this.currentBranch = branchName;
                    this.watchRemoteRef(branchName);
                }
            } else {
                logger.info(`Detached HEAD detected (or non-branch ref)`);
                this.currentBranch = null;
                this.disposeRemoteRefWatcher();
            }
        } catch (e) {
            logger.error(`Failed to read .git/HEAD`, e);
        }
    }

    private watchRemoteRef(branchName: string) {
        this.disposeRemoteRefWatcher();

        const remoteRefRelativePath = `.git/refs/remotes/${this.remoteName}/${branchName}`;
        const relativePattern = new vscode.RelativePattern(this.workspaceRoot, remoteRefRelativePath);
        this.remoteRefWatcher = vscode.workspace.createFileSystemWatcher(relativePattern);

        this.remoteRefWatcher.onDidChange(() => this.handleRefChange());
        this.remoteRefWatcher.onDidCreate(() => this.handleRefChange());
        logger.info(`Watching remote ref: ${remoteRefRelativePath}`);
        
        // Initialize current SHA so we don't trigger immediately if it hasn't changed
        this.currentRemoteRefSha = this.readRefSha(branchName);
    }

    private disposeRemoteRefWatcher() {
        if (this.remoteRefWatcher) {
            this.remoteRefWatcher.dispose();
            this.remoteRefWatcher = undefined;
        }
    }

    private readRefSha(branchName: string): string | null {
        const refPath = this.getGitPath('refs', 'remotes', this.remoteName, branchName);
        if (fs.existsSync(refPath)) {
            try {
                return fs.readFileSync(refPath, 'utf8').trim();
            } catch (e) {
                // Ignore
            }
        }
        return this.readPackedRefSha(branchName);
    }

    private readPackedRefSha(branchName: string): string | null {
        const packedPath = this.getGitPath('packed-refs');
        if (!fs.existsSync(packedPath)) return null;

        try {
            const content = fs.readFileSync(packedPath, 'utf8');
            const lines = content.split('\n');
            const targetRef = `refs/remotes/${this.remoteName}/${branchName}`;
            for (const line of lines) {
                if (!line.startsWith('^') && !line.startsWith('#')) {
                    const parts = line.split(' ');
                    if (parts.length === 2 && parts[1].trim() === targetRef) {
                        return parts[0];
                    }
                }
            }
        } catch (e) {
            logger.warn(`Failed to read packed-refs: ${e}`);
        }
        return null;
    }

    private checkPackedRefs() {
        if (!this.currentBranch) return;
        this.handleRefChange();
    }

    private handleRefChange() {
        if (!this.currentBranch) return;

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            if (!this.currentBranch) return;
            const newSha = this.readRefSha(this.currentBranch);
            
            if (newSha && newSha !== this.currentRemoteRefSha) {
                logger.info(`Push detected! Remote ref changed from ${this.currentRemoteRefSha || 'none'} to ${newSha}`);
                this.currentRemoteRefSha = newSha;
                this.onPushDetected(newSha);
            }
        }, this.debounceMs);
    }
}
