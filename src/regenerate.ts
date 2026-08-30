import { runCli } from 'repomix';
import { logger } from './logger';
import * as path from 'path';

export async function regenerate(
    workspaceRoot: string,
    tempOutputPath: string,
    style: string
): Promise<void> {
    try {
        logger.info(`Running repomix regeneration (style: ${style}) to temp file...`);
        // We pass the args as an array. '.' is the directory to pack.
        // We typecast options to any to handle potential version differences in repomix types.
        const options: any = {
            output: tempOutputPath,
            style: style,
            quiet: true
        };
        await runCli(['.'], workspaceRoot, options);
        logger.info(`Repomix successfully generated to ${tempOutputPath}`);
    } catch (e) {
        logger.error(`Repomix regeneration failed`, e);
        throw e;
    }
}
