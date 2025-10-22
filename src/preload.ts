import {contextBridge} from 'electron/renderer';
import {ipcRenderer} from 'electron';
import {FAVICON_CHANGED, QUICKCSS_CHANGED} from "./IpcEvents.ts";

let quickCssEvent = new Event("quickCssChanged");
let quickCssStyle = document.createElement("style");

document.onreadystatechange = async (event) => {
    if (document.readyState == "complete") {
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
    if (!href.match(/\.(ico|svg|png|jpg)$/))
        ipcRenderer.send(FAVICON_CHANGED, href)
}