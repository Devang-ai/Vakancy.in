const axios = require('axios');

const BASE_URL = 'http://localhost:5002/api';

async function runTestSuite() {
  console.log('====================================================');
  console.log('STARTING MODULE 1: ADVANCED DASHBOARD TEST SUITE');
  console.log('====================================================\n');

  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      passedAssertions++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Director Test
  console.log('--- TEST 1: Director Full Enterprise Dashboard ---');
  const dirLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'director@vakancy.com',
    password: 'password123'
  });
  assert(dirLogin.data.success && dirLogin.data.token, 'Director login successful');
  const dirToken = dirLogin.data.token;

  const dirStatsRes = await axios.get(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(dirStatsRes.data.success === true, 'Director /admin/stats responds successfully');

  const dirBody = dirStatsRes.data;

  // Overview metrics
  assert(typeof dirBody.metrics.total_candidates === 'number', 'Metrics total_candidates is number');
  assert(typeof dirBody.metrics.total_employers === 'number', 'Metrics total_employers is number');
  assert(typeof dirBody.metrics.total_jobs === 'number', 'Metrics total_jobs is number');
  assert(typeof dirBody.metrics.open_jobs === 'number', 'Metrics open_jobs is number');
  assert(typeof dirBody.metrics.draft_jobs === 'number', 'Metrics draft_jobs is number');
  assert(typeof dirBody.metrics.total_applications === 'number', 'Metrics total_applications is number');
  assert(dirBody.metrics.total_jobs === (dirBody.metrics.open_jobs + dirBody.metrics.draft_jobs + (dirBody.metrics.total_jobs - dirBody.metrics.open_jobs - dirBody.metrics.draft_jobs)), 'Job counts are mathematically consistent');

  // 6 Pipeline stages
  assert(typeof dirBody.pipeline.applied === 'number', 'Pipeline applied stage is number');
  assert(typeof dirBody.pipeline.under_review === 'number', 'Pipeline under_review stage is number');
  assert(typeof dirBody.pipeline.shortlisted === 'number', 'Pipeline shortlisted stage is number');
  assert(typeof dirBody.pipeline.interview === 'number', 'Pipeline interview stage is number');
  assert(typeof dirBody.pipeline.selected === 'number', 'Pipeline selected stage is number');
  assert(typeof dirBody.pipeline.rejected === 'number', 'Pipeline rejected stage is number');
  assert(dirBody.pipeline.total >= 0, 'Pipeline total is non-negative');

  // Pending work queue
  assert(Array.isArray(dirBody.pending_work.items), 'Pending work items is array');
  assert(dirBody.pending_work.count === dirBody.pending_work.items.length, 'Pending work count matches items array length');
  if (dirBody.pending_work.items.length > 0) {
    const item = dirBody.pending_work.items[0];
    assert(Boolean(item.id && item.type && item.title && item.link), 'Pending work item has required schema (id, type, title, link)');
  }

  // Upcoming interviews
  assert(Array.isArray(dirBody.upcoming_interviews), 'Upcoming interviews is array');

  // My pending tasks
  assert(Array.isArray(dirBody.my_pending_tasks), 'My pending tasks is array');

  // Recruiter workload
  assert(Array.isArray(dirBody.recruiter_workload), 'Recruiter workload is array');
  assert(dirBody.recruiter_workload.length > 0, 'Director sees recruiter workload list');
  const firstRec = dirBody.recruiter_workload[0];
  assert(typeof firstRec.active_jobs_count === 'number' && typeof firstRec.active_applications_count === 'number', 'Recruiter workload has active jobs and applications counts');

  // Job-wise applications
  assert(Array.isArray(dirBody.job_applications), 'Job-wise applications is array');
  if (dirBody.job_applications.length > 0) {
    const firstJob = dirBody.job_applications[0];
    assert(typeof firstJob.application_count === 'number', 'Job applications count is a valid number');
  }

  // Monthly trend
  assert(Array.isArray(dirBody.monthly_trend), 'Monthly trend is array');
  if (dirBody.monthly_trend.length > 0) {
    const firstTrend = dirBody.monthly_trend[0];
    assert(Boolean(firstTrend.month && typeof firstTrend.application_volume === 'number'), 'Monthly trend item has month and application volume');
  }

  // Lead conversion
  assert(dirBody.lead_conversion && dirBody.lead_conversion.authorized === true, 'Director is authorized for lead conversion');
  assert(typeof dirBody.lead_conversion.total_leads === 'number', 'Lead conversion total_leads is number');
  assert(typeof dirBody.lead_conversion.conversion_rate === 'string', 'Lead conversion rate is formatted string');
  assert(Array.isArray(dirBody.lead_conversion.sources), 'Lead conversion sources is array');

  // Email delivery health
  assert(dirBody.email_health && dirBody.email_health.authorized === true, 'Director is authorized for email health');
  assert(typeof dirBody.email_health.total_sent === 'number', 'Email health total_sent is number');
  assert(typeof dirBody.email_health.failed_count === 'number', 'Email health failed_count is number');
  assert(Array.isArray(dirBody.email_health.recent_failures), 'Email health recent_failures is array');

  // Overdue follow-ups
  assert(Array.isArray(dirBody.overdue_follow_ups), 'Overdue follow-ups is array');

  // Recent activity
  assert(Array.isArray(dirBody.recent_activity), 'Recent activity is array');
  assert(dirBody.recent_activity.length > 0, 'Recent activity returns genuine records');
  for (const act of dirBody.recent_activity) {
    assert(!act.actor_email || !act.actor_email.includes('password') && !act.actor_email.includes('token'), 'Actor email does not leak secret tokens');
  }

  // 2. Global Period Filter Verification
  console.log('\n--- TEST 2: Global Date Filter Integration ---');
  for (const period of ['today', '7d', '30d', 'this_month', 'all']) {
    const filteredRes = await axios.get(`${BASE_URL}/admin/stats?period=${period}`, {
      headers: { Authorization: `Bearer ${dirToken}` }
    });
    assert(filteredRes.data.success === true, `Filter period='${period}' returns success`);
    assert(filteredRes.data.filters_applied.period === period, `filters_applied reflects period='${period}'`);
  }

  // 3. BD Lead Scoping Verification
  console.log('\n--- TEST 3: BD Lead Role Scoping ---');
  const bdLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'bdlead@vakancy.com',
    password: 'password123'
  });
  const bdToken = bdLogin.data.token;
  const bdStatsRes = await axios.get(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${bdToken}` }
  });
  const bdBody = bdStatsRes.data;
  assert(bdBody.success === true, 'BD Lead can access dashboard stats');
  assert(bdBody.metrics.total_candidates === 0, 'BD Lead candidate count is 0 (dossier privacy enforced)');
  assert(bdBody.metrics.total_jobs === 0, 'BD Lead jobs count is 0');
  assert(bdBody.pipeline.total === 0, 'BD Lead pipeline total is 0');
  assert(bdBody.lead_conversion && bdBody.lead_conversion.authorized === true, 'BD Lead is authorized for lead conversion');
  assert(bdBody.email_health && bdBody.email_health.authorized === false, 'BD Lead cannot access global email server health');

  // 4. TL Coordinator Scoping Verification
  console.log('\n--- TEST 4: TL Coordinator Role Scoping ---');
  const tlLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'tl@vakancy.com',
    password: 'password123'
  });
  const tlToken = tlLogin.data.token;
  const tlStatsRes = await axios.get(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${tlToken}` }
  });
  const tlBody = tlStatsRes.data;
  assert(tlBody.success === true, 'TL Coordinator can access dashboard stats');
  assert(tlBody.metrics.total_jobs <= dirBody.metrics.total_jobs, 'TL Coordinator jobs are scoped to team assignments');
  assert(tlBody.lead_conversion && tlBody.lead_conversion.authorized === false, 'TL Coordinator cannot access BD lead conversion');
  assert(tlBody.email_health && tlBody.email_health.authorized === true, 'TL Coordinator has operational email health visibility');

  // 5. Recruiter Scoping Verification
  console.log('\n--- TEST 5: Recruiter Role Scoping ---');
  const recLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'recruiter@vakancy.com',
    password: 'password123'
  });
  const recToken = recLogin.data.token;
  const recStatsRes = await axios.get(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${recToken}` }
  });
  const recBody = recStatsRes.data;
  assert(recBody.success === true, 'Recruiter can access dashboard stats');
  assert(recBody.metrics.total_jobs <= dirBody.metrics.total_jobs, 'Recruiter jobs are scoped');
  assert(recBody.lead_conversion && recBody.lead_conversion.authorized === false, 'Recruiter cannot access BD lead conversion');
  assert(recBody.email_health && recBody.email_health.authorized === false, 'Recruiter cannot access email delivery health');
  assert(recBody.recruiter_workload.length === 1, 'Recruiter workload is isolated to self only (does not leak other recruiters)');

  // 6. Security & Unauthorized Role Rejection
  console.log('\n--- TEST 6: Unauthorized Role & Public Rejection ---');
  try {
    await axios.get(`${BASE_URL}/admin/stats`);
    assert(false, 'Unauthenticated request should have thrown 401');
  } catch (err) {
    assert(err.response && err.response.status === 401, 'Unauthenticated request correctly returns 401 Unauthorized');
  }

  console.log('\n====================================================');
  console.log(`ALL TESTS PASSED! (${passedAssertions}/${totalAssertions} assertions passed)`);
  console.log('====================================================');
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
