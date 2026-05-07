import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();
router.use(authenticate);

// GET /api/sample-groups — super_admin + all roles
router.get('/', async (req, res) => {
  try {
    const groups = await sql`
      SELECT
        sg.*,
        c.name  AS client_name,
        u.name  AS collected_by_name,
        COUNT(s.id)::int AS sample_count
      FROM sample_groups sg
      LEFT JOIN clients c ON c.id = sg.client_id
      LEFT JOIN users u   ON u.id = sg.collected_by
      LEFT JOIN samples s ON s.sample_group_id = sg.id
      GROUP BY sg.id, c.name, u.name
      ORDER BY sg.created_at DESC
    `;
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sample-groups/:id — full detail with samples + their assigned test ids
router.get('/:id', async (req, res) => {
  try {
    const [group] = await sql`
      SELECT sg.*, c.name AS client_name, u.name AS collected_by_name
      FROM sample_groups sg
      LEFT JOIN clients c ON c.id = sg.client_id
      LEFT JOIN users u   ON u.id = sg.collected_by
      WHERE sg.id = ${req.params.id}
    `;
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const samples = await sql`
      SELECT
        s.*,
        COUNT(st.id)::int                                          AS test_count,
        COUNT(CASE WHEN st.status='approved' THEN 1 END)::int     AS approved_count,
        COALESCE(
          json_agg(
            json_build_object(
              'test_id', st.id,
              'test_definition_id', st.test_definition_id,
              'test_name', td.name,
              'status', st.status,
              'chemist_name', uch.name
            )
          ) FILTER (WHERE st.id IS NOT NULL), '[]'
        ) AS assigned_tests
      FROM samples s
      LEFT JOIN sample_tests st    ON st.sample_id = s.id
      LEFT JOIN test_definitions td ON td.id = st.test_definition_id
      LEFT JOIN users uch           ON uch.id = st.assigned_chemist_id
      WHERE s.sample_group_id = ${req.params.id}
      GROUP BY s.id
      ORDER BY s.created_at ASC
    `;

    res.json({ ...group, samples });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sample-groups — admin creates
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { group_ref_id, client_id, samples } = req.body;
    if (!group_ref_id || !client_id || !samples?.length)
      return res.status(400).json({ error: 'group_ref_id, client_id and samples are required' });

    // Check for duplicate sample_ref_ids within the submission
    const refIds = samples.map(s => s.sample_ref_id.trim());
    if (new Set(refIds).size !== refIds.length)
      return res.status(400).json({ error: 'Duplicate sample IDs in your submission' });

    const [group] = await sql`
      INSERT INTO sample_groups (group_ref_id, client_id, collected_by)
      VALUES (${group_ref_id}, ${client_id}, ${req.user.id})
      RETURNING *
    `;

    const inserted = [];
    for (const s of samples) {
      const [sample] = await sql`
        INSERT INTO samples (sample_group_id, sample_ref_id, description)
        VALUES (${group.id}, ${s.sample_ref_id.trim()}, ${s.description ?? null})
        RETURNING *
      `;
      inserted.push(sample);
    }

    res.status(201).json({ ...group, samples: inserted });

    await logAction({ user: req.user, action: 'CREATE_SAMPLE_GROUP', entityType: 'sample_group',
      entityId: group.id, entityLabel: group_ref_id,
      detail: { client_id, sample_count: inserted.length }, ip: getIP(req) });
  } catch (err) {
    if (err.message?.includes('unique')) {
      return res.status(409).json({ error: 'Group ID already exists, or a sample ID is already registered in this group' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
