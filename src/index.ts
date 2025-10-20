import {app, shell, BrowserWindow, Menu, Tray} from 'electron'
import path from 'path';
import {__dirname} from "./global.ts";
import {startQuickCSSWatch} from "./quickcss.ts";
let quitting = false;
let tray: Tray = null
export let mainWindow: BrowserWindow = null;

const createWindow = () => {
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
        return { action: 'deny' }
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
        .then(url => {onReady()});
}

const onReady = () => {
    createTray()
    startQuickCSSWatch()
}

const createTray = () => {
    tray = new Tray(path.join(__dirname, 'res/favicon.png'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Quit', type: 'normal', click: () => {quitApp()}}
    ]);
    tray.setToolTip('This is my application.');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {toggleWindow()})
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

app.on('activate', () => { mainWindow.show() });

app.whenReady().then(() => {
    createWindow()
});