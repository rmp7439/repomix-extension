import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Repomix Sync is now active!');

    let disposable = vscode.commands.registerCommand('repomixSync.toggle', () => {
        vscode.window.showInformationMessage('Repomix Sync Toggled!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
