const test = require('node:test');
const assert = require('node:assert/strict');
const { getIsolatedTestConfig, RESET_ACKNOWLEDGEMENT } = require('../config/testDatabaseSafety');
const { migrations, validateMigrationOrder } = require('../database/migrations');

const base = {
  NODE_ENV: 'test', DATABASE_TEST_MODE: 'isolated-mysql',
  TEST_DB_HOST: '127.0.0.1', TEST_DB_USER: 'restricted_test_user',
  TEST_DB_PASSWORD: 'synthetic-secret', TEST_DB_NAME: 'vakancy_test_unit',
  DB_HOST: '127.0.0.1', DB_NAME: 'vakancy_main_db'
};

test('isolated database configuration never falls back to application settings', () => {
  assert.throws(() => getIsolatedTestConfig({ NODE_ENV: 'test', DATABASE_TEST_MODE: 'isolated-mysql' }), /Missing isolated/);
});

test('application database identity is rejected', () => {
  assert.throws(() => getIsolatedTestConfig({ ...base, DB_NAME: 'vakancy_test_unit' }), /must not be/);
});

test('unsafe or ambiguous database names are rejected', () => {
  assert.throws(() => getIsolatedTestConfig({ ...base, TEST_DB_NAME: 'test' }), /naming convention/);
});

test('destructive operations require explicit acknowledgement', () => {
  assert.throws(() => getIsolatedTestConfig(base, { destructive: true }), /acknowledgement/);
  assert.equal(getIsolatedTestConfig({ ...base, TEST_DB_RESET_ACK: RESET_ACKNOWLEDGEMENT }, { destructive: true }).database, 'vakancy_test_unit');
});

test('migration identifiers are unique and ordered', () => {
  assert.equal(validateMigrationOrder(), true);
  assert.deepEqual(migrations.map(m => m.id), [
    '001_files',
    '002_scope_and_sharing',
    '003_account_security',
    '004_workflow_integrity',
    '005_company_leads',
    '006_executive_search_enquiry_jobs',
    '007_google_auth',
    '008_email_otp_recovery',
    '009_executive_search_shortlists'
  ]);
});
