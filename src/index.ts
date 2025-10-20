import {app, ipcMain, shell, BrowserWindow, nativeImage, Menu, Tray} from 'electron'
import path from 'path';
import {__dirname} from "./global.ts";
import {startQuickCSSWatch} from "./quickcss.ts";
import {FAVICON_CHANGED} from "./IpcEvents.ts";
import { Resvg } from "@resvg/resvg-js";

let quitting = false;
let tray: Tray = null
let trayCache: Map<string, Electron.NativeImage> = new Map();
export let mainWindow: BrowserWindow = null;

const createWindow = async () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
            sandbox: false,
            spellcheck: true,
            preload: path.join(__dirname, 'preload.ts'),
        }
    });
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return {action: 'deny'}
    })
    mainWindow.on('close', (event) => {
        if (quitting) {
            app.quit()
        } else {
            event.preventDefault()
            mainWindow.hide()
        }
    });

    mainWindow.loadURL('https://app.cinny.in')
        .then(url => {
            onReady()
        });

    if (!app.isPackaged)
        mainWindow.webContents.openDevTools();
}

const onReady = () => {
    createTray()
    startQuickCSSWatch()
}

const createTray = () => {
    tray = new Tray(path.join(__dirname, 'res/favicon.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "About",
            click() {
                // createAboutPage
            }
        },
        {
            type: "separator"
        },
        {
            label: "Restart",
            click() {
                app.relaunch();
                app.quit();
            }
        },
        {
            label: 'Quit', type: 'normal', click: () => {
                quitApp()
            }
        }
    ]);
    tray.setToolTip('Cinny Electron.');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        toggleWindow()
    })
    ipcMain.on(FAVICON_CHANGED, (e, args) => {
        let str = args as string;
        if (trayCache.has(str)) {
            console.log("Favicon cache hit!");
            tray.setImage(trayCache.get(str));
            return;
        }
        console.log("Favicon cache miss!");
        let data = decodeURIComponent(str.replace("data:image/svg+xml,", ""));
        let svg = new Resvg(data);
        let image = nativeImage.createFromBuffer(svg.render().asPng());
        tray.setImage(image);
        trayCache.set(str, image);
    })
}

const toggleWindow = () => {
    if (mainWindow.isVisible())
        mainWindow.hide()
    else
        mainWindow.show()
}

const quitApp = () => {
    quitting = true;
    if (mainWindow)
        mainWindow.close()

    app.quit()
}

app.on('activate', () => {
    mainWindow.show()
});

app.whenReady().then(async () => {
    await createWindow()
});