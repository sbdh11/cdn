const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in the project directory
const dbPath = path.join(__dirname, 'images.db');
const db = new sqlite3.Database(dbPath);

// Initialize the database with the photos table
db.serialize(() => {
    // Check if the old table exists with deletionPassword column
    db.get("PRAGMA table_info(photos)", (err, rows) => {
        if (err) {
            // Table doesn't exist, create new schema
            createNewTable();
        } else {
            // Check if deletionPassword column exists
            db.all("PRAGMA table_info(photos)", (err, columns) => {
                if (err) {
                    createNewTable();
                } else {
                    const hasDeletionPassword = columns.some(col => col.name === 'deletionPassword');
                    if (hasDeletionPassword) {
                        // Migrate old table to new schema
                        migrateTable();
                    } else {
                        // Already using new schema
                        createNewTable();
                    }
                }
            });
        }
    });
});

function createNewTable() {
    db.run(`CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        extn TEXT NOT NULL
    )`);
    console.log('SQLite database initialized with new schema');
}

function migrateTable() {
    // Create new table with correct schema
    db.run(`CREATE TABLE photos_new (
        id TEXT PRIMARY KEY,
        extn TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error('Error creating new table:', err);
            return;
        }
        
        // Copy data from old table to new table
        db.run(`INSERT INTO photos_new (id, extn) 
                SELECT id, extn FROM photos`, (err) => {
            if (err) {
                console.error('Error copying data:', err);
                return;
            }
            
            // Drop old table
            db.run(`DROP TABLE photos`, (err) => {
                if (err) {
                    console.error('Error dropping old table:', err);
                    return;
                }
                
                // Rename new table to photos
                db.run(`ALTER TABLE photos_new RENAME TO photos`, (err) => {
                    if (err) {
                        console.error('Error renaming table:', err);
                        return;
                    }
                    
                    console.log('Database migrated successfully from old schema');
                });
            });
        });
    });
}

// Photo model methods
class Photo {
    constructor(data = {}) {
        this.id = data.id;
        this.extn = data.extn;
    }

    filename() {
        return this.id + '.' + this.extn;
    }

    save() {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO photos (id, extn) VALUES (?, ?)',
                [this.id, this.extn],
                function(err) {
                    if (err) reject(err);
                    else resolve(new Photo({ id: this.id, extn: this.extn }));
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