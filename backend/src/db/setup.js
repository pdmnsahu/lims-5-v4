import { sql } from './client.js';
import bcrypt from 'bcryptjs';

async function setup() {
  console.log('🔌 Connecting to Neon PostgreSQL (v3)...');

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  // ── USERS ──────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('super_admin','admin','lab_manager','chemist')),
      is_active     BOOLEAN DEFAULT true,
      created_at    TIMESTAMPTZ DEFAULT now()
    )
  `;

  // ── CLIENTS ────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           TEXT NOT NULL,
      contact_person TEXT,
      email          TEXT,
      phone          TEXT,
      address        TEXT,
      created_at     TIMESTAMPTZ DEFAULT now()
    )
  `;

  // ── TEST DEFINITIONS (3 fixed, seeded below) ───────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS test_definitions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL UNIQUE,
      unit        TEXT,
      description TEXT,
      is_active   BOOLEAN DEFAULT true,
      created_at  TIMESTAMPTZ DEFAULT now()
    )
  `;

  // ── SAMPLE GROUPS ──────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS sample_groups (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_ref_id  TEXT NOT NULL UNIQUE,
      client_id     UUID REFERENCES clients(id),
      collected_by  UUID REFERENCES users(id),
      status        TEXT DEFAULT 'collected'
                    CHECK (status IN ('collected','in_progress','completed')),
      created_at    TIMESTAMPTZ DEFAULT now()
    )
  `;

  // ── SAMPLES ────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS samples (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sample_group_id  UUID REFERENCES sample_groups(id) ON DELETE CASCADE,
      sample_ref_id    TEXT NOT NULL,
      lab_internal_id  TEXT UNIQUE,
      description      TEXT,
      created_at       TIMESTAMPTZ DEFAULT now(),
      UNIQUE(sample_group_id, sample_ref_id)
    )
  `;

  // ── SAMPLE TESTS (image_url for GCV calorimeter snapshot) ─────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS sample_tests (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sample_id           UUID REFERENCES samples(id) ON DELETE CASCADE,
      test_definition_id  UUID REFERENCES test_definitions(id),
      assigned_chemist_id UUID REFERENCES users(id),
      assigned_by         UUID REFERENCES users(id),
      status              TEXT DEFAULT 'pending'
                          CHECK (status IN ('pending','submitted','approved','rejected')),
      result_value        TEXT,
      result_notes        TEXT,
      image_url           TEXT,
      rejection_reason    TEXT,
      submitted_at        TIMESTAMPTZ,
      reviewed_at         TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT now(),
      UNIQUE(sample_id, test_definition_id)
    )
  `;

  // Add image_url column if upgrading from v2 (safe to run multiple times)
  await sql`ALTER TABLE sample_tests ADD COLUMN IF NOT EXISTS image_url TEXT`;

  // ── AUDIT LOGS ─────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
      actor_name  TEXT,
      actor_role  TEXT,
      action      TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id   TEXT,
      entity_label TEXT,
      detail      JSONB,
      ip_address  TEXT,
      created_at  TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_logs(actor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_logs(entity_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`;

  console.log('✅ Tables created / verified');

  // ── SEED SUPER ADMIN ───────────────────────────────────────────────────────
  const superUsername = 'superadmin.relims';
  const superHash = await bcrypt.hash(superUsername, 10);
  await sql`
    INSERT INTO users (name, username, password_hash, role)
    VALUES ('Super Admin', ${superUsername}, ${superHash}, 'super_admin')
    ON CONFLICT (username) DO NOTHING
  `;
  console.log(`✅ Super admin  →  ${superUsername} / ${superUsername}`);

  // ── SEED 3 FIXED TEST DEFINITIONS ─────────────────────────────────────────
  const tests = [
    { name: 'Moisture',              unit: '%',       description: 'Total moisture content of coal sample' },
    { name: 'Ash',                   unit: '%',       description: 'Ash content on air dried basis' },
    { name: 'Gross Calorific Value', unit: 'kCal/kg', description: 'GCV measured using Parr calorimeter — attach snapshot image' },
  ];
  for (const t of tests) {
    await sql`
      INSERT INTO test_definitions (name, unit, description)
      VALUES (${t.name}, ${t.unit}, ${t.description})
      ON CONFLICT (name) DO NOTHING
    `;
  }
  console.log('✅ 3 test definitions seeded: Moisture, Ash, Gross Calorific Value');
  console.log('\n🎉 Database setup complete! (v3)');
  process.exit(0);
}

setup().catch(err => { console.error('❌ Setup failed:', err); process.exit(1); });
