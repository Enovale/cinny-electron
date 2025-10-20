import {contextBridge} from 'electron/renderer';
import {ipcRenderer} from 'electron';
import {dirname, join} from 'path';
import {readFileSync, watch} from 'fs';
import {fileURLToPath} from "url";
import {FAVICON_CHANGED, QUICKCSS_CHANGED} from "./IpcEvents.ts";
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

let quickCssEvent = new Event("quickCssChanged");
let quickCssStyle = document.createElement("style");

document.onreadystatechange = async (event) => {
    if (document.readyState == "complete") {
        let injected = document.createElement("script");
        injected.innerHTML = readFileSync(join(__dirname, 'injected/index.ts')).toString();
        document.body.appendChild(injected);

        document.head.appendChild(quickCssStyle);

        ipcRenderer.on(QUICKCSS_CHANGED, (e, css) => {
            console.log("Quickcss Changed!: ", css);
            document.dispatchEvent(quickCssEvent);
            quickCssStyle.innerHTML = css;
        });

        let favicon = document.querySelector('#favicon') as HTMLLinkElement;
        let observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === "attributes") {
                    let newValue = (mutation.target as HTMLLinkElement).href;
                    if (!newValue.match(/\.(ico|svg|png|jpg)$/))
                        faviconChanged(newValue);
                }
            });
        });
        observer.observe(favicon, {
            attributes: true
        });
        faviconChanged(favicon.href);
    }
}

function faviconChanged(href: string) {
    ipcRenderer.send(FAVICON_CHANGED, href)
}