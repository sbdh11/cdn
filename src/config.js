const path = require('path');
const fs = require('fs');

let fileCfg = {};
try {
	const p = path.join(__dirname, '..', 'config.json');
	if (fs.existsSync(p)) {
		fileCfg = JSON.parse(fs.readFileSync(p, 'utf8')) || {};
	}
} catch (_) {}

function toInt(v, def) {
	const n = parseInt(v, 10);
	return Number.isFinite(n) ? n : def;
}

const port = toInt(process.env.PORT || fileCfg.port || 8000, 8000);

module.exports = { port }; 