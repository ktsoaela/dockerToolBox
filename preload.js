// preload.js
const { contextBridge, ipcRenderer } = require('electron');

function runDockerCommand(action, containerId) {
    window.electronAPI.runDockerCommand(action, containerId)
        .then(output => console.log(`Docker command ${action} executed: ${output}`))
        .catch(error => console.error(`Error executing ${action}:`, error));
}

contextBridge.exposeInMainWorld('electronAPI', {
    getDockerPs: () => ipcRenderer.invoke('docker-ps'),
    runDockerCommand: (action, containerId) => ipcRenderer.invoke('run-docker-command', action, containerId),
    minimize: () => ipcRenderer.send('minimize'),
    close: () => ipcRenderer.send('close'),
});

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
})

