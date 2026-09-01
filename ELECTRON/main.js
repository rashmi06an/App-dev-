// const { app, BrowserWindow } = require("electron");
// const path = require("path");

// function createWindow() {
//   const win = new BrowserWindow({
//     width: 500,
//     height: 400,
//     webPreferences: {
//       contextIsolation: true,
//       nodeIntegration: false
//     }
//   });

//   win.loadFile(path.join(__dirname, "index.html"));
// }

// app.whenReady().then(() => {
//   createWindow();

//   app.on("activate", () => {
//     if (BrowserWindow.getAllWindows().length === 0) createWindow();
//   });
// });

// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });

const { app, BrowserWindow } = require("electron");

function createWindow() {
    const win = new BrowserWindow({
        width: 500,
        height: 400
    });

    win.loadFile("index.html");
    win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

