/* Google Cloud Storage end-to-end diagnostic.
   Checks: env config -> keyfile exists & parses -> authenticates -> bucket
   exists & is reachable -> can list objects -> can generate a signed URL.
   Run: npx tsx --env-file=.env scripts/diag-gcs.ts */
import 'dotenv/config';
import { Storage } from '@google-cloud/storage';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const log = (label: string, val: unknown) => console.log(`  ${label.padEnd(28)} ${val}`);
const ok = (msg: string) => console.log(`✓ ${msg}`);
const warn = (msg: string) => console.log(`⚠ ${msg}`);
const fail = (msg: string) => console.log(`✗ ${msg}`);

async function main() {
  console.log('\n--- 1. env config ---');
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
  const keyFile = process.env.GOOGLE_CLOUD_KEYFILE;
  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;
  const folder = process.env.GCS_FOLDER;
  log('GOOGLE_CLOUD_PROJECT_ID', projectId || '(unset)');
  log('GOOGLE_CLOUD_BUCKET_NAME', bucketName || '(unset)');
  log('GOOGLE_CLOUD_KEYFILE', keyFile || '(unset)');
  log('GOOGLE_CLOUD_CREDENTIALS_JSON', credentialsJson ? `<${credentialsJson.length} chars>` : '(unset)');
  log('GCS_FOLDER', folder || '(unset)');
  if (!projectId) fail('GOOGLE_CLOUD_PROJECT_ID is required');
  if (!bucketName) fail('GOOGLE_CLOUD_BUCKET_NAME is required');

  console.log('\n--- 2. credentials source ---');
  let storage: Storage;
  let saEmail = '<unknown>';
  let saProjectId = '<unknown>';

  if (credentialsJson) {
    try {
      const creds = JSON.parse(credentialsJson);
      saEmail = creds.client_email || '<missing>';
      saProjectId = creds.project_id || '<missing>';
      ok(`Using GOOGLE_CLOUD_CREDENTIALS_JSON (sa: ${saEmail})`);
      storage = new Storage({ projectId: projectId || creds.project_id, credentials: creds });
    } catch (e: any) {
      fail(`GOOGLE_CLOUD_CREDENTIALS_JSON is not valid JSON: ${e.message}`);
      process.exit(2);
    }
  } else if (keyFile) {
    const abs = resolve(keyFile);
    log('keyfile resolved to', abs);
    if (!existsSync(abs)) {
      fail(`keyfile does NOT exist at: ${abs}`);
      process.exit(2);
    }
    const st = statSync(abs);
    log('keyfile size', `${st.size} bytes`);
    try {
      const raw = readFileSync(abs, 'utf8');
      const json = JSON.parse(raw);
      saEmail = json.client_email || '<missing>';
      saProjectId = json.project_id || '<missing>';
      log('client_email', saEmail);
      log('project_id (in keyfile)', saProjectId);
      log('private_key length', json.private_key ? json.private_key.length : 0);
      if (!json.client_email) fail('keyfile has no client_email');
      if (!json.private_key) fail('keyfile has no private_key');
      if (projectId && json.project_id && projectId !== json.project_id) {
        warn(`env projectId (${projectId}) != keyfile project_id (${json.project_id})`);
      } else {
        ok('keyfile parses + project_id matches');
      }
    } catch (e: any) {
      fail(`could not parse keyfile: ${e.message}`);
      process.exit(2);
    }
    storage = new Storage({ projectId, keyFilename: abs });
  } else {
    warn('No GOOGLE_CLOUD_CREDENTIALS_JSON and no GOOGLE_CLOUD_KEYFILE - falling back to ADC');
    storage = new Storage({ projectId });
  }

  console.log('\n--- 3. authenticate ---');
  try {
    const auth = (storage as any).authClient;
    const accessToken = await auth.getAccessToken();
    if (accessToken && accessToken.token) {
      ok(`auth OK, access token length=${accessToken.token.length}`);
    } else if (typeof accessToken === 'string') {
      ok(`auth OK, access token length=${accessToken.length}`);
    } else {
      warn('auth returned but token shape unexpected: ' + JSON.stringify(Object.keys(accessToken || {})));
    }
  } catch (e: any) {
    fail(`authentication failed: ${e.message}`);
    process.exit(3);
  }

  console.log('\n--- 4. bucket exists ---');
  if (!bucketName) {
    fail('skipping bucket check - no bucket name configured');
    process.exit(2);
  }
  const bucket = storage.bucket(bucketName);
  try {
    const [exists] = await bucket.exists();
    if (exists) ok(`bucket ${bucketName} exists & service account can see it`);
    else {
      fail(`bucket ${bucketName} does not exist (or service account has no access)`);
      process.exit(4);
    }
  } catch (e: any) {
    fail(`bucket.exists() error: ${e.message}`);
    if (/403|denied|permission/i.test(e.message)) {
      console.log('  hint: service account needs roles/storage.admin or roles/storage.objectViewer on the bucket');
    }
    process.exit(4);
  }

  console.log('\n--- 5. bucket metadata ---');
  try {
    const [meta] = await bucket.getMetadata();
    log('location', meta.location);
    log('storageClass', meta.storageClass);
    log('uniformBucketLevelAccess', meta.iamConfiguration?.uniformBucketLevelAccess?.enabled);
    log('publicAccessPrevention', meta.iamConfiguration?.publicAccessPrevention);
    log('created', meta.timeCreated);
  } catch (e: any) {
    warn(`getMetadata error: ${e.message}`);
  }

  console.log('\n--- 6. list objects (max 5) ---');
  try {
    const [files] = await bucket.getFiles({ maxResults: 5, prefix: folder ? `${folder.replace(/^\/+|\/+$/g, '')}/` : undefined });
    log('matching files', files.length);
    for (const f of files) console.log(`    - ${f.name} (${f.metadata.size} bytes)`);
    if (files.length === 0) warn(`no objects under prefix "${folder || '<root>'}"`);
    else ok('list-objects works');
  } catch (e: any) {
    fail(`list-objects error: ${e.message}`);
  }

  console.log('\n--- 7. signed-URL generation ---');
  try {
    const sample = `${(folder || '').replace(/^\/+|\/+$/g, '')}/diag-probe.txt`;
    const [signed] = await bucket.file(sample).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60_000,
    });
    ok('signed URL generated');
    log('preview', signed.slice(0, 90) + '...');
  } catch (e: any) {
    fail(`signed URL error: ${e.message}`);
    if (/iam.serviceAccountTokenCreator|service.account.cannot.sign/i.test(e.message)) {
      console.log('  hint: the service account needs roles/iam.serviceAccountTokenCreator on itself');
    }
  }

  console.log('\n--- summary ---');
  console.log(`  service account : ${saEmail}`);
  console.log(`  bucket          : ${bucketName}`);
  console.log(`  prefix          : ${folder || '<none>'}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
