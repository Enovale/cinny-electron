import * as fs from 'fs/promises';
import {join} from "path";
import {__dirname} from "./global.ts";

export const pluginList = [];

export function replaceRegex(match: RegExp) {
    return new RegExp(match.source.replace(/\\i/g, "[A-Za-z_$]{1,3}[\\w$]*"), match.flags);
}

export async function loadPlugins() {
    let files = await fs.readdir(join(__dirname, 'patches/'), {
        recursive: true,
        withFileTypes: true
    });
    for (const file of files) {
        if (file.name.endsWith(".js") || file.name.endsWith(".ts")) {
            try {
                const url = `file://` + file.parentPath + file.name;

                const module = await import(url);

                console.log(module);
                pluginList.push(module);
            } catch (e) {
                console.error(`Failed to import ${file.name}: ${e}`);
            }
        }
    }
    console.log(files);
}