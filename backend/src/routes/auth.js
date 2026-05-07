import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '../db/client.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const [user] = await sql`
      SELECT * FROM users WHERE username = ${username.toLowerCase().trim()} AND is_active = true
    `;

    if (!user) {
      // Log failed attempt (no actor_id since user not found)
      await logAction({ user: { id: null, name: username, role: null }, action: 'LOGIN_FAILED',
        entityType: 'auth', entityLabel: username, detail: { reason: 'User not found' }, ip: getIP(req) });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      await logAction({ user: { id: user.id, name: user.name, role: user.role }, action: 'LOGIN_FAILED',
        entityType: 'auth', entityId: user.id, entityLabel: user.username,
        detail: { reason: 'Wrong password' }, ip: getIP(req) });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    await logAction({ user: { id: user.id, name: user.name, role: user.role }, action: 'LOGIN',
      entityType: 'auth', entityId: user.id, entityLabel: user.username, ip: getIP(req) });

    res.json({ token, user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
