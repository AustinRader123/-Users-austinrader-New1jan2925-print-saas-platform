import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StorageFile {
  url: string;
  path: string;
  fileName: string;
  size: number;
}

export class StorageProvider {
  private useLocal: boolean;
  private localPath: string;

  constructor() {
    this.useLocal = process.env.S3_USE_LOCAL === 'true';
    this.localPath = process.env.S3_LOCAL_PATH || './uploads';

    if (this.useLocal) {
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(this.localPath)) {
        fs.mkdirSync(this.localPath, { recursive: true });
        logger.info(`Created local storage directory: ${this.localPath}`);
      }
    }
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    folder: string = 'uploads'
  ): Promise<StorageFile> {
    if (this.useLocal) {
      return this.uploadLocal(buffer, fileName, folder);
    }
    // S3 implementation would go here
    throw new Error('S3 not configured, using local storage');
  }

  private uploadLocal(buffer: Buffer, fileName: string, folder: string): StorageFile {
    const uniqueFileName = `${uuid()}-${fileName}`;
    const folderPath = path.join(this.localPath, folder);
    const filePath = path.join(folderPath, uniqueFileName);

    // Create folder if needed
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    logger.info(`Uploaded file to local storage: ${filePath}`);

    return {
      url: `/uploads/${folder}/${uniqueFileName}`,
      path: filePath,
      fileName: uniqueFileName,
      size: buffer.length,
    };
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    if (this.useLocal) {
      const fullPath = path.join(this.localPath, filePath.replace('/uploads/', ''));
      return fs.readFileSync(fullPath);
    }
    throw new Error('S3 not configured');
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.useLocal) {
      const fullPath = path.join(this.localPath, filePath.replace('/uploads/', ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger.info(`Deleted file: ${fullPath}`);
      }
    }
  }

  getLocalPath(filePath: string): string {
    return path.join(this.localPath, filePath.replace('/uploads/', ''));
  }
}

export default new StorageProvider();
