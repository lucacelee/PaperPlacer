"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCatalogue = processCatalogue;
const adm_zip_1 = __importDefault(require("adm-zip"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./db");
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const maria = new db_1.db();
async function processCatalogue(filepath) {
    var zip = new adm_zip_1.default(filepath);
    const folderpath = filepath.replace((0, node_path_1.extname)(filepath), '');
    zip.extractAllTo(folderpath);
    await goThroughTheFiles(folderpath);
    fs_1.default.rmSync(folderpath, { recursive: true, force: true });
}
async function goThroughTheFiles(path) {
    const dir = fs_1.default.opendirSync(path);
    const rootIndex = (0, node_path_1.join)(path, "index.csv");
    if ((0, node_fs_1.existsSync)(rootIndex)) {
        await maria.importFile(rootIndex);
        fs_1.default.rmSync(rootIndex);
    }
    else
        return;
    let finished = false;
    while (!finished) {
        let directoryEntry = dir.readSync();
        if (directoryEntry == null)
            finished = true;
        else {
            if (directoryEntry.isDirectory()) {
                await goThroughTheFiles((0, node_path_1.join)(path, directoryEntry.name));
            }
            else {
                if ((0, node_path_1.extname)(directoryEntry.name) == '.csv')
                    await maria.importFile((0, node_path_1.join)(path, directoryEntry.name));
            }
        }
    }
    dir.closeSync();
}
//# sourceMappingURL=catalogues.js.map