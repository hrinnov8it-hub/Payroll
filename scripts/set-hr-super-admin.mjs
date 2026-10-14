import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Credentials stay in memory and are never logged.
const config = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (match) config[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
const url = config.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY;
const hasServiceKey = serviceKey && !serviceKey.includes('your-') && !serviceKey.includes('your_');
// Use the app's existing database connection when no administrative key is configured.
// Database policies must permit the operation; this script does not alter those policies.
const key = hasServiceKey ? serviceKey : config.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('A configured Supabase connection is required.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const hrEmail = 'hr.innov8it@gmail.com';
const ownerEmail = 'superadmin.innov8it@gmail.com';
function check(error, step) {
  if (error) throw new Error(`${step}: ${error.code || error.status || 'request failed'} ${error.message}`);
}

const profiles = await client.from('profiles').select('id, email, role').in('email', [hrEmail, ownerEmail]);
check(profiles.error, 'Read designated profiles');
const hrProfiles = profiles.data.filter((profile) => profile.email.toLowerCase() === hrEmail);
if (process.argv.includes('--inspect')) {
  console.log(JSON.stringify({ profiles: profiles.data.map(({ email, role }) => ({ email, role })) }));
  process.exit(0);
}
if (!hrProfiles.length) {
  if (!hasServiceKey) throw new Error('HR profile was not found. An administrative connection is required to find its auth user. No profiles were removed.');
  let hrUser;
  for (let page = 1; !hrUser; page++) {
    const users = await client.auth.admin.listUsers({ page, perPage: 100 });
    check(users.error, 'Find authenticated HR account');
    hrUser = users.data.users.find((user) => user.email?.toLowerCase() === hrEmail);
    if (users.data.users.length < 100) break;
  }
  if (!hrUser) throw new Error('The authenticated HR account was not found. No profiles were removed.');
  const inserted = await client.from('profiles').upsert({ id: hrUser.id, email: hrEmail, full_name: 'HR Administrator', role: 'super_admin' });
  check(inserted.error, 'Create HR Super Admin profile');
} else {
  const updated = await client.from('profiles').update({ role: 'super_admin', updated_at: new Date().toISOString() }).eq('email', hrEmail).select('id, role');
  check(updated.error, 'Promote HR to Super Admin');
  if (!updated.data?.length || updated.data.some((profile) => profile.role !== 'super_admin')) throw new Error('HR promotion was not confirmed. No profiles were removed.');
}

const removed = await client.from('profiles').delete().eq('email', ownerEmail).select('id');
check(removed.error, 'Remove retired System Owner profile');
const verified = await client.from('profiles').select('email, role').in('email', [hrEmail, ownerEmail]);
check(verified.error, 'Verify profile changes');
if (!verified.data.some((profile) => profile.email === hrEmail && profile.role === 'super_admin') || verified.data.some((profile) => profile.email === ownerEmail)) {
  throw new Error('Database verification did not match the requested roles.');
}
console.log(`Verified: HR is Super Admin. Removed ${removed.data.length} System Owner profile(s).`);
