// main.js
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');const notifier = require('node-notifier');
const { exec } = require('child_process');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'assets/img/tool-box.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true // Turn off context isolation to access Node in renderer
        },
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();
}

function createToolbox() {
    toolboxWindow = new BrowserWindow({
        width: 450,
        height: 650,
        resizable: false,
        movable: true,
        alwaysOnTop: true,
        frame: false,
        show: false,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        },
       // Keep the toolbox always on top
    });

    toolboxWindow.loadFile('toolbox.html');
    
    toolboxWindow.on('move', () => {
        const { x, y } = toolboxWindow.getBounds();
        const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
        if (x < 0) toolboxWindow.setBounds({ x: 0 });
        if (y < 0) toolboxWindow.setBounds({ y: 0 });
        if (x + toolboxWindow.getBounds().width > width) toolboxWindow.setBounds({ x: width - toolboxWindow.getBounds().width });
        if (y + toolboxWindow.getBounds().height > height) toolboxWindow.setBounds({ y: height - toolboxWindow.getBounds().height });
    });
    
    // toolboxWindow.setPosition(mainWindow.getBounds().x + mainWindow.getBounds().width, mainWindow.getBounds().y);
    // mainWindow.webContents.openDevTools();
}

function createTray() {
    // Load tray icon image
    const iconPath = path.join(__dirname, 'assets/img/tool-box.png');
    tray = new Tray(nativeImage.createFromPath(iconPath));

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Toolbox', click: toggleToolbox },
        { label: 'Quit', click: () => app.quit() },
    ]);

    tray.setToolTip('My Electron Toolbox');
    tray.setContextMenu(contextMenu);

    // Show/hide toolbox on tray click
    tray.on('click', toggleToolbox);
}


function toggleToolbox() {
    if (toolboxWindow.isVisible()) {
        toolboxWindow.hide();
    } else {
        // Position the toolbox near the tray
        const trayBounds = tray.getBounds();
        const windowBounds = toolboxWindow.getBounds();

        // Position window below the tray icon
        const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
        const y = Math.round(trayBounds.y + trayBounds.height);

        toolboxWindow.setPosition(x, y, false);
        toolboxWindow.show();
        toolboxWindow.focus();
    }
}


app.on('ready', () => {
    createWindow();
    createToolbox();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

ipcMain.handle('run-docker-command', async (event, action, containerId) => {
    return new Promise((resolve, reject) => {
        let command;
        switch (action) {
            case 'start':
                command = `docker start ${containerId}`;
                console.log(`starting ${containerId}`);
                break;
            case 'stop':
                command = `docker stop ${containerId}`;
                console.log(`stopping ${containerId}`);
                break;
            case 'restart':
                command = `docker restart ${containerId}`;
                console.log(`restarting ${containerId}`);
                break;
            case 'remove':
                command = `docker rm ${containerId}`;
                console.log(`removing ${containerId}`);
                break;
            case 'logs':
                command = `docker logs ${containerId}`;
                console.log(`showing logs for ${containerId}`);
                break;
            case 'tailedLogs':
                command = `docker logs -f ${containerId}`;
                console.log(`showing tailed logs for ${containerId}`);
                break;
            case 'always_on':
                const isAlwaysOn = containerId.alwaysOn; // Assuming you track this state
                command = isAlwaysOn ?
                    `docker update --restart no ${containerId}` :
                    `docker update --restart unless-stopped ${containerId}`;
                console.log(`Setting ${containerId} restart policy`);
                break;
            case 'remove_always_on':
                command = `docker update --restart no ${containerId}`;
                console.log(`removing always on from ${containerId}`);
                break;
            case 'prune':
                command = `docker system prune -a`;
                console.log(`system pruning docker`);
                break;
            default:
                reject('Unknown action');
                return;
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
                return;
            }
            resolve(stdout.trim());
        });
    });
});


const getRestartPolicy = (containerId) => {
    return new Promise((resolve, reject) => {
        exec(`docker inspect ${containerId} --format '{{.HostConfig.RestartPolicy.Name}}'`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error inspecting container ${containerId}:`, stderr);
                reject(stderr);
                return;
            }
            resolve(stdout.trim()); // Return the restart policy
        });
    });
};

ipcMain.handle('docker-ps', async () => {
    return new Promise((resolve, reject) => {
        exec('docker ps -a --format "{{.ID}}|{{.Image}}|{{.Status}}|{{.CreatedAt}}"', async (error, stdout, stderr) => {
            if (error) {
                console.error("Error executing docker ps:", stderr);
                reject(stderr);
                return;
            }

            // Process the output into an array of container data
            const containerPromises = stdout.trim().split('\n').map(async (line) => {
                const [id, image, status, createdAt] = line.split('|');

                // Fetch restartPolicy for each container
                let restartPolicy;
                try {
                    restartPolicy = await getRestartPolicy(id);
                } catch (err) {
                    restartPolicy = "Error fetching restart policy"; // Handle any error gracefully
                }

                return { id, image, status, createdAt, restartPolicy };
            });

            try {
                const containers = await Promise.all(containerPromises);
                console.log("Docker Containers:", containers);
                resolve(containers);
            } catch (error) {
                console.error("Error processing container data:", error);
                reject(error);
            }
        });
    });
});

function openTerminalWithLogs(containerId) {
    const os = require('os');
    let command;

    if (os.platform() === 'win32') {
        command = `start cmd /k "docker logs -f ${containerId}"`;
    } else if (os.platform() === 'linux') {
        command = `gnome-terminal -- docker logs -f ${containerId}`;
    } else if (os.platform() === 'darwin') {
        command = `osascript -e 'tell application "Terminal" to do script "docker logs -f ${containerId}"'`;
    }

    exec(command, (error) => {
        if (error) {
            console.error(`Error opening terminal for logs: ${error}`);
        }
    });
}


ipcMain.on('minimize', (event) => {
    mainWindow.minimize();
    toolboxWindow.minimize();
});

ipcMain.on('close', (event) => {
    app.quit();
});

ipcMain.on('blur', () => {
    toolboxWindow.hide();
});

ipcMain.on('notify', (event, { title, message }) => {
    notifier.notify({
        title: title || 'Default Title',
        message: message || 'Default Message',
        sound: true,
        wait: true, // Wait for user action
        timeout: 10, // Optional: wait 10 seconds before closing
        icon: path.join(__dirname, 'icon.png'), // Optional icon path
        timeout: 5, // Optional timeout (in seconds)
    });
});


ipcMain.on('notify', (event, { title, message }) => {
    notifier.notify({
        title: title,
        message: message,
        sound: true, // Only Notification Center or Windows Toasters
        wait: true, // Wait with callback until user action is taken on notification
        icon: path.join(__dirname, 'icon.png'), // Optional icon path
        timeout: 5, // Optional timeout (in seconds)
    });
});
