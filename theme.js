window.electron.receive('theme', (theme) => {
    const themeStylesheet = document.getElementById('theme-stylesheet');
    if (theme === 'dark') {
        themeStylesheet.href = 'styles-dark.css'; // Link to your dark mode CSS
        document.body.classList.add('bg-dark', 'text-light'); // Optional Bootstrap classes
    } else {
        themeStylesheet.href = 'styles-light.css'; // Link to your light mode CSS
        document.body.classList.remove('bg-dark', 'text-light'); // Optional Bootstrap classes
    }
});

window.electron.send('get-theme');