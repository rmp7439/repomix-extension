import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as os from 'os';
import { GitRefWatcher } from './gitRefWatcher';
import { logger } from './logger';
import { runRepomixSync } from './syncRunner';
import { StatusBar } from './statusBar';

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

        const config = vscode.workspace.getConfiguration('repomixSync');
        await config.update('outputFileName', 'repo.txt', vscode.ConfigurationTarget.Workspace);
        
        const outputFileName = 'repo.txt';
        const finalFilePath = path.join(tempDir, outputFileName);
        
        // Extension now requires the file to exist first
        fs.writeFileSync(finalFilePath, 'dummy initial content');
        
        const statusBar = new StatusBar();
        let pushDetected = false;
        let syncCompleted = false;
        
        const watcher = new GitRefWatcher(
            tempDir,
            'origin',
            100, // short debounce
            500, // short poll interval for tests
            async (newSha) => {
                pushDetected = true;
                logger.info(`Smoke Test: Push detected! New SHA: ${newSha}`);
                await runRepomixSync(vscode.Uri.file(tempDir), statusBar, newSha, false);
                syncCompleted = true;
            },
            (status) => {
                logger.info(`Smoke Test: Status updated to ${status}`);
            }
        );
        watcher.activate();

        // Trigger a push
        logger.info('Smoke Test: Executing git push...');
        cp.execSync('git push -u origin main', { cwd: tempDir });

        // Wait up to 10 seconds for watcher to detect and sync
        let attempts = 0;
        while (!syncCompleted && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        watcher.dispose();
        statusBar.dispose();

        if (!syncCompleted) {
            vscode.window.showErrorMessage('❌ Smoke test FAILED: Sync was not completed within timeout.');
            logger.error('Smoke test FAILED (timeout)');
            return;
        }

        const generatedContent1 = fs.readFileSync(finalFilePath, 'utf8');
        if (generatedContent1 === 'dummy initial content') {
            vscode.window.showErrorMessage('❌ Smoke test FAILED: Output file did not update.');
            logger.error('Smoke test FAILED (file unchanged)');
            return;
        }

        // Run a second time to verify it doesn't pack itself
        logger.info('Smoke Test: Running second generation to test self-packing exclusion...');
        await runRepomixSync(vscode.Uri.file(tempDir), statusBar, 'manual-second-run', true);
        
        const generatedContent2 = fs.readFileSync(finalFilePath, 'utf8');
        
        // It shouldn't contain a file header for itself
        // A typical repomix file entry header is like "File: repo.txt" or "================\nFile: repo.txt\n================"
        if (generatedContent2.includes(`File: ${outputFileName}`)) {
            vscode.window.showErrorMessage('❌ Smoke test FAILED: Output file packed itself into the new output!');
            logger.error('Smoke test FAILED (self-packing detected)');
            return;
        }

        vscode.window.showInformationMessage('✅ Smoke test PASSED: End-to-end sync and self-packing exclusion verified!');
        logger.info('Smoke test PASSED');

    } catch (e) {
        logger.error('Smoke test failed with exception', e);
        vscode.window.showErrorMessage(`Smoke test failed: ${e}`);
    }
}
