import { sql } from '../db/client.js';

/**
 * logAction — fire-and-forget audit log write.
 * Never throws — audit failures must not break the actual request.
 *
 * @param {object} params
 * @param {object} params.user        — req.user (id, name, role)
 * @param {string} params.action      — e.g. 'LOGIN', 'CREATE_USER', 'APPROVE_TEST'
 * @param {string} params.entityType  — e.g. 'user', 'client', 'sample_group', 'test'
 * @param {string} [params.entityId]  — UUID of the affected record
 * @param {string} [params.entityLabel] — human-readable label e.g. username, group ref ID
 * @param {object} [params.detail]    — any extra JSON detail to store
 * @param {string} [params.ip]        — request IP
 */
export async function logAction({ user, action, entityType, entityId, entityLabel, detail, ip }) {
  try {
    await sql`
      INSERT INTO audit_logs
        (actor_id, actor_name, actor_role, action, entity_type, entity_id, entity_label, detail, ip_address)
      VALUES (
        ${user?.id         ?? null},
        ${user?.name       ?? null},
        ${user?.role       ?? null},
        ${action},
        ${entityType},
        ${entityId         ?? null},
        ${entityLabel      ?? null},
        ${detail ? JSON.stringify(detail) : null},
        ${ip               ?? null}
      )
    `;
  } catch (err) {
    // Never propagate — just log to console
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

/** Extract real IP from request (handles proxies) */
export function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}
