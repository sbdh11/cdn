const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Photo = require("../../db");

const router = express.Router();

const imageDir = path.join(__dirname, "..", "..", "images");
if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });

const supportedFiletypes = [
	"image/gif",
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
];

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
	},
});

// List images with pagination
router.get("/", async function (req, res) {
	try {
		const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
		const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
		const [items, total] = await Promise.all([
			Photo.findAll({ limit, offset }),
			Photo.count(),
		]);
		res.send({
			total,
			limit,
			offset,
			items: items.map((p) => ({ id: p.id, extn: p.extn })),
		});
	} catch (e) {
		console.log(e);
		res.status(500).send({ status: "err" });
	}
});

// Upload endpoint
router.post("/add", upload.array("photos"), async function (req, res) {
	const response = { files: [] };
	for (let file of req.files) {
		const pic = new Photo();
		const id = crypto.randomBytes(8).toString("hex");
		pic.id = id;
		pic.extn = file.mimetype.split("/")[1];
		fs.renameSync(
			path.join(imageDir, file.filename),
			path.join(imageDir, pic.filename()),
		);
		await pic.save();
		response.files.push({
			filename: file.originalname,
			status: "Uploaded",
			id,
		});
	}
	if (req.skippedFiles) {
		for (let filename of req.skippedFiles)
			response.files.push({ filename, status: "error", err: "badextension" });
	}
	res.send(response);
});

// Metadata
router.get("/:id/meta", async function (req, res) {
	try {
		const photo = await Photo.findOne({ id: req.params.id });
		if (!photo) return res.sendStatus(404);
		const filepath = path.join(imageDir, photo.filename());
		let size = null;
		let mtime = null;
		try {
			const st = fs.statSync(filepath);
			size = st.size;
			mtime = st.mtime;
		} catch (e) {}
		res.send({ id: photo.id, extn: photo.extn, size, modifiedAt: mtime });
	} catch (e) {
		console.log(e);
		res.status(500).send({ status: "err" });
	}
});

// HEAD exists
router.head("/:id", async function (req, res) {
	try {
		const photo = await Photo.findOne({ id: req.params.id });
		if (!photo) return res.sendStatus(404);
		const filepath = path.join(imageDir, photo.filename());
		if (!fs.existsSync(filepath)) return res.sendStatus(404);
		res.setHeader("Content-Type", "image/" + photo.extn);
		return res.sendStatus(200);
	} catch (e) {
		return res.sendStatus(500);
	}
});

// HTML page for image embedding (for Discord, etc.) - Image only
router.get("/:id/embed", async function (req, res) {
	try {
		const photo = await Photo.findOne({ id: req.params.id });
		if (!photo) return res.sendStatus(404);

		const filepath = path.join(imageDir, photo.filename());
		if (!fs.existsSync(filepath)) return res.sendStatus(404);

		const imageUrl = `${req.protocol}://${req.get("host")}/images/${photo.id}`;

		const html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Image ${photo.id}</title>

	<meta property="og:type" content="website">
	<meta property="og:url" content="${imageUrl}">
	<meta property="og:title" content="Image ${photo.id}">
	<meta property="og:image" content="${imageUrl}">
	<meta property="og:image:width" content="1200">
	<meta property="og:image:height" content="630">
	<meta property="og:image:type" content="image/${photo.extn}">

	<meta property="twitter:card" content="summary_large_image">
	<meta property="twitter:url" content="${imageUrl}">
	<meta property="twitter:title" content="Image ${photo.id}">
	<meta property="twitter:image" content="${imageUrl}">


	<meta property="og:site_name" content="Picture Vault">
	<meta property="og:image:alt" content="Image ${photo.id}">

	<style>
		body {
			margin: 0;
			padding: 0;
			background: #000;
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 100vh;
		}
		img {
			max-width: 100%;
			max-height: 100vh;
			height: auto;
			object-fit: contain;
		}
	</style>
</head>
<body>
	<img src="${imageUrl}" alt="Image ${photo.id}" />
</body>
</html>`;

		res.setHeader("Content-Type", "text/html");
		res.send(html);
	} catch (e) {
		console.log(e);
		res.sendStatus(500);
	}
});

// Serve image file with proper headers for embedding
router.get("/:id", async function (req, res) {
	try {
		const pic = await Photo.findOne({ id: req.params.id });
		if (!pic) return res.sendStatus(404);

		const filepath = path.join(imageDir, pic.filename());
		if (!fs.existsSync(filepath)) return res.sendStatus(404);

		// Set proper headers for image embedding
		res.setHeader("Content-Type", "image/" + pic.extn);
		res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
		res.setHeader("Access-Control-Allow-Origin", "*"); // Allow CORS
		res.setHeader("Access-Control-Allow-Methods", "GET, HEAD");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");

		// Add Open Graph headers for better embedding
		const imageUrl = `${req.protocol}://${req.get("host")}/images/${pic.id}`;
		res.setHeader("X-Image-URL", imageUrl);
		res.setHeader("X-Image-ID", pic.id);

		res.sendFile(filepath, function (err) {
			if (err) res.sendStatus(404);
		});
	} catch (e) {
		console.log(e);
		res.sendStatus(500);
	}
});

module.exports = router;
