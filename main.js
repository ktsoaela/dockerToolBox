// main.js
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeTheme, nativeImage, Notification } = require('electron');const notifier = require('node-notifier');
const { exec } = require('child_process');
const path = require('path');
const os = require('os');

let toolboxWindow;
let tray;

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
    
    const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    toolboxWindow.setPosition(Math.round((width - toolboxWindow.getBounds().width) / 2), Math.round((height - toolboxWindow.getBounds().height) / 2));
    // toolboxWindow.setPosition(mainWindow.getBounds().x + mainWindow.getBounds().width, mainWindow.getBounds().y);
    // mainWindow.webContents.openDevTools();
}

function createTray() {
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

ipcMain.on('theme-changed', (event, theme) => {
    nativeTheme.themeSource = theme; // Change theme source
   
});

app.on('ready', () => {
  
    createToolbox();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createToolbox(); 
        }
    });
});

function openTerminalWithLogs(containerId) {
    let command;

    if (os.platform() === 'win32') {
        command = `start cmd /k "docker logs -f ${containerId}"`;
    } else if (os.platform() === 'linux') {
        command = `gnome-terminal -- docker logs -f ${containerId}`;
    } else if (os.platform() === 'darwin') {
        command = `osascript -e 'tell application "Terminal" to do script "docker logs -f ${containerId}"'`;
    } else {
        console.error('Unsupported operating system for opening terminal');
        return;
    }

    exec(command, (error) => {
        if (error) {
            console.error(`Error opening terminal for logs: ${error}`);
        }
    });
}

function openShellInContainer(containerId) {
    let command;

    if (os.platform() === 'win32') {
        command = `start cmd /k "docker exec -it ${containerId} /bin/bash"`;
    } else if (os.platform() === 'linux') {
        command = `gnome-terminal -- docker exec -it ${containerId} /bin/bash`;
    } else if (os.platform() === 'darwin') {
        command = `osascript -e 'tell application "Terminal" to do script "docker exec -it ${containerId} /bin/bash"'`;
    } else {
        console.error('Unsupported operating system for opening shell');
        return;
    }

    exec(command, (error) => {
        if (error) {
            console.error(`Error opening shell for container: ${error}`);
        }
    });
}


function openProjectFolder(containerId) {
    return new Promise((resolve, reject) => {
        // Get the project folder path based on containerId
        getProjectFolder(containerId)
            .then((projectFolderPath) => {
                let command;
                const platform = os.platform();

                if (platform === 'linux') {
                    command = `xdg-open ${projectFolderPath}`;
                    console.log(`Opening project folder for container ${containerId} on Linux`);
                } else if (platform === 'darwin') {
                    command = `open ${projectFolderPath}`;
                    console.log(`Opening project folder for container ${containerId} on macOS`);
                } else if (platform === 'win32') {
                    command = `explorer.exe "${projectFolderPath}"`;
                    console.log(`Opening project folder for container ${containerId} on Windows`);
                } else {
                    console.error('Unsupported operating system for folder command');
                    reject('Unsupported operating system');
                    return;
                }

                exec(command, (error) => {
                    if (error) {
                        console.error(`Error opening project folder: ${error}`);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            })
            .catch(reject);
    });
}

function getProjectFolder(containerId) {
    return new Promise((resolve, reject) => {
        exec(`docker inspect ${containerId}`, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
                return;
            }
            const containerInfo = JSON.parse(stdout);
            const mounts = containerInfo[0].Mounts;
            if (mounts.length > 0) {
                // Assuming you want the first mount's source path
                const projectFolder = mounts[0].Source;
                resolve(projectFolder);
            } else {
                reject('No volumes mounted for this container');
            }
        });
    });
}


ipcMain.handle('run-docker-command', async (event, action, containerId) => {
    return new Promise((resolve, reject) => {
        let command;
        switch (action) {
            case 'start':
                command = `docker start ${containerId}`;
                console.log(`Starting ${containerId}`);
                showNotification('Container Starting', `Container ${containerId} is being started`);
                break;
            case 'stop':
                command = `docker stop ${containerId}`;
                console.log(`Stopping ${containerId}`);
                showNotification('Container Stopping', `Container ${containerId} is being stopped`);
                break;
            case 'restart':
                command = `docker restart ${containerId}`;
                console.log(`Restarting ${containerId}`);
                showNotification('Container Restarting', `Container ${containerId} is being restarted`);
                break;
            case 'remove':
                command = `docker rm ${containerId}`;
                console.log(`Removing ${containerId}`);
                showNotification('Container Removed', `Container ${containerId} has been removed`);
                break;
            case 'logs':
                command = `docker logs ${containerId}`;
                console.log(`Showing logs for ${containerId}`);
                showNotification('Fetching Logs', `Showing logs for ${containerId}`);
                break;
            case 'tailedLogs':
                openTerminalWithLogs(containerId);
                return;
            case 'always_on':
                const isAlwaysOn = containerId.alwaysOn;
                command = isAlwaysOn ?
                    `docker update --restart no ${containerId}` :
                    `docker update --restart unless-stopped ${containerId}`;
                console.log(`Setting ${containerId} restart policy`);
                break;
            case 'remove_always_on':
                command = `docker update --restart no ${containerId}`;
                console.log(`Removing always on from ${containerId}`);
                break;
            case 'prune':
                command = `docker system prune -a`;
                console.log(`System pruning docker`);
                break;
            case 'shell':
                openShellInContainer(containerId); 
                return;
            case 'folder':
                openProjectFolder(containerId)
                    .then(() => resolve())
                    .catch((err) => reject(err));
                return; 
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

// Add this in your main process
ipcMain.handle('get-container-details', async (event, containerId) => {
    try {
        const containers = await dockerPs(); // Assuming this fetches all containers
        const containerDetails = containers.find(container => container.id === containerId);
        return containerDetails || null; // Return found details or null if not found
    } catch (error) {
        console.error(`Error getting container details for ${containerId}:`, error);
        throw error;
    }
});

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

ipcMain.handle('run-container-command', async (event, containerId, command) => {
    return new Promise((resolve, reject) => {
        exec(`docker exec ${containerId} ${command}`, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
                return;
            }
            resolve(stdout.trim());
        });
    });
});


ipcMain.on('minimize', (event) => {
    toolboxWindow.minimize();
});

ipcMain.on('close', (event) => {
    app.quit();
});

ipcMain.on('blur', () => {
    toolboxWindow.hide();
});


function showNotification(title, message) {
    new Notification({
        title: title,
        body: message,
        icon: path.join(__dirname, 'assets/img/tool-box.png') // Optional: path to notification icon
    }).show();
}