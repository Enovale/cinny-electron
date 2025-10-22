import {app, protocol, net, ipcMain, shell, BrowserWindow, nativeImage, Menu, Tray} from 'electron'
import {join} from 'path';
import {__dirname} from "./global.ts";
import {startQuickCSSWatch} from "./quickcss.ts";
import {FAVICON_CHANGED} from "./IpcEvents.ts";
import {Resvg} from "@resvg/resvg-js";
import {Conf} from 'electron-conf/main'
import {loadPlugins} from "./patchLoader.ts";

const configDefault = {
    enableQuickCSS: true,
    url: "https://app.cinny.in",
}

let config: Conf = null;
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
            preload: join(__dirname, 'preload.ts'),
        }
    });
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return {action: 'deny'}
    });
    mainWindow.on('close', (event) => {
        if (quitting) {
            app.quit()
        } else {
            event.preventDefault()
            mainWindow.hide()
        }
    });

    let url = getURL();

    protocol.handle("https", async req => {
        let originalResponse = net.fetch(req, { bypassCustomProtocolHandlers: true });
        // TODO: Make this check a little less specific to the way the config is set
        if (new URL(req.url).host === new URL(url).host) {
            let responseVal = await originalResponse;
            let responseStr = await responseVal.text();
            if (responseStr.match(/"Welcome to Cinny"/)) {
                responseStr = responseStr.replace(/"Homeserver"/g, "\"Patched yay!!!!!\"");
            }
            return new Response(responseStr, {
                headers: responseVal.headers,
                status: responseVal.status,
                statusText: responseVal.statusText,
            });
        } else {
            return originalResponse;
        }
    });

    mainWindow.loadURL(url)
        .then(url => {
            onReady()
        });

    if (!app.isPackaged)
        mainWindow.webContents.openDevTools();
}

const onReady = async () => {
    createTray();
    if (config.get("enableQuickCSS", configDefault.enableQuickCSS))
        startQuickCSSWatch();

    await loadPlugins();
}

const createTray = () => {
    tray = new Tray(join(__dirname, 'res/favicon.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "About",
            click: createAboutPage
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
        try {
            let data = decodeURIComponent(str.replace("data:image/svg+xml,", ""));
            let svg = new Resvg(data);
            let image = nativeImage.createFromBuffer(svg.render().asPng());
            tray.setImage(image);
            trayCache.set(str, image);
        } catch (e) {
            console.error(e);
            console.error(str);
        }
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

const getURL = () => {
    return (config.get("url", configDefault.url) as string) ?? "https://app.cinny.in";
}

const createAboutPage = () => {
    let about = new BrowserWindow({
        width: 800,
        height: 600,
        center: true,
        autoHideMenuBar: true,
        parent: mainWindow,
    });
    about.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return {action: 'deny'}
    });

    const data = new URLSearchParams({
        APP_VERSION: app.getVersion()
    });

    const view = join(__dirname, "static/about.html");
    const url = new URL(`file://${view}`);
    url.search = data.toString();
    about.loadURL(url.toString());
}

app.on('activate', () => {
    mainWindow.show()
});

app.whenReady().then(async () => {
    config = new Conf({
        name: "settings",
        defaults: configDefault
    })
    await createWindow();
});