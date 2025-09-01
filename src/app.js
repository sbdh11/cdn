const express = require('express');
const path = require('path');
const fs = require('fs');
const imagesRouter = require('./routes/images');

const app = express();

// Static assets
app.use(express.static(path.join(__dirname, '..', 'static')));

// Parsers
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', function (req, res) {
	res.send({ status: 'ok' });
});

// API routes
app.use('/images', imagesRouter);

// Fallback 404 for API
app.use(function (_req, res, _next) {
	res.status(404).send({ status: 'err', error: 'notfound' });
});

module.exports = app; 