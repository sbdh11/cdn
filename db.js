const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in the project directory
const dbPath = path.join(__dirname, 'images.db');
const db = new sqlite3.Database(dbPath);

// Initialize the database with the photos table
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        extn TEXT NOT NULL,
        deletionPassword TEXT NOT NULL
    )`);
});

// Photo model methods
class Photo {
    constructor(data = {}) {
        this.id = data.id;
        this.extn = data.extn;
        this.deletionPassword = data.deletionPassword;
    }

    filename() {
        return this.id + '.' + this.extn;
    }

    save() {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO photos (id, extn, deletionPassword) VALUES (?, ?, ?)',
                [this.id, this.extn, this.deletionPassword],
                function(err) {
                    if (err) reject(err);
                    else resolve(new Photo({ id: this.id, extn: this.extn, deletionPassword: this.deletionPassword }));
                }.bind(this)
            );
        });
    }

    static findOne(query) {
        return new Promise((resolve, reject) => {
            const conditions = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
            const values = Object.values(query);
            
            db.get(
                `SELECT * FROM photos WHERE ${conditions}`,
                values,
                (err, row) => {
                    if (err) reject(err);
                    else {
                        if (row) {
                            resolve(new Photo(row));
                        } else {
                            resolve(null);
                        }
                    }
                }
            );
        });
    }

    static findAll({ offset = 0, limit = 50 } = {}) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM photos ORDER BY id LIMIT ? OFFSET ?',
                [limit, offset],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(r => new Photo(r)));
                }
            );
        });
    }

    static count() {
        return new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as cnt FROM photos', [], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.cnt : 0);
            });
        });
    }

    static exists(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT 1 FROM photos WHERE id = ? LIMIT 1', [id], (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            });
        });
    }

    remove() {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM photos WHERE id = ?',
                [this.id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });
    }
}

console.log('SQLite database initialized successfully');

module.exports = Photo;