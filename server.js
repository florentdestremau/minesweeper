import express from 'express';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';

const PORT = 80;
const DB_PATH = process.env.DB_PATH || '/storage/minesweeper.db';

const storageDir = DB_PATH.substring(0, DB_PATH.lastIndexOf('/'));
if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    time INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_scores_diff ON scores(difficulty, time);
`);

const insertScore = db.prepare(
  'INSERT INTO scores (name, difficulty, time) VALUES (?, ?, ?)'
);
const getScores = db.prepare(
  'SELECT name, time, created_at FROM scores WHERE difficulty = ? ORDER BY time ASC LIMIT 10'
);

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/up', (_req, res) => res.send('OK'));

app.get('/api/scores/:difficulty', (req, res) => {
  const { difficulty } = req.params;
  if (!['beginner', 'intermediate', 'expert'].includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty' });
  }
  res.json(getScores.all(difficulty));
});

app.post('/api/scores', (req, res) => {
  const { name, difficulty, time } = req.body ?? {};
  if (
    typeof name !== 'string' || name.trim().length === 0 || name.length > 20 ||
    !['beginner', 'intermediate', 'expert'].includes(difficulty) ||
    typeof time !== 'number' || time < 1 || time > 999
  ) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  insertScore.run(name.trim(), difficulty, Math.floor(time));
  res.status(201).json({ ok: true });
});

app.listen(PORT, () => console.log(`Listening on :${PORT}`));
