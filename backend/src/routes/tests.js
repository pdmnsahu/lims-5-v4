import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();
router.use(authenticate);

// GET /api/tests
router.get('/', async (req, res) => {
  try {
    let tests;
    if (req.user.role === 'chemist') {
      tests = await sql`
        SELECT st.*, td.name AS test_name, td.unit AS test_unit,
               s.lab_internal_id, sg.group_ref_id, c.name AS client_name
        FROM sample_tests st
        JOIN test_definitions td ON td.id = st.test_definition_id
        JOIN samples s           ON s.id  = st.sample_id
        JOIN sample_groups sg    ON sg.id = s.sample_group_id
        JOIN clients c           ON c.id  = sg.client_id
        WHERE st.assigned_chemist_id = ${req.user.id}
        ORDER BY st.created_at DESC
      `;
    } else if (req.user.role === 'lab_manager') {
      tests = await sql`
        SELECT st.*, td.name AS test_name, td.unit AS test_unit,
               s.sample_ref_id, s.lab_internal_id, sg.group_ref_id,
               c.name AS client_name, u.name AS chemist_name
        FROM sample_tests st
        JOIN test_definitions td ON td.id = st.test_definition_id
        JOIN samples s           ON s.id  = st.sample_id
        JOIN sample_groups sg    ON sg.id = s.sample_group_id
        JOIN clients c           ON c.id  = sg.client_id
        LEFT JOIN users u        ON u.id  = st.assigned_chemist_id
        ORDER BY st.created_at DESC
      `;
    } else if (req.user.role === 'admin') {
      tests = await sql`
        SELECT st.*, td.name AS test_name, td.unit AS test_unit,
               s.id AS sample_db_id, s.sample_ref_id, s.lab_internal_id,
               sg.group_ref_id, c.name AS client_name, u.name AS chemist_name
        FROM sample_tests st
        JOIN test_definitions td ON td.id = st.test_definition_id
        JOIN samples s           ON s.id  = st.sample_id
        JOIN sample_groups sg    ON sg.id = s.sample_group_id
        JOIN clients c           ON c.id  = sg.client_id
        LEFT JOIN users u        ON u.id  = st.assigned_chemist_id
        WHERE st.status = 'approved'
        ORDER BY st.created_at DESC
      `;
    } else if (req.user.role === 'super_admin') {
      tests = await sql`
        SELECT st.*, td.name AS test_name, td.unit AS test_unit,
               s.id AS sample_db_id, s.sample_ref_id, s.lab_internal_id,
               sg.group_ref_id, sg.id AS sample_group_id,
               c.name AS client_name, u.name AS chemist_name
        FROM sample_tests st
        JOIN test_definitions td ON td.id = st.test_definition_id
        JOIN samples s           ON s.id  = st.sample_id
        JOIN sample_groups sg    ON sg.id = s.sample_group_id
        JOIN clients c           ON c.id  = sg.client_id
        LEFT JOIN users u        ON u.id  = st.assigned_chemist_id
        ORDER BY st.created_at DESC
      `;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(tests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tests/:id
router.get('/:id', async (req, res) => {
  try {
    const [test] = await sql`
      SELECT st.*, td.name AS test_name, td.unit AS test_unit,
             td.description AS test_description,
             s.sample_ref_id, s.lab_internal_id, s.description AS sample_description,
             sg.group_ref_id, sg.id AS sample_group_id,
             c.name AS client_name, c.address AS client_address,
             u.name AS chemist_name, ab.name AS assigned_by_name
      FROM sample_tests st
      JOIN test_definitions td ON td.id = st.test_definition_id
      JOIN samples s           ON s.id  = st.sample_id
      JOIN sample_groups sg    ON sg.id = s.sample_group_id
      JOIN clients c           ON c.id  = sg.client_id
      LEFT JOIN users u        ON u.id  = st.assigned_chemist_id
      LEFT JOIN users ab       ON ab.id = st.assigned_by
      WHERE st.id = ${req.params.id}
    `;
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tests/:id/submit — chemist submits result (+ optional image_url for GCV)
router.patch('/:id/submit', authorize('chemist'), async (req, res) => {
  try {
    const { result_value, result_notes, image_url } = req.body;
    if (result_value === undefined || result_value === '')
      return res.status(400).json({ error: 'result_value required' });

    // Validate numeric value
    if (isNaN(Number(result_value)))
      return res.status(400).json({ error: 'result_value must be a number' });

    const [existing] = await sql`SELECT * FROM sample_tests WHERE id = ${req.params.id}`;
    if (!existing)                                          return res.status(404).json({ error: 'Test not found' });
    if (existing.assigned_chemist_id !== req.user.id)      return res.status(403).json({ error: 'Not your test' });
    if (existing.status === 'submitted' || existing.status === 'approved')
      return res.status(409).json({ error: 'Already submitted or approved — cannot change' });

    const [test] = await sql`
      UPDATE sample_tests SET
        result_value     = ${String(result_value)},
        result_notes     = ${result_notes ?? null},
        image_url        = ${image_url ?? existing.image_url ?? null},
        status           = 'submitted',
        submitted_at     = now(),
        rejection_reason = null
      WHERE id = ${req.params.id}
      RETURNING *
    `;

    await logAction({ user: req.user, action: 'SUBMIT_RESULT', entityType: 'sample_test',
      entityId: test.id, entityLabel: existing.test_definition_id,
      detail: { result_value, has_image: !!(image_url || existing.image_url) }, ip: getIP(req) });

    res.json(test);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tests/:id/review — lab_manager approves or rejects
router.patch('/:id/review', authorize('lab_manager'), async (req, res) => {
  try {
    const { action, rejection_reason } = req.body;
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ error: 'action must be approve or reject' });
    if (action === 'reject' && !rejection_reason)
      return res.status(400).json({ error: 'rejection_reason required' });

    const [existing] = await sql`SELECT * FROM sample_tests WHERE id = ${req.params.id}`;
    if (!existing)                        return res.status(404).json({ error: 'Test not found' });
    if (existing.status !== 'submitted')  return res.status(409).json({ error: 'Test must be submitted first' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const [test] = await sql`
      UPDATE sample_tests SET
        status           = ${newStatus},
        rejection_reason = ${rejection_reason ?? null},
        reviewed_at      = now()
      WHERE id = ${req.params.id}
      RETURNING *
    `;

    await logAction({ user: req.user,
      action: newStatus === 'approved' ? 'APPROVE_TEST' : 'REJECT_TEST',
      entityType: 'sample_test', entityId: test.id,
      detail: { result_value: existing.result_value, rejection_reason: rejection_reason ?? null },
      ip: getIP(req) });

    // Auto-complete group when all tests approved
    if (newStatus === 'approved') {
      const [grp] = await sql`
        SELECT sg.id FROM sample_groups sg
        JOIN samples s      ON s.sample_group_id = sg.id
        JOIN sample_tests st ON st.sample_id     = s.id
        WHERE st.id = ${req.params.id}
        LIMIT 1
      `;
      if (grp) {
        const [{ pending }] = await sql`
          SELECT COUNT(*)::int AS pending
          FROM sample_tests st
          JOIN samples s ON s.id = st.sample_id
          WHERE s.sample_group_id = ${grp.id} AND st.status != 'approved'
        `;
        if (pending === 0)
          await sql`UPDATE sample_groups SET status = 'completed' WHERE id = ${grp.id}`;
      }
    }

    res.json(test);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
