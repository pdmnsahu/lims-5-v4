import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/reports/sample/:sampleId
// Returns a sample with ALL its approved tests — for the "one sample, one report" PDF
router.get('/sample/:sampleId', authorize('admin', 'lab_manager', 'super_admin'), async (req, res) => {
  try {
    const [sample] = await sql`
      SELECT
        s.*,
        sg.group_ref_id,
        sg.created_at  AS group_created_at,
        c.name         AS client_name,
        c.contact_person,
        c.email        AS client_email,
        c.address      AS client_address,
        u.name         AS collected_by_name
      FROM samples s
      JOIN sample_groups sg ON sg.id = s.sample_group_id
      JOIN clients c        ON c.id  = sg.client_id
      LEFT JOIN users u     ON u.id  = sg.collected_by
      WHERE s.id = ${req.params.sampleId}
    `;
    if (!sample) return res.status(404).json({ error: 'Sample not found' });

    const tests = await sql`
      SELECT
        st.*,
        td.name        AS test_name,
        td.unit        AS test_unit,
        td.description AS test_description,
        u.name         AS chemist_name,
        ab.name        AS assigned_by_name
      FROM sample_tests st
      JOIN test_definitions td ON td.id = st.test_definition_id
      LEFT JOIN users u        ON u.id  = st.assigned_chemist_id
      LEFT JOIN users ab       ON ab.id = st.assigned_by
      WHERE st.sample_id = ${req.params.sampleId} AND st.status = 'approved'
      ORDER BY td.name ASC
    `;

    res.json({ sample, tests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/group/:id — all samples + their approved tests
router.get('/group/:id', authorize('admin', 'lab_manager', 'super_admin'), async (req, res) => {
  try {
    const [group] = await sql`
      SELECT sg.*, c.name AS client_name, c.contact_person, c.email AS client_email, c.address
      FROM sample_groups sg
      JOIN clients c ON c.id = sg.client_id
      WHERE sg.id = ${req.params.id}
    `;
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const tests = await sql`
      SELECT
        st.*,
        td.name        AS test_name,
        td.unit        AS test_unit,
        s.sample_ref_id,
        s.lab_internal_id,
        u.name         AS chemist_name
      FROM sample_tests st
      JOIN test_definitions td ON td.id = st.test_definition_id
      JOIN samples s           ON s.id  = st.sample_id
      LEFT JOIN users u        ON u.id  = st.assigned_chemist_id
      WHERE s.sample_group_id = ${req.params.id} AND st.status = 'approved'
      ORDER BY s.sample_ref_id, td.name
    `;

    res.json({ group, tests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/overview — super_admin sees everything
router.get('/overview', authorize('super_admin'), async (req, res) => {
  try {
    const stats = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM sample_groups)                                           AS total_groups,
        (SELECT COUNT(*)::int FROM samples)                                                 AS total_samples,
        (SELECT COUNT(*)::int FROM sample_tests)                                            AS total_tests,
        (SELECT COUNT(*)::int FROM sample_tests WHERE status='approved')                    AS approved_tests,
        (SELECT COUNT(*)::int FROM sample_tests WHERE status='submitted')                   AS pending_review,
        (SELECT COUNT(*)::int FROM sample_tests WHERE status='rejected')                    AS rejected_tests,
        (SELECT COUNT(*)::int FROM sample_tests WHERE status='pending')                     AS unsubmitted_tests,
        (SELECT COUNT(*)::int FROM sample_groups WHERE status='completed')                  AS completed_groups
    `;
    res.json(stats[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
