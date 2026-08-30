import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from './logger';

export function writeAtomicallyAndVerify(tempFilePath: string, finalFilePath: string): { size: number, hash: string } | null {
    try {
        if (!fs.existsSync(tempFilePath)) {
            logger.error(`Temp file not found: ${tempFilePath}`);
            return null;
        }

        // Calculate size and hash before rename
        const stats = fs.statSync(tempFilePath);
        const fileBuffer = fs.readFileSync(tempFilePath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 8);

        // Atomic rename
        fs.renameSync(tempFilePath, finalFilePath);
        
        logger.info(`File successfully written to ${finalFilePath}`);
        logger.info(`Output stats: ${stats.size} bytes, hash: ${hash}`);

        return { size: stats.size, hash };
    } catch (e) {
        logger.error(`Failed to write atomically to ${finalFilePath}`, e);
        return null;
    }
}
