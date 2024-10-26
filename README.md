
# Docker Toolbox


**Docker Toolbox** 
<i>Simplifying container management for developers and system administrators.</i>

**Docker Toolbox is a lightweight Electron-based tool that provides an intuitive user interface for managing Docker containers. It offers real-time container status updates, controls for starting/stopping containers, and additional features like container search, logs display, dark mode toggle, and more.**

## Features

- **Dashboard Overview**: Get an at-a-glance view of all your Docker containers, categorized by status (Running, All, Dead, Always-On).
- **Search Functionality**: Quickly find Docker containers using a search input to filter by container names or details.
- **Container Management**:
  - Start, stop, or restart individual containers.
  - View container logs in real-time.
  - Toggle the "Always On" feature to ensure critical containers are always running (`restart-policy: unless-stopped`).
- **Batch Restart**: Restart all containers in a specific tab (Running, Dead, All, Always-On).
- **Dark Mode Toggle**: Switch between light and dark themes with a persistent setting stored locally.
- **Terminal Integration**: Open container logs in a system terminal window for detailed monitoring.
- **Minimal UI Controls**: Minimize or close the application window directly from the UI (for Electron environments).

## Getting Started

### Prerequisites

Before you can run the Docker Toolbox, ensure you have the following installed:

- [Docker](https://www.docker.com/get-started) (version 19.x or newer)
- [Node.js](https://nodejs.org/en/download/) (version 14.x or newer)
- [Electron](https://www.electronjs.org/) (for running the desktop app)

### Installation

1. **Clone the Repository**:
   ```bash
   git clone git@github.com:ktsoaela/dockerToolBox.git
   cd docker-toolbox
   ```

2. **Install Dependencies**:
   Install the necessary Node.js packages using npm or yarn:
   ```bash
   npm install
   ```

3. **Run the App**:
   Start the Electron app:
   ```bash
   npm start
   ```

### Usage

Once the application is running, you can:

- **View containers**: The default view shows running containers. You can navigate through tabs to see all containers, dead containers, or containers marked as always-on.
- **Search for containers**: Click the search icon in the top-right to filter containers by name or other details.
- **Control containers**: Use the dropdown menu next to each container to restart, stop, or view logs. You can also toggle the always-on status directly from the dropdown.
- **Batch restart**: On any tab (Running, All, Dead, Always-On), click the "Restart All" button to restart all containers in that category.
- **Dark mode**: Use the theme toggle button in the top-right corner to switch between light and dark modes. The setting will persist across sessions.

### Electron API Integration

The toolbox uses `window.electronAPI` to interact with Docker. This is an Electron-specific feature that enables direct communication with Docker commands through Electron's main process.

- **runDockerCommand(action, containerId)**: Executes Docker actions like `restart`, `stop`, or `tailedLogs`.
- **getDockerPs()**: Fetches the current list of Docker containers and their statuses.

### Key Scripts

The core functionality of the Docker Toolbox is powered by several key JavaScript functions:

- `loadDockerData()`: Loads all Docker containers and dynamically updates the dashboard UI with counts and statuses.
- `toggleAlwaysOn(containerId, element)`: Toggles the restart policy of a container to ensure it stays "Always On."
- `restartAllContainers()`: Restarts all containers shown in the current tab.
- `showLogs(containerId)`: Displays logs for the selected container in a terminal window.

### Known Issues

- **Platform Compatibility**: The tool uses `gnome-terminal` to display container logs, which is currently tailored for Linux systems. For Windows or macOS, additional adjustments to the `openTerminalWithLogs` function may be required.

### Future Improvements

- **Container Metrics**: Add real-time container resource metrics (CPU, Memory, etc.).
- **Enhanced Error Handling**: Improve error messages and user feedback for Docker command failures.
- **Multi-platform Terminal Support**: Expand terminal integration for container logs to work across different operating systems.



### Shout Out
- **Logo**: [Credit to Phot3idea_studio for the Logo](https://www.flaticon.com/free-icons/toolbox)


## Contributing

We welcome contributions! If you have suggestions for new features or improvements, feel free to submit a pull request.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/new-feature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/new-feature`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
