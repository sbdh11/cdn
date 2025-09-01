const { createServer } = require('http');
const { port } = require('./src/config');

const app = require('./src/app');

const server = createServer(app);

server.listen(port, () => {
	console.log('Website is acitve on http://localhost:' + port);
});