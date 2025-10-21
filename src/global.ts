import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import {app} from "electron";

export const dataDir =
    process.env.CINNY_USER_DATA_DIR || join(app.getPath("userData"));

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);