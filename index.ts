import WebServer from '@blockless/sdk-ts/dist/lib/web';

const server = new WebServer();

// Serve static files from the public directory
server.statics('public', '/');

// Start the server
server.start();