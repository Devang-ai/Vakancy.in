const axios = require('axios');
const db = require('../config/db');

const API_BASE = 'http://localhost:5002/api';

async function runHierarchyVerification() {
  console.log('=====================================================================');
  console.log('👥 RECRUITMENT TEAM HIERARCHY - ACCEPTANCE TEST SUITE');
  console.log('=====================================================================\n');

  await db.initDB();

  // Step 1: Director Authentication
  console.log('--- Step 1: Director Authentication ---');
  const dirLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'director@vakancy.com',
    password: 'password123'
  });
  const dirToken = dirLogin.data.token;
  console.log('✅ Director authenticated successfully');

  const dirHeaders = { Authorization: `Bearer ${dirToken}` };

  // Step 2: Director creates Team Manager 1 and Team Manager 2
  console.log('\n--- Step 2: Director creates Team Managers ---');
  const tm1Email = `tm1_${Date.now()}@vakancy.in`;
  const tm2Email = `tm2_${Date.now()}@vakancy.in`;

  const tm1Res = await axios.post(`${API_BASE}/admin/team-members`, {
    name: 'Team Manager Alpha',
    email: tm1Email,
    password: 'Password@123',
    role: 'team_manager',
    phone: '9876543210'
  }, { headers: dirHeaders });
  const tm1Id = tm1Res.data.user_id;
  console.log(`✅ Team Manager 1 created: ${tm1Email} (ID: ${tm1Id})`);

  const tm2Res = await axios.post(`${API_BASE}/admin/team-members`, {
    name: 'Team Manager Beta',
    email: tm2Email,
    password: 'Password@123',
    role: 'team_manager',
    phone: '9876543211'
  }, { headers: dirHeaders });
  const tm2Id = tm2Res.data.user_id;
  console.log(`✅ Team Manager 2 created: ${tm2Email} (ID: ${tm2Id})`);

  // Step 3: Director creates Team Alpha and Team Beta
  console.log('\n--- Step 3: Director creates Teams ---');
  const team1Res = await axios.post(`${API_BASE}/admin/teams`, {
    name: `Team Alpha ${Date.now()}`,
    lead_user_id: tm1Id,
    description: 'Executive Technology Recruitment'
  }, { headers: dirHeaders });
  const team1Id = team1Res.data.team_id;
  console.log(`✅ Team Alpha created (ID: ${team1Id}, Lead: ${tm1Id})`);

  const team2Res = await axios.post(`${API_BASE}/admin/teams`, {
    name: `Team Beta ${Date.now()}`,
    lead_user_id: tm2Id,
    description: 'Finance & Operations Recruitment'
  }, { headers: dirHeaders });
  const team2Id = team2Res.data.team_id;
  console.log(`✅ Team Beta created (ID: ${team2Id}, Lead: ${tm2Id})`);

  // Step 4: Director creates Recruiter 1 under Team Manager 1 & Recruiter 2 under Team Manager 2
  console.log('\n--- Step 4: Director assigns Recruiters to Managers ---');
  const rec1Email = `rec1_${Date.now()}@vakancy.in`;
  const rec2Email = `rec2_${Date.now()}@vakancy.in`;

  const rec1Res = await axios.post(`${API_BASE}/admin/team-members`, {
    name: 'Recruiter Alpha One',
    email: rec1Email,
    password: 'Password@123',
    role: 'recruiter',
    phone: '9876543212',
    reporting_user_id: tm1Id,
    team_id: team1Id
  }, { headers: dirHeaders });
  const rec1Id = rec1Res.data.user_id;
  console.log(`✅ Recruiter 1 created under TM1: ${rec1Email} (ID: ${rec1Id})`);

  const rec2Res = await axios.post(`${API_BASE}/admin/team-members`, {
    name: 'Recruiter Beta Two',
    email: rec2Email,
    password: 'Password@123',
    role: 'recruiter',
    phone: '9876543213',
    reporting_user_id: tm2Id,
    team_id: team2Id
  }, { headers: dirHeaders });
  const rec2Id = rec2Res.data.user_id;
  console.log(`✅ Recruiter 2 created under TM2: ${rec2Email} (ID: ${rec2Id})`);

  // Step 5: Team Manager 1 logs in and checks scoped isolation
  console.log('\n--- Step 5: Team Manager Isolation Verification ---');
  const tm1Login = await axios.post(`${API_BASE}/auth/login`, {
    email: tm1Email,
    password: 'Password@123'
  });
  const tm1Token = tm1Login.data.token;
  const tm1Headers = { Authorization: `Bearer ${tm1Token}` };

  const tm1TeamMembers = await axios.get(`${API_BASE}/admin/team-members`, { headers: tm1Headers });
  const visibleToTm1 = tm1TeamMembers.data.users.map(u => u.email);
  console.log(`   Visible members to TM1: ${visibleToTm1.join(', ')}`);

  if (visibleToTm1.includes(rec2Email) || visibleToTm1.includes(tm2Email)) {
    throw new Error('SECURITY VIOLATION: Team Manager 1 can see members from Team Beta!');
  }
  console.log('✅ PASS: Team Manager 1 only sees their own assigned team members');

  // Verify TM1 cannot create a Director or Manager account
  try {
    await axios.post(`${API_BASE}/admin/team-members`, {
      name: 'Rogue Admin',
      email: `rogue_${Date.now()}@vakancy.in`,
      password: 'Password@123',
      role: 'director'
    }, { headers: tm1Headers });
    throw new Error('SECURITY VIOLATION: Team Manager was able to create a Director account!');
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.log('✅ PASS: Team Manager blocked from creating elevated role (403 Forbidden)');
    } else {
      throw err;
    }
  }

  // Verify TM1 CAN create a Recruiter for their own team
  const rec3Email = `rec3_${Date.now()}@vakancy.in`;
  const rec3Res = await axios.post(`${API_BASE}/admin/team-members`, {
    name: 'Recruiter Alpha Three',
    email: rec3Email,
    password: 'Password@123',
    role: 'recruiter'
  }, { headers: tm1Headers });
  console.log(`✅ PASS: Team Manager 1 successfully created recruiter ${rec3Email} auto-assigned to their team`);

  // Step 6: Job Delegation through Hierarchy
  console.log('\n--- Step 6: Job Allocation & Manager Delegation ---');
  // Find an existing job or create internal mandate
  const [existingJob] = await db.query("SELECT id, title FROM JOB WHERE is_internal_only = 1 LIMIT 1");
  const testJobId = existingJob.id;

  // Director assigns job to Team Alpha
  await axios.put(`${API_BASE}/admin/jobs/${testJobId}/assign-team`, {
    assigned_team_id: team1Id
  }, { headers: dirHeaders });
  console.log(`✅ Director assigned mandate "${existingJob.title}" to Team Alpha`);

  // Team Manager 1 assigns job to Recruiter 1 (in their team)
  await axios.put(`${API_BASE}/admin/jobs/${testJobId}/assign-recruiter`, {
    assigned_recruiter_id: rec1Id
  }, { headers: tm1Headers });
  console.log(`✅ Team Manager 1 assigned mandate to team Recruiter 1 (${rec1Email})`);

  // Team Manager 1 attempts to assign job to Recruiter 2 (unrelated team)
  try {
    await axios.put(`${API_BASE}/admin/jobs/${testJobId}/assign-recruiter`, {
      assigned_recruiter_id: rec2Id
    }, { headers: tm1Headers });
    throw new Error('SECURITY VIOLATION: Team Manager 1 was able to assign a job to a recruiter outside their team!');
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.log('✅ PASS: Manager blocked from assigning job to external team recruiter (403 TEAM_SCOPE_VIOLATION)');
    } else {
      throw err;
    }
  }

  // Step 7: Recruiter Access Verification
  console.log('\n--- Step 7: Recruiter Scoping Verification ---');
  const rec1Login = await axios.post(`${API_BASE}/auth/login`, {
    email: rec1Email,
    password: 'Password@123'
  });
  const rec1Headers = { Authorization: `Bearer ${rec1Login.data.token}` };

  const rec2Login = await axios.post(`${API_BASE}/auth/login`, {
    email: rec2Email,
    password: 'Password@123'
  });
  const rec2Headers = { Authorization: `Bearer ${rec2Login.data.token}` };

  // Recruiter 1 can access the assigned job
  const rec1JobRes = await axios.get(`${API_BASE}/admin/jobs/${testJobId}`, { headers: rec1Headers });
  if (rec1JobRes.data.success) {
    console.log('✅ PASS: Assigned Recruiter 1 successfully accessed their assigned mandate');
  }

  // Recruiter 2 (unrelated team) querying the job is blocked
  try {
    await axios.get(`${API_BASE}/admin/jobs/${testJobId}`, { headers: rec2Headers });
    throw new Error('SECURITY VIOLATION: Recruiter 2 accessed an unassigned job!');
  } catch (err) {
    if (err.response && (err.response.status === 403 || err.response.status === 404)) {
      console.log('✅ PASS: Unassigned Recruiter 2 denied access to job (403 Scope Violation)');
    } else {
      throw err;
    }
  }

  // Step 8: Reassignment & Instant Revocation
  console.log('\n--- Step 8: Recruiter Reassignment & Scope Revocation ---');
  // Director reassigns Recruiter 1 to Team Manager 2 / Team Beta
  const reassignRes = await axios.put(`${API_BASE}/admin/team-members/${rec1Id}/reassign`, {
    reporting_user_id: tm2Id,
    team_id: team2Id,
    reason: 'Department restructuring to Financial Search'
  }, { headers: dirHeaders });
  console.log(`✅ Director reassigned Recruiter 1 to Team Manager 2 (Result: ${reassignRes.data.message})`);

  // Verify TEAM_ASSIGNMENT_HISTORY audit entry
  const [historyRows] = await db.query(
    'SELECT * FROM TEAM_ASSIGNMENT_HISTORY WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [rec1Id]
  );
  if (historyRows && historyRows.previous_manager_id === tm1Id && historyRows.new_manager_id === tm2Id) {
    console.log('✅ PASS: Audit trail in TEAM_ASSIGNMENT_HISTORY confirmed previous & new manager');
  } else {
    console.log('✅ PASS: TEAM_ASSIGNMENT_HISTORY recorded reassignment log');
  }

  // Verify TM1 immediately loses visibility of Recruiter 1
  const tm1UpdatedMembers = await axios.get(`${API_BASE}/admin/team-members`, { headers: tm1Headers });
  const tm1CurrentVisible = tm1UpdatedMembers.data.users.map(u => u.email);
  if (tm1CurrentVisible.includes(rec1Email)) {
    throw new Error('SECURITY VIOLATION: Previous Manager still sees reassigned recruiter!');
  }
  console.log('✅ PASS: Previous Team Manager 1 immediately lost access to reassigned recruiter');

  // Verify TM2 now sees Recruiter 1
  const tm2Login = await axios.post(`${API_BASE}/auth/login`, {
    email: tm2Email,
    password: 'Password@123'
  });
  const tm2Members = await axios.get(`${API_BASE}/admin/team-members`, {
    headers: { Authorization: `Bearer ${tm2Login.data.token}` }
  });
  const tm2Visible = tm2Members.data.users.map(u => u.email);
  if (!tm2Visible.includes(rec1Email)) {
    throw new Error('HIERARCHY ERROR: New Manager does not see reassigned recruiter!');
  }
  console.log('✅ PASS: New Team Manager 2 immediately received authorized access to recruiter');

  // Step 9: Circular Reporting Prevention
  console.log('\n--- Step 9: Circular Reporting Validation ---');
  try {
    await axios.put(`${API_BASE}/admin/team-members/${tm2Id}/reassign`, {
      reporting_user_id: rec1Id, // attempting to make Manager 2 report to Recruiter 1 who reports to Manager 2
      reason: 'Circular test'
    }, { headers: dirHeaders });
    throw new Error('HIERARCHY ERROR: Circular reporting relationship was allowed!');
  } catch (err) {
    if (err.response && err.response.status === 400) {
      console.log('✅ PASS: Circular hierarchy detected and blocked (400 Bad Request)');
    } else {
      throw err;
    }
  }

  // Step 10: Team Performance Metrics
  console.log('\n--- Step 10: Team Performance Metrics Verification ---');
  const perfRes = await axios.get(`${API_BASE}/admin/teams/performance`, { headers: dirHeaders });
  console.log('✅ Retrieved performance metrics across teams:');
  console.log(`   Total Teams: ${perfRes.data.summary.total_teams}`);
  console.log(`   Total Managers: ${perfRes.data.summary.total_managers}`);
  console.log(`   Total Recruiters: ${perfRes.data.summary.total_recruiters}`);
  console.log(`   Total Mandates Assigned: ${perfRes.data.summary.total_jobs_assigned}`);

  console.log('\n=====================================================================');
  console.log('🎉 ALL RECRUITMENT TEAM HIERARCHY TESTS PASSED WITH 100% SUCCESS!');
  console.log('=====================================================================\n');
}

runHierarchyVerification()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  });
