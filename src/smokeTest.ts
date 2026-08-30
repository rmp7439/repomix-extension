import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as os from 'os';
import { GitRefWatcher } from './gitRefWatcher';
import { logger } from './logger';

export async function runSmokeTest() {
    vscode.window.showInformationMessage('Starting Repomix Sync Smoke Test...');
    logger.info('Starting smoke test...');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomix-sync-smoke-'));
    const remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomix-sync-remote-'));

    try {
        // Setup bare remote
        cp.execSync('git init --bare', { cwd: remoteDir });
        
        // Setup local repo
        cp.execSync('git init', { cwd: tempDir });
        cp.execSync('git config user.name "Test User"', { cwd: tempDir });
        cp.execSync('git config user.email "test@example.com"', { cwd: tempDir });
        const remoteUrl = remoteDir.replace(/\\/g, '/'); // Windows compat for git remote
        cp.execSync(`git remote add origin "file://${remoteUrl}"`, { cwd: tempDir });
        
        fs.writeFileSync(path.join(tempDir, 'test.txt'), 'hello world');
        cp.execSync('git add .', { cwd: tempDir });
        cp.execSync('git commit -m "initial commit"', { cwd: tempDir });
        cp.execSync('git branch -M main', { cwd: tempDir });

        let pushDetected = false;
        
        const watcher = new GitRefWatcher(
            tempDir,
            'origin',
            100, // short debounce
            (newSha) => {
                pushDetected = true;
                logger.info(`Smoke Test: Push detected! New SHA: ${newSha}`);
            },
            (status) => {
                logger.info(`Smoke Test: Status updated to ${status}`);
            }
        );
        watcher.activate();

        // Trigger a push
        logger.info('Smoke Test: Executing git push...');
        cp.execSync('git push -u origin main', { cwd: tempDir });

        // Wait up to 3 seconds for watcher to detect
        let attempts = 0;
        while (!pushDetected && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        watcher.dispose();

        if (pushDetected) {
            vscode.window.showInformationMessage('✅ Smoke test PASSED: Push detected successfully!');
            logger.info('Smoke test PASSED');
        } else {
            vscode.window.showErrorMessage('❌ Smoke test FAILED: Push was not detected within timeout.');
            logger.error('Smoke test FAILED');
        }

    } catch (e) {
        logger.error('Smoke test failed with exception', e);
        vscode.window.showErrorMessage(`Smoke test failed: ${e}`);
    }
}
