// Requires @electric-sql/pglite, or PGLITE_MODULE pointing to its module URL.
// Tests the real migration against a minimal Postgres schema. Cron is stubbed;
// scheduling must also be checked in Supabase after applying the migration.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
for (const legacySchema of [false, true]) {
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema cron;
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('test.user_id', true), '')::uuid $$;
    create table auth.users(id uuid primary key, last_sign_in_at timestamptz);
    create table public.profiles(id uuid primary key references auth.users,
      role text, status text, admin_status text, created_at timestamptz default now());
    create table public.student_activity_daily(student_id uuid references profiles,
      activity_date date, first_seen_at timestamptz, last_seen_at timestamptz,
      active_seconds integer, page_views integer, submit_actions integer,
      unique(student_id, activity_date));
    create table public.student_activity_events(student_id uuid, event_type text,
      path text, label text);
    create table cron.jobs(name text, schedule text, command text);
    create function cron.schedule(text, text, text) returns bigint language sql as
      $$ insert into cron.jobs values ($1, $2, $3) returning 1::bigint $$;
  `);
  const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
  for (let n = 1; n <= 6; n++) {
    await db.query(`insert into auth.users values ($1, $2::timestamptz)`,
      [id(n), n === 2 ? new Date().toISOString() : null]);
    await db.query(`insert into profiles values ($1, $2, $3, 'active', now() - interval '10 days')`,
      [id(n), n === 4 ? 'admin' : n === 5 ? 'teacher' : 'student', n === 6 ? 'pending' : 'approved']);
  }
  await db.query(`insert into student_activity_daily values
    ($1, current_date, now(), now(), 30, 1, 0)`, [id(3)]);
  if (legacySchema) await db.exec('alter table profiles drop column admin_status');
  const migration = await readFile(new URL('../supabase/migrations/20260913000000_auto_deactivate_inactive_students.sql', import.meta.url), 'utf8');
  await db.exec(migration.replace('create extension if not exists pg_cron with schema pg_catalog;', ''));
  const status = async n => (await db.query('select status, admin_status from profiles where id=$1', [id(n)])).rows[0];
  assert.deepEqual(await status(1), {status: 'rejected', admin_status: 'inactive'});
  for (const n of [2, 3, 4, 5]) assert.equal((await status(n)).status, 'approved');
  assert.equal((await status(6)).status, 'pending');

  // Admin activation starts a fresh week, including status-only legacy controls.
  await db.query(`update profiles set status='approved' where id=$1`, [id(1)]);
  await db.exec('select deactivate_inactive_students()');
  assert.equal((await status(1)).status, 'approved');

  // A returning student cannot renew an already-expired clock before cron runs.
  await db.query(`update student_inactivity_clock set last_active_at=now()-interval '8 days' where student_id=$1`, [id(1)]);
  await db.query(`select set_config('test.user_id', $1, false)`, [id(1)]);
  await db.exec(`select record_student_activity('page_view', '/student')`);
  assert.equal((await status(1)).status, 'rejected');
  await assert.rejects(db.exec(`select record_student_activity('heartbeat', '/student')`), /Only approved students/);

  // Activity renews the clock for a student who is still within seven days.
  await db.query(`update student_inactivity_clock set last_active_at=now()-interval '6 days' where student_id=$1`, [id(2)]);
  await db.query(`select set_config('test.user_id', $1, false)`, [id(2)]);
  await db.exec(`select record_student_activity('heartbeat', '/student', null, 30)`);
  assert.equal((await db.query(`select last_active_at > now()-interval '1 minute' as fresh from student_inactivity_clock where student_id=$1`, [id(2)])).rows[0].fresh, true);
  await assert.rejects(db.exec(`select record_student_activity(null, '/student')`), /Unsupported activity type/);

  // Exactly seven days is expired; the job is idempotent and data is retained.
  await db.exec('begin');
  await db.query(`update student_inactivity_clock set last_active_at=now()-interval '7 days' where student_id=$1`, [id(3)]);
  assert.equal((await db.query('select deactivate_inactive_students() as n')).rows[0].n, 1);
  assert.equal((await db.query('select deactivate_inactive_students() as n')).rows[0].n, 0);
  await db.exec('commit');
  assert.equal((await db.query('select count(*)::int as n from student_activity_daily where student_id=$1', [id(3)])).rows[0].n, 1);
  assert.equal((await db.query('select schedule from cron.jobs')).rows[0].schedule, '* * * * *');
  assert.equal((await db.query(`select has_function_privilege('authenticated', 'public.deactivate_inactive_students()', 'execute') as allowed`)).rows[0].allowed, false);
  assert.equal((await db.query(`select has_table_privilege('authenticated', 'public.student_inactivity_clock', 'update') as allowed`)).rows[0].allowed, false);
  console.log(`PASS (${legacySchema ? 'legacy schema without admin_status' : 'current schema'}): inactivity backfill, role exclusions, pending accounts, activation, expiry, activity renewal, retained history, schedule, and permissions.`);
} finally {
  await db.close();
}
}
