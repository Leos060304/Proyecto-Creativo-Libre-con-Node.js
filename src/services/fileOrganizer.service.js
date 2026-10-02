const fs = require('fs/promises');
const path = require('path');

class FileOrganizerService {
  constructor() {
    this.baseStorage = path.join(__dirname, '../../storage/organized');
  }

  async organizeFile(tempPath, originalName, dateString) {
    const date = dateString ? new Date(dateString) : new Date();
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const targetDir = path.join(this.baseStorage, year, month);
    await fs.mkdir(targetDir, { recursive: true });

    const ext = path.extname(originalName);
    const sanitizedBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const newFileName = `${Date.now()}_${sanitizedBase}${ext}`;
    const targetPath = path.join(targetDir, newFileName);

    await fs.rename(tempPath, targetPath);
    return targetPath;
  }
}

module.exports = new FileOrganizerService();