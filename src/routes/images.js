const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const Photo = require('../../db');

const router = express.Router();

const imageDir = path.join(__dirname, '..', '..', 'images');
if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });

const saltRounds = 10;
const supportedFiletypes = ['image/gif', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({ destination: imageDir });
const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024, files: 12 },
	fileFilter: function (req, file, callback) {
		if (supportedFiletypes.indexOf(file.mimetype) < 0) {
			if (!req.skippedFiles) req.skippedFiles = [file.originalname];
			else req.skippedFiles.push(file.originalname);
			return callback(null, false);
		}
		callback(null, true);
	}
});

// List images with pagination
router.get('/', async function (req, res) {
	try {
		const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
		const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
		const [items, total] = await Promise.all([
			Photo.findAll({ limit, offset }),
			Photo.count()
		]);
		res.send({ total, limit, offset, items: items.map(p => ({ id: p.id, extn: p.extn })) });
	} catch (e) {
		console.log(e);
		res.status(500).send({ status: 'err' });
	}
});

// Upload endpoint
router.post('/add', upload.array('photos'), async function (req, res) {
	const response = { files: [] };
	for (let file of req.files) {
		const pic = new Photo();
		const id = crypto.randomBytes(8).toString('hex');
		const deletionPassword = crypto.randomBytes(12).toString('hex');
		pic.id = id;
		pic.extn = file.mimetype.split('/')[1];
		pic.deletionPassword = await bcrypt.hash(deletionPassword, saltRounds);
		fs.renameSync(path.join(imageDir, file.filename), path.join(imageDir, pic.filename()));
		await pic.save();
		response.files.push({ filename: file.originalname, status: 'Uploaded', id, deletionPassword });
	}
	if (req.skippedFiles) {
		for (let filename of req.skippedFiles) response.files.push({ filename, status: 'error', err: 'badextension' });
	}
	res.send(response);
});

// Bulk delete
router.post('/delete', async function (req, res) {
	if (!req.body || !req.body.files) return res.status(400).send({ status: 'err', error: 'noinput' });
	const response = { files: [] };
	const tasks = (req.body.files || []).map(async ({ id, password }) => {
		if (!id) return;
		if (!password) { response.files.push({ id, status: 'err', error: 'nopasswd' }); return; }
		try {
			const photo = await Photo.findOne({ id });
			if (!photo) { response.files.push({ id, status: 'err', error: 'badid' }); return; }
			const valid = await bcrypt.compare(password, photo.deletionPassword);
			if (!valid) { response.files.push({ id, status: 'err', error: 'badpasswd' }); return; }
			const filename = photo.filename();
			await photo.remove();
			try { fs.unlinkSync(path.join(imageDir, filename)); } catch (e) {}
			response.files.push({ id, status: 'Deleted' });
		} catch (e) {
			response.files.push({ id, status: 'err', error: 'fail' });
		}
	});
	await Promise.all(tasks);
	res.send(response);
});

// Single delete
router.delete('/:id', async function (req, res) {
	const id = req.params.id;
	const password = (req.body && req.body.password) || '';
	if (!password) return res.status(400).send({ status: 'err', error: 'nopasswd' });
	try {
		const photo = await Photo.findOne({ id });
		if (!photo) return res.status(404).send({ status: 'err', error: 'badid' });
		const valid = await bcrypt.compare(password, photo.deletionPassword);
		if (!valid) return res.status(403).send({ status: 'err', error: 'badpasswd' });
		const filename = photo.filename();
		await photo.remove();
		try { fs.unlinkSync(path.join(imageDir, filename)); } catch (e) {}
		res.send({ status: 'Deleted', id });
	} catch (e) {
		console.log(e);
		res.status(500).send({ status: 'err' });
	}
});

// Metadata
router.get('/:id/meta', async function (req, res) {
	try {
		const photo = await Photo.findOne({ id: req.params.id });
		if (!photo) return res.sendStatus(404);
		const filepath = path.join(imageDir, photo.filename());
		let size = null; let mtime = null;
		try { const st = fs.statSync(filepath); size = st.size; mtime = st.mtime; } catch (e) {}
		res.send({ id: photo.id, extn: photo.extn, size, modifiedAt: mtime });
	} catch (e) {
		console.log(e);
		res.status(500).send({ status: 'err' });
	}
});

// HEAD exists
router.head('/:id', async function (req, res) {
	try {
		const photo = await Photo.findOne({ id: req.params.id });
		if (!photo) return res.sendStatus(404);
		const filepath = path.join(imageDir, photo.filename());
		if (!fs.existsSync(filepath)) return res.sendStatus(404);
		res.setHeader('Content-Type', 'image/' + photo.extn);
		return res.sendStatus(200);
	} catch (e) { return res.sendStatus(500); }
});

// Serve image file
router.get('/:id', async function (req, res) {
	try {
		const pic = await Photo.findOne({ id: req.params.id });
		if (!pic) return res.sendStatus(404);
		res.sendFile(path.join(imageDir, pic.filename()), function (err) { if (err) res.sendStatus(404); });
	} catch (e) {
		console.log(e);
		res.sendStatus(500);
	}
});

module.exports = router; 