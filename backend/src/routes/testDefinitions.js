import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/test-definitions — all active (or all for super_admin)
router.get('/', async (req, res) => {
  try {
    const defs = req.user.role === 'super_admin'
      ? await sql`SELECT * FROM test_definitions ORDER BY name ASC`
      : await sql`SELECT * FROM test_definitions WHERE is_active = true ORDER BY name ASC`;
    res.json(defs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/test-definitions — super_admin creates
router.post('/', authorize('super_admin'), async (req, res) => {
  try {
    const { name, unit, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Test name required' });
    const [def] = await sql`
      INSERT INTO test_definitions (name, unit, description)
      VALUES (${name.trim()}, ${unit ?? null}, ${description ?? null})
      RETURNING *
    `;
    res.status(201).json(def);
  } catch (err) {
    if (err.message?.includes('unique')) return res.status(409).json({ error: 'Test name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/test-definitions/:id — super_admin updates
router.patch('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const { name, unit, description, is_active } = req.body;
    const [def] = await sql`
      UPDATE test_definitions SET
        name        = COALESCE(${name ?? null}, name),
        unit        = COALESCE(${unit ?? null}, unit),
        description = COALESCE(${description ?? null}, description),
        is_active   = COALESCE(${is_active ?? null}::boolean, is_active)
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    if (!def) return res.status(404).json({ error: 'Not found' });
    res.json(def);
  } catch (err) {
    if (err.message?.includes('unique')) return res.status(409).json({ error: 'Test name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/test-definitions/:id — super_admin deletes (only if never used)
router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const [used] = await sql`SELECT id FROM sample_tests WHERE test_definition_id = ${req.params.id} LIMIT 1`;
    if (used) return res.status(409).json({ error: 'Cannot delete — test is in use. Deactivate it instead.' });
    await sql`DELETE FROM test_definitions WHERE id = ${req.params.id}`;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
