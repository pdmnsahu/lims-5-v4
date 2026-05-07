import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();
router.use(authenticate);

router.patch('/:id/lab-id', authorize('lab_manager'), async (req, res) => {
  try {
    const { lab_internal_id } = req.body;
    if (!lab_internal_id) return res.status(400).json({ error: 'lab_internal_id required' });

    const [conflict] = await sql`
      SELECT id FROM samples WHERE lab_internal_id = ${lab_internal_id.trim()} AND id != ${req.params.id}
    `;
    if (conflict) return res.status(409).json({ error: `Lab ID "${lab_internal_id}" is already assigned to another sample` });

    const [sample] = await sql`
      UPDATE samples SET lab_internal_id = ${lab_internal_id.trim()}
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });

    await sql`
      UPDATE sample_groups SET status = 'in_progress'
      WHERE id = ${sample.sample_group_id} AND status = 'collected'
    `;

    await logAction({ user: req.user, action: 'ASSIGN_LAB_ID', entityType: 'sample',
      entityId: sample.id, entityLabel: sample.sample_ref_id,
      detail: { lab_internal_id: lab_internal_id.trim(), sample_group_id: sample.sample_group_id }, ip: getIP(req) });

    res.json(sample);
  } catch (err) {
    if (err.message?.includes('unique')) return res.status(409).json({ error: 'Lab ID already assigned to another sample' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/tests', async (req, res) => {
  try {
    const tests = await sql`
      SELECT st.*, td.name AS test_name, td.unit AS test_unit, u.name AS chemist_name
      FROM sample_tests st
      JOIN test_definitions td ON td.id = st.test_definition_id
      LEFT JOIN users u         ON u.id = st.assigned_chemist_id
      WHERE st.sample_id = ${req.params.id}
      ORDER BY st.created_at ASC
    `;
    res.json(tests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/tests', authorize('lab_manager'), async (req, res) => {
  try {
    const { test_definition_id, assigned_chemist_id } = req.body;
    if (!test_definition_id || !assigned_chemist_id)
      return res.status(400).json({ error: 'test_definition_id and assigned_chemist_id required' });

    const [test] = await sql`
      INSERT INTO sample_tests (sample_id, test_definition_id, assigned_chemist_id, assigned_by)
      VALUES (${req.params.id}, ${test_definition_id}, ${assigned_chemist_id}, ${req.user.id})
      ON CONFLICT (sample_id, test_definition_id) DO NOTHING
      RETURNING *
    `;
    if (!test) return res.status(409).json({ error: 'This test is already assigned to this sample' });

    const [td] = await sql`SELECT name FROM test_definitions WHERE id = ${test_definition_id}`;
    const [ch] = await sql`SELECT name FROM users WHERE id = ${assigned_chemist_id}`;
    await logAction({ user: req.user, action: 'ASSIGN_TEST', entityType: 'sample_test',
      entityId: test.id, entityLabel: td?.name,
      detail: { sample_id: req.params.id, chemist: ch?.name, test: td?.name }, ip: getIP(req) });

    res.status(201).json(test);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
