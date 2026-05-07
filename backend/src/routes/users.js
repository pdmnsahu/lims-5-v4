import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    let users;
    if (req.user.role === 'super_admin') {
      users = role
        ? await sql`SELECT id,name,username,role,is_active,created_at FROM users WHERE role=${role} ORDER BY created_at DESC`
        : await sql`SELECT id,name,username,role,is_active,created_at FROM users ORDER BY created_at DESC`;
    } else if (req.user.role === 'lab_manager') {
      users = await sql`SELECT id,name,username,role FROM users WHERE role='chemist' AND is_active=true ORDER BY name`;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authorize('super_admin'), async (req, res) => {
  try {
    const { name, role, username: providedUsername } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Name and role required' });
    if (!['admin', 'lab_manager', 'chemist'].includes(role))
      return res.status(400).json({ error: 'Invalid role' });

    let username;
    if (providedUsername) {
      const cleaned = providedUsername.trim().toLowerCase();
      if (!/^[a-z0-9]+\.relims$/.test(cleaned))
        return res.status(400).json({ error: 'Username must be in the format name.relims' });
      username = cleaned;
    } else {
      const base = name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      username = `${base}.relims`;
      const existing = await sql`SELECT username FROM users WHERE username ~ ${`^${base}[0-9]*\\.relims$`} ORDER BY username`;
      if (existing.some(u => u.username === username)) {
        let n = 1;
        while (existing.some(u => u.username === `${base}${n}.relims`)) n++;
        username = `${base}${n}.relims`;
      }
    }

    const hash = await bcrypt.hash(username, 10);
    const [user] = await sql`
      INSERT INTO users (name, username, password_hash, role)
      VALUES (${name.trim()}, ${username}, ${hash}, ${role})
      RETURNING id, name, username, role, is_active, created_at
    `;

    await logAction({ user: req.user, action: 'CREATE_USER', entityType: 'user',
      entityId: user.id, entityLabel: username,
      detail: { name: user.name, role: user.role }, ip: getIP(req) });

    res.status(201).json({ ...user, default_password: username });
  } catch (err) {
    if (err.message?.includes('unique') || err.message?.includes('duplicate'))
      return res.status(409).json({ error: 'Username already exists — choose a different one' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const { is_active, name } = req.body;
    const [user] = await sql`
      UPDATE users SET
        is_active = COALESCE(${is_active ?? null}::boolean, is_active),
        name      = COALESCE(${name ?? null}, name)
      WHERE id = ${req.params.id}
      RETURNING id, name, username, role, is_active, created_at
    `;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const action = is_active === false ? 'DEACTIVATE_USER'
                 : is_active === true  ? 'ACTIVATE_USER'
                 : 'UPDATE_USER';
    await logAction({ user: req.user, action, entityType: 'user',
      entityId: user.id, entityLabel: user.username,
      detail: { is_active: user.is_active, name: user.name }, ip: getIP(req) });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/reset-password', authorize('super_admin'), async (req, res) => {
  try {
    const [user] = await sql`SELECT username FROM users WHERE id = ${req.params.id}`;
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hash = await bcrypt.hash(user.username, 10);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${req.params.id}`;

    await logAction({ user: req.user, action: 'RESET_PASSWORD', entityType: 'user',
      entityId: req.params.id, entityLabel: user.username, ip: getIP(req) });

    res.json({ success: true, message: `Password reset to: ${user.username}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const [target] = await sql`SELECT name, username, role FROM users WHERE id = ${req.params.id}`;
    await sql`DELETE FROM users WHERE id = ${req.params.id} AND role != 'super_admin'`;

    await logAction({ user: req.user, action: 'DELETE_USER', entityType: 'user',
      entityId: req.params.id, entityLabel: target?.username,
      detail: { deleted_name: target?.name, deleted_role: target?.role }, ip: getIP(req) });

    res.json({ success: true });
  } catch (err) {
    if (err.message?.includes('foreign key') || err.message?.includes('violates'))
      return res.status(409).json({ error: 'Cannot delete user — they have tests assigned. Deactivate them instead.' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
