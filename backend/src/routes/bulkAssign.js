import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAction, getIP } from '../lib/audit.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize('lab_manager'), async (req, res) => {
  try {
    const { sample_ids, assignments } = req.body;
    if (!sample_ids?.length || !assignments?.length)
      return res.status(400).json({ error: 'sample_ids and assignments required' });

    let created = 0, skipped = 0;
    for (const sampleId of sample_ids) {
      for (const { test_definition_id, assigned_chemist_id } of assignments) {
        if (!test_definition_id || !assigned_chemist_id) { skipped++; continue; }
        const [row] = await sql`
          INSERT INTO sample_tests (sample_id, test_definition_id, assigned_chemist_id, assigned_by)
          VALUES (${sampleId}, ${test_definition_id}, ${assigned_chemist_id}, ${req.user.id})
          ON CONFLICT (sample_id, test_definition_id) DO NOTHING
          RETURNING id
        `;
        row ? created++ : skipped++;
      }
    }

    if (created > 0 && sample_ids.length > 0) {
      const [sample] = await sql`SELECT sample_group_id FROM samples WHERE id = ${sample_ids[0]}`;
      if (sample) {
        await sql`
          UPDATE sample_groups SET status = 'in_progress'
          WHERE id = ${sample.sample_group_id} AND status = 'collected'
        `;
      }
    }

    await logAction({ user: req.user, action: 'BULK_ASSIGN_TESTS', entityType: 'sample_group',
      entityLabel: `${sample_ids.length} samples`,
      detail: {
        sample_count: sample_ids.length,
        assignment_count: assignments.length,
        created, skipped,
        tests: assignments.map(a => a.test_definition_id),
      }, ip: getIP(req) });

    res.json({ created, skipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
