import {readFileSync, watch} from "fs";
import {dataDir} from "./global.ts";
import {join} from "path";
import {mainWindow} from "./index.ts";
import {QUICKCSS_CHANGED} from "./IpcEvents.ts";

const filePath = join(dataDir, "quickCSS.css");

export function startQuickCSSWatch() {
    console.log("Starting quickcss");
    watch(filePath, watchCallback);
    watchCallback(null);
}

function watchCallback(e) {
    console.log("quickcss access: ", e);
    mainWindow.webContents.send(QUICKCSS_CHANGED, readFileSync(filePath).toString());
}