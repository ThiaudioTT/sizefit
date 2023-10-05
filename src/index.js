const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');
const resizeImg = require('resize-img');

const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
let aboutWindow;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// menu template
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: () => createAboutWindow(),
              accelerator: "CmdOrCtrl+a",
            },
          ],
        },
      ]
    : []),
  {
    // label: 'File',
    // submenu: [
    //   {
    //     label: 'Quit',
    //     click: () => app.quit(),
    //     accelerator: 'CmdOrCtrl+w'
    //   }
    // ]
    role: "fileMenu",
  },
  ...(!isMac
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: () => createAboutWindow(),
              accelerator: "CmdOrCtrl+a",
            },
          ],
        },
      ]
    : []),
];

const createMainWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: isDev ? 1000 : 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));

  // Open the DevTools if in development mode.
  if(isDev) mainWindow.webContents.openDevTools();


  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // Remove variable from memory
  mainWindow.on('closed', () => (mainWindow = null));
};


function createAboutWindow() {
  // Create the browser window.
  aboutWindow = new BrowserWindow({
    title: "About SizeFit",
    width: 300,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));

  // Remove variable from memory
  aboutWindow.on('closed', () => (aboutWindow = null));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createMainWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.


ipcMain.on('image:resize', (e, options) => {
  options.dest = path.join(os.homedir(), 'imageresizer');
  resizeImage(options);
})

async function resizeImage({imgPath, width, height, dest}) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height,
    });

    // create filename
    const filename  = path.basename(imgPath);

    // create dest folder if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    // write file to dest
    fs.writeFileSync(path.join(dest, filename), newPath);

    // send done message to renderer
    mainWindow.webContents.send('image:done');

    // open dest folder
    shell.openPath(dest);
  } catch (error) {
    console.log(error)

  }

};