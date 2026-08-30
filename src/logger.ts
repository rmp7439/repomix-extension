import * as vscode from 'vscode';
import * as crypto from 'crypto';

class Logger {
    private channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('Repomix Sync');
    }

    private log(level: string, message: string) {
        const timestamp = new Date().toISOString();
        this.channel.appendLine(`[${timestamp}] [${level}] ${message}`);
    }

    info(message: string) {
        this.log('INFO', message);
    }

    warn(message: string) {
        this.log('WARN', message);
    }

    error(message: string, error?: any) {
        this.log('ERROR', `${message} ${error ? String(error) : ''}`);
    }

    show() {
        this.channel.show();
    }
}

export const logger = new Logger();
