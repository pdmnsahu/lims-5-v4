import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const clients = await sql`SELECT * FROM clients ORDER BY name ASC`;
    res.json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authorize('super_admin'), async (req, res) => {
  try {
    const { name, contact_person, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Client name required' });
    const [client] = await sql`
      INSERT INTO clients (name, contact_person, email, phone, address)
      VALUES (${name}, ${contact_person ?? null}, ${email ?? null}, ${phone ?? null}, ${address ?? null})
      RETURNING *
    `;
    await logAction({ user: req.user, action: 'CREATE_CLIENT', entityType: 'client',
      entityId: client.id, entityLabel: client.name,
      detail: { contact_person, email, phone }, ip: getIP(req) });
    res.status(201).json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const { name, contact_person, email, phone, address } = req.body;
    const [client] = await sql`
      UPDATE clients SET
        name           = COALESCE(${name ?? null}, name),
        contact_person = COALESCE(${contact_person ?? null}, contact_person),
        email          = COALESCE(${email ?? null}, email),
        phone          = COALESCE(${phone ?? null}, phone),
        address        = COALESCE(${address ?? null}, address)
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await logAction({ user: req.user, action: 'UPDATE_CLIENT', entityType: 'client',
      entityId: client.id, entityLabel: client.name,
      detail: { name, contact_person, email, phone, address }, ip: getIP(req) });
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const [target] = await sql`SELECT name FROM clients WHERE id = ${req.params.id}`;
    await sql`DELETE FROM clients WHERE id = ${req.params.id}`;
    await logAction({ user: req.user, action: 'DELETE_CLIENT', entityType: 'client',
      entityId: req.params.id, entityLabel: target?.name, ip: getIP(req) });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
