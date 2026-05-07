import { Router } from 'express';
import { sql } from '../db/client.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('super_admin'));

/**
 * GET /api/audit
 * Query params:
 *   page        (default 1)
 *   limit       (default 50, max 200)
 *   actor_id    filter by user UUID
 *   action      filter by exact action string
 *   entity_type filter by entity type
 *   from        ISO date string (start of range)
 *   to          ISO date string (end of range)
 *   search      free-text search on actor_name, entity_label, action
 */
router.get('/', async (req, res) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page  || '1'));
    const limit      = Math.min(200, Math.max(1, parseInt(req.query.limit || '50')));
    const offset     = (page - 1) * limit;
    const actorId    = req.query.actor_id    || null;
    const action     = req.query.action      || null;
    const entityType = req.query.entity_type || null;
    const from       = req.query.from        || null;
    const to         = req.query.to          || null;
    const search     = req.query.search      || null;

    // Build dynamic WHERE clauses
    // Neon tagged-template doesn't support dynamic WHERE easily,
    // so we build the conditions array and use sql.unsafe for the filter part
    const conditions = [];
    const values     = [];

    if (actorId)    { conditions.push(`actor_id = $${values.length+1}`);      values.push(actorId); }
    if (action)     { conditions.push(`action = $${values.length+1}`);         values.push(action); }
    if (entityType) { conditions.push(`entity_type = $${values.length+1}`);    values.push(entityType); }
    if (from)       { conditions.push(`created_at >= $${values.length+1}`);    values.push(from); }
    if (to)         { conditions.push(`created_at <= $${values.length+1}::timestamptz + interval '1 day'`); values.push(to); }
    if (search) {
      conditions.push(`(
        actor_name   ILIKE $${values.length+1} OR
        entity_label ILIKE $${values.length+1} OR
        action       ILIKE $${values.length+1}
      )`);
      values.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM audit_logs ${where}`;
    const dataQuery  = `
      SELECT * FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT $${values.length+1} OFFSET $${values.length+2}
    `;

    const { neon } = await import('@neondatabase/serverless');
    const rawSql = neon(process.env.DATABASE_URL);

    const [countRes, dataRes] = await Promise.all([
      rawSql(countQuery, values),
      rawSql(dataQuery,  [...values, limit, offset]),
    ]);

    res.json({
      logs:  dataRes,
      total: countRes[0]?.total ?? 0,
      page,
      limit,
      pages: Math.ceil((countRes[0]?.total ?? 0) / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/audit/actors — distinct actors for the filter dropdown
 */
router.get('/actors', async (req, res) => {
  try {
    const actors = await sql`
      SELECT DISTINCT actor_id, actor_name, actor_role
      FROM audit_logs
      WHERE actor_id IS NOT NULL
      ORDER BY actor_name
    `;
    res.json(actors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/audit/actions — distinct action strings for the filter dropdown
 */
router.get('/actions', async (req, res) => {
  try {
    const actions = await sql`
      SELECT DISTINCT action FROM audit_logs ORDER BY action
    `;
    res.json(actions.map(a => a.action));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
