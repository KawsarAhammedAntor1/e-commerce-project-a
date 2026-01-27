// Smart API Configuration
// Automatically detects if running on Localhost, Local Network, or Production VPS

(function () {
    let serverUrl = '';

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // 1. File System Check (Fixes "System Error" when opening default html files)
    // 1. File System Check (Fixes "System Error" when opening default html files)
    if (protocol === 'file:') {
        // Default to local backend when opening files directly
        serverUrl = (typeof process !== 'undefined' && process.env.BASE_URL) ? process.env.BASE_URL : 'https://e-commerce-project-3-d3a1.onrender.com';
    }
    // 2. Localhost
    else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        serverUrl = (typeof process !== 'undefined' && process.env.BASE_URL) ? process.env.BASE_URL : 'https://e-commerce-project-3-d3a1.onrender.com';
    }
    // 3. Local Network / Mobile (Android)
    // If accessing via 192.168.x.x, assume backend is on same IP :5000
    else if (hostname.startsWith('192.168.')) {
        serverUrl = `http://${hostname}:5000`;
    }
    // 4. Production
    else {
        serverUrl = 'https://e-commerce-project-3-d3a1.onrender.com';
    }

    // Define API Base URL
    const apiBaseUrl = `${serverUrl}/api`;

    // Expose Global Variables
    window.SERVER_URL = serverUrl;
    window.API_BASE_URL = apiBaseUrl;
    window.API_BASEURL = apiBaseUrl;

    console.log(`[Config] Environment: ${protocol === 'file:' ? 'File System' : hostname}`);
    console.log(`[Config] API Endpoint: ${apiBaseUrl}`);
})();