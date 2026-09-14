// Deletes loads created by this suite (customer_name starting with "QA ")
// from the dedicated TEST Supabase project, so accumulated test data
// doesn't slow down the dashboard/mutations over many test runs.
//
// Child rows (addl_costs, addl_cost_proofs, load_documents,
// load_stop_events) cascade automatically via ON DELETE CASCADE — see
// exTransact's migrations. Storage objects (uploaded proof/doc images) are
// NOT deleted by this script; that's a known gap, not currently worth the
// extra complexity since it doesn't affect query/mutation speed.
//
// Usage:
//   npm run cleanup:test-loads            (dry run — lists matches, deletes nothing)
//   npm run cleanup:test-loads -- --confirm  (actually deletes)

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

// Hard safety net: this script must never be able to touch anything but the
// known dedicated test project, even if SUPABASE_URL is ever misconfigured
// or accidentally pointed at the real project.
const TEST_PROJECT_REF = 'anblsjhzermpeghmywwz';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env — see .env.sample.');
    process.exitCode = 1;
    return;
  }

  if (!supabaseUrl.includes(TEST_PROJECT_REF)) {
    console.error(
      `Refusing to run: SUPABASE_URL does not point at the known test project (${TEST_PROJECT_REF}). ` +
      `Got: ${supabaseUrl}`,
    );
    process.exitCode = 1;
    return;
  }

  const confirm = process.argv.includes('--confirm');
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  const matchQuery = 'customer_name=like.QA*&select=id,customer_name,created_at';
  const listRes = await fetch(`${supabaseUrl}/rest/v1/loads?${matchQuery}`, { headers });
  if (!listRes.ok) {
    console.error(`Failed to list matching loads: ${listRes.status} ${await listRes.text()}`);
    process.exitCode = 1;
    return;
  }
  const matches = await listRes.json();

  if (matches.length === 0) {
    console.log('No QA-prefixed test loads found. Nothing to clean up.');
    return;
  }

  if (!confirm) {
    console.log(`Dry run — ${matches.length} load(s) would be deleted:`);
    for (const load of matches) {
      console.log(`  ${load.created_at}  ${load.customer_name}  (${load.id})`);
    }
    console.log('\nRe-run with --confirm to actually delete these.');
    return;
  }

  const deleteRes = await fetch(`${supabaseUrl}/rest/v1/loads?${matchQuery.split('&select=')[0]}`, {
    method: 'DELETE',
    headers: { ...headers, Prefer: 'return=representation' },
  });
  if (!deleteRes.ok) {
    console.error(`Delete failed: ${deleteRes.status} ${await deleteRes.text()}`);
    process.exitCode = 1;
    return;
  }
  const deleted = await deleteRes.json();
  console.log(`Deleted ${deleted.length} QA-prefixed test load(s) and their cascaded child rows.`);
}

main();
