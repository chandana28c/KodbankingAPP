require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { pool, initSchema } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

// In a real app, keep this secret in env.
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-kodbank-key';
const TOKEN_EXPIRY_SECONDS = 60 * 60; // 1 hour

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.static(path.join(__dirname, 'public')));

// Initialize DB schema on startup
initSchema().catch((err) => {
  console.error('Failed to initialize DB schema', err);
});

// Simple helpers
function generateJwt(username, role) {
  return jwt.sign(
    {
      role,
    },
    JWT_SECRET,
    {
      subject: username,
      expiresIn: TOKEN_EXPIRY_SECONDS,
    }
  );
}

async function saveToken(token, uid, expiresAt) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      'INSERT INTO UserToken (token, uid, expiry) VALUES (?, ?, ?)',
      [token, uid, expiresAt]
    );
  } finally {
    conn.release();
  }
}

// Routes to serve pages
app.get('/', (req, res) => {
  res.redirect('/register.html');
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API: Register
app.post('/api/register', async (req, res) => {
  const { uid, uname, password, email, phone, role } = req.body;

  if (!uid || !uname || !password || !email || !phone) {
    return res
      .status(400)
      .json({ message: 'uid, username, password, email and phone are required' });
  }

  const normalizedRole = role || 'Customer';

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query(
      'SELECT uid FROM KodUser WHERE uid = ? OR username = ? OR email = ?',
      [uid, uname, email]
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ message: 'User with same uid/username/email already exists' });
    }

    await conn.query(
      'INSERT INTO KodUser (uid, username, email, password, balance, phone, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uid, uname, email, password, 100000.0, phone, normalizedRole]
    );

    // After successful registration, redirect to login page URL
    res.status(201).json({ message: 'Registered successfully', redirectTo: '/login.html' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// API: Login
app.post('/api/login', async (req, res) => {
  const { uname, password } = req.body;

  if (!uname || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT uid, username, password, role FROM KodUser WHERE username = ?',
      [uname]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = generateJwt(user.username, user.role);

    const decoded = jwt.decode(token);
    const expSeconds = decoded.exp;
    const expiresAt = new Date(expSeconds * 1000);

    await saveToken(token, user.uid, expiresAt);

    res
      .cookie('kodbank_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: TOKEN_EXPIRY_SECONDS * 1000,
      })
      .status(200)
      .json({ message: 'Login successful', redirectTo: '/dashboard.html' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// Middleware to verify JWT from cookie
async function authMiddleware(req, res, next) {
  const token = req.cookies.kodbank_token;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Optional: check token exists in DB and is not expired
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(
        'SELECT tid FROM UserToken WHERE token = ? AND expiry > NOW()',
        [token]
      );
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Token expired or invalid' });
      }
    } finally {
      conn.release();
    }

    req.user = {
      username: payload.sub,
      role: payload.role,
    };
    req.token = token;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// API: Chat (proxies to Hugging Face Inference API - Mistral 7B)
const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

app.post('/api/chat', authMiddleware, async (req, res) => {
  if (!HF_TOKEN) {
    return res.status(503).json({ message: 'Chat service is not configured. Add HF_TOKEN to .env' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'messages array is required' });
  }

  // Format messages for OpenAI-compatible chat completions
  const systemMsg = {
    role: 'system',
    content: 'You are a helpful banking assistant for Kodbank. Answer questions about banking, accounts, and finance. Be concise and friendly.',
  };
  const apiMessages = [systemMsg, ...messages.map((m) => ({ role: m.role, content: m.content }))];

  try {
    const hfRes = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify({
        model: `${HF_MODEL}:fastest`,
        messages: apiMessages,
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    const data = await hfRes.json();

    if (!hfRes.ok) {
      const errMsg = data.error?.message || data.message || 'Model request failed';
      return res.status(hfRes.status).json({
        message: typeof errMsg === 'string' ? errMsg : 'Model is loading, please try again in a moment',
      });
    }

    const reply =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

    res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    console.error('Chat API error:', err);
    res.status(500).json({ message: 'Failed to get response from AI. Please try again.' });
  }
});

// API: Check balance
app.get('/api/balance', authMiddleware, async (req, res) => {
  const username = req.user.username;

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT balance FROM KodUser WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const balance = rows[0].balance;
    res.status(200).json({ balance });
  } catch (err) {
    console.error('Balance fetch error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
});

app.listen(PORT, () => {
  console.log(`Kodbank server running on http://localhost:${PORT}`);
});

