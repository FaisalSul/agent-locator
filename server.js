require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Apply Helmet for security
app.use(helmet());

// Enable CORS with default settings
app.use(cors());

// Body parser middleware
app.use(bodyParser.json());

// Static files
app.use(express.static('public'));

// Rate limiting to prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

// Database connection
let db;

mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})
.then(connection => {
  db = connection;
  console.log('Connected to database.');
})
.catch(err => {
  console.error('Database connection failed:', err.stack);
  process.exit(1);
});

// Middleware for centralized error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Endpoint to search for agents by state
app.get('/search', async (req, res, next) => {
  const state = req.query.state;

  if (!state || state.length > 50) {
    return res.status(400).json({ error: 'Invalid state name' });
  }

  try {
    const query = `
      SELECT agents.name, agents.agent_page_url 
      FROM agents
      JOIN agent_states ON agents.id = agent_states.agent_id
      JOIN states ON agent_states.state_id = states.id
      WHERE LOWER(states.state_name) = LOWER(?)
      ORDER BY agents.name ASC
    `;
    const [results] = await db.execute(query, [state]);
    res.json(results);
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
