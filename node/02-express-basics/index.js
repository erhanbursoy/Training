const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

const notesRouter = require('./routes/notes');

// Body parser
app.use(express.json());

// Routes
app.use('/notes', notesRouter);

app.listen(PORT, () => {
  console.log(`Express sunucu çalışıyor: http://localhost:${PORT}`);
});
