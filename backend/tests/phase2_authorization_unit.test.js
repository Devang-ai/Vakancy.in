const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/db');
const { getUserScope, requireScopedApplication, checkPermission } = require('../middleware/rbacMiddleware');

async function withSyntheticQueries(handler, action) {
  const original = db.query;
  db.query = handler;
  try { await action(); } finally { db.query = original; }
}

test('recruiter receives direct assignments but not another team member assignments', async () => {
  await withSyntheticQueries(async (sql) => {
    if (sql.includes('FROM USER_ASSIGNMENTS WHERE user_id')) return [{ team_id: 'team-a', assigned_job_id: 'job-own', assigned_client_id: null, scope_type: 'scoped' }];
    if (sql.includes('FROM TEAMS')) return [];
    if (sql.includes('assigned_recruiter_id = ?')) return [{ id: 'job-direct' }];
    if (sql.includes('employer_id IN')) return [];
    throw new Error(`Unexpected synthetic query: ${sql}`);
  }, async () => {
    const scope = await getUserScope('recruiter-a', 'recruiter');
    assert.deepEqual(scope.jobIds.sort(), ['job-direct', 'job-own']);
  });
});

test('team lead receives jobs belonging to the led team', async () => {
  await withSyntheticQueries(async (sql) => {
    if (sql.includes('FROM USER_ASSIGNMENTS WHERE user_id')) return [];
    if (sql.includes('FROM TEAMS')) return [{ id: 'team-a' }];
    if (sql.includes('reporting_user_id = ?')) return [];
    if (sql.includes('assigned_team_id IN')) return [];
    if (sql.includes('FROM USER_ASSIGNMENTS WHERE team_id IN')) return [{ user_id: 'recruiter-a', assigned_job_id: 'job-team', assigned_client_id: null }];
    if (sql.includes('FROM USERS WHERE team_id IN')) return [{ id: 'recruiter-a' }];
    if (sql.includes('assigned_recruiter_id IN')) return [{ id: 'job-recruiter' }];
    if (sql.includes('assigned_recruiter_id = ?')) return [];
    if (sql.includes('employer_id IN')) return [];
    throw new Error(`Unexpected synthetic query: ${sql}`);
  }, async () => {
    const scope = await getUserScope('tl-a', 'tl_coordinator');
    assert.deepEqual(scope.jobIds.sort(), ['job-recruiter', 'job-team']);
  });
});

test('director retains intended global scope', async () => {
  assert.equal((await getUserScope('director-a', 'director')).isGlobal, true);
});

test('custom role needs explicit permission', async () => {
  await withSyntheticQueries(async () => [], async () => {
    const middleware = checkPermission('applications', 'edit');
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await middleware({ user: { id: 'custom-a', role: 'custom_reviewer' } }, response, () => assert.fail('must not pass'));
    assert.equal(response.statusCode, 403);
  });
});

test('application scope rejects an unassigned synthetic job', async () => {
  await withSyntheticQueries(async (sql) => {
    if (sql.includes('FROM APPLICATION')) return [{ job_id: 'job-other' }];
    if (sql.includes('FROM USER_ASSIGNMENTS WHERE user_id')) return [{ assigned_job_id: 'job-own', team_id: null, assigned_client_id: null, scope_type: 'scoped' }];
    if (sql.includes('FROM TEAMS')) return [];
    if (sql.includes('assigned_recruiter_id = ?')) return [];
    if (sql.includes('employer_id IN')) return [];
    throw new Error(`Unexpected synthetic query: ${sql}`);
  }, async () => {
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await requireScopedApplication({ params: { id: 'application-other' }, user: { id: 'recruiter-a', role: 'recruiter' } }, response, () => assert.fail('must not pass'));
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, 'SCOPE_ACCESS_DENIED');
  });
});
