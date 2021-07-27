const express = require('express');
require('dotenv').config();

const app = express();

app.get('/', (req, res) => {
  return res.sendFile('index.html', { root: '.' });
});

app.listen(port, () =>
  console.log(`App listening at http://localhost:${port}`),
);
