require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

app.get('/search', async (req, res, next) => {
  const state = req.query.state;

  if (!state || state.length > 50) {
    return res.status(400).json({ error: 'Invalid state name' });
  }

  try {
    const agentsData = await fs.readFile(path.join(__dirname, 'data', 'agents.json'), 'utf-8');
    const agents = JSON.parse(agentsData).agents;
    const results = agents
      .filter(agent => agent.states.some(s => s.toLowerCase() === state.toLowerCase()))
      .sort((a, b) => {
        const lastNameA = a.name.split(' ').slice(-1)[0].toLowerCase();
        const lastNameB = b.name.split(' ').slice(-1)[0].toLowerCase();
        return lastNameA.localeCompare(lastNameB);
      });

    res.json(results);
  } catch (err) {
    console.error('Error reading JSON file:', err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
