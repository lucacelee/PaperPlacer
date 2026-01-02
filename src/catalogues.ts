import AdmZip from 'adm-zip';
import fs from 'fs';
import { db } from './db';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';

const maria = new db();

export async function processCatalogue (filepath: string) {
    var zip = new AdmZip(filepath);
    const folderpath = filepath.replace(extname(filepath), '');
    zip.extractAllTo(folderpath);

    await goThroughTheFiles(folderpath);
    fs.rmSync(folderpath, { recursive: true, force: true });
}

async function goThroughTheFiles(path: string) {
    const dir: fs.Dir = fs.opendirSync(path);

    const rootIndex = join(path, "index.csv")
    if (existsSync(rootIndex)) {
        await maria.importFile(rootIndex);
        fs.rmSync(rootIndex);
    } else return;

    let finished: boolean = false;
    while (!finished) {
        let directoryEntry: fs.Dirent | null = dir.readSync()
        if (directoryEntry == null) finished = true;
        else {
            if (directoryEntry.isDirectory()) {
                await goThroughTheFiles(join(path, directoryEntry.name))
            } else {
                if (extname(directoryEntry.name) == '.csv') await maria.importFile(join (path, directoryEntry.name));
            }
        }
    }
    dir.closeSync();
}