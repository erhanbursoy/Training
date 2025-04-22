const express = require('express');
const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const router = express.Router();
const filePath = path.join(__dirname, '../data/notes.json');

// GET /notes
router.get('/', (req, res) => {
  const data = fs.readFileSync(filePath, 'utf8');
  const notes = JSON.parse(data);
  res.json(notes);
});

// POST /notes
router.post('/', (req, res) => {
  const newNote = req.body;

  const data = fs.readFileSync(filePath, 'utf8');
  const notes = JSON.parse(data);

  notes.push(newNote);

  fs.writeFileSync(filePath, JSON.stringify(notes, null, 2));
  log(`Yeni not eklendi: ${newNote.title}`);
  res.status(201).json({ message: 'Note added' });
});

module.exports = router;
