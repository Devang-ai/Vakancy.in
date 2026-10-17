/**
 * Vakancy.in — Phase 7 Automated Validation Suite
 *
 * Validates:
 * 1. Default Listing: all published jobs strictly in newest-first order (created_at DESC).
 * 2. No artificial pinning: recommended jobs appear chronologically alongside employer jobs.
 * 3. Recommended Jobs filter: query parameter recommended=true returns strictly recommended jobs.
 * 4. Recommended Jobs filter excludes standard employer jobs.
 * 5. Combined filters: recommended + department, location, keywords.
 * 6. Pagination & Total counts update accurately.
 * 7. Draft and closed job isolation.
 * 8. Autocomplete APIs remain functional.
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:5002/api';

async function request(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING VAKANCY.IN PHASE 7 VALIDATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(desc, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${desc}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // --- Step 1: Default Job Listing & Newest-First Ordering ---
  console.log('--- Step 1: Default Job Listing & Chronological Ordering ---');
  const defaultRes = await request('/jobs?limit=50');
  test('Public jobs API responds with 200 OK', () => {
    assert.strictEqual(defaultRes.status, 200);
    assert.strictEqual(defaultRes.data.success, true);
    assert(Array.isArray(defaultRes.data.jobs));
    assert(defaultRes.data.jobs.length > 0);
  });

  const defaultJobs = defaultRes.data.jobs;

  test('All jobs in default listing are strictly ordered newest-first (created_at DESC)', () => {
    for (let i = 0; i < defaultJobs.length - 1; i++) {
      const current = new Date(defaultJobs[i].created_at).getTime();
      const next = new Date(defaultJobs[i+1].created_at).getTime();
      assert(current >= next, `Job at index ${i} (${defaultJobs[i].created_at}) must be newer or equal to index ${i+1} (${defaultJobs[i+1].created_at})`);
    }
  });

  test('Employer-created and recommended jobs share the unified listing chronologically', () => {
    const hasEmployer = defaultJobs.some(j => !j.is_recommended);
    const hasRec = defaultJobs.some(j => j.is_recommended);
    assert(hasEmployer, 'Unified listing must include employer jobs');
    assert(hasRec, 'Unified listing must include recommended jobs');
  });

  test('Zero duplicate jobs exist across the unified listing', () => {
    const ids = defaultJobs.map(j => j.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, 'No duplicates in jobs list');
  });

  // --- Step 2: Dedicated Recommended Jobs Filter ---
  console.log('\n--- Step 2: Dedicated "Recommended Jobs" Filter ---');
  const recFilterRes = await request('/jobs?recommended=true&limit=50');
  test('Recommended Jobs filter responds with 200 OK', () => {
    assert.strictEqual(recFilterRes.status, 200);
    assert.strictEqual(recFilterRes.data.success, true);
    assert(Array.isArray(recFilterRes.data.jobs));
    assert(recFilterRes.data.jobs.length > 0);
  });

  const recJobs = recFilterRes.data.jobs;

  test('Selecting "Recommended Jobs" filter returns ONLY recommended jobs', () => {
    recJobs.forEach(job => {
      assert.strictEqual(job.is_recommended, true, `Job "${job.title}" must have is_recommended: true`);
      assert.strictEqual(job.badge, 'Vakancy.in Recommended', `Job "${job.title}" must display Vakancy.in Recommended badge`);
    });
  });

  test('Non-recommended employer jobs are completely excluded when recommended=true', () => {
    const nonRecJobs = recJobs.filter(j => !j.is_recommended);
    assert.strictEqual(nonRecJobs.length, 0, 'Zero non-recommended jobs when filter is active');
  });

  test('Recommended jobs returned under filter are also ordered newest-first', () => {
    for (let i = 0; i < recJobs.length - 1; i++) {
      const current = new Date(recJobs[i].created_at).getTime();
      const next = new Date(recJobs[i+1].created_at).getTime();
      assert(current >= next, `Filtered job at index ${i} must be newer or equal to index ${i+1}`);
    }
  });

  test('Recommended filter total count matches filtered array length (or page total)', () => {
    assert.strictEqual(recFilterRes.data.total, recJobs.length, 'Total count matches exactly');
    assert(recFilterRes.data.total < defaultRes.data.total, 'Filtered count is less than all jobs total');
  });

  // --- Step 3: Combined Filters with Recommended Jobs ---
  console.log('\n--- Step 3: Combined Search & Filter Combinations ---');

  // Combined: Recommended + Department
  const recDeptRes = await request('/jobs?recommended=true&department=Engineering%20%26%20Technology&limit=20');
  test('Combined Recommended + Department returns matching positions', () => {
    assert.strictEqual(recDeptRes.status, 200);
    assert(recDeptRes.data.jobs.length > 0);
    recDeptRes.data.jobs.forEach(job => {
      assert.strictEqual(job.is_recommended, true, 'Must be recommended');
      const matchText = (job.title + ' ' + (job.department || '') + ' ' + (job.job_domain || '')).toLowerCase();
      const matchesEng = matchText.includes('engineer') || 
                          matchText.includes('tech') || 
                          matchText.includes('dev') || 
                          matchText.includes('software') || 
                          matchText.includes('architect') ||
                          matchText.includes('cloud');
      assert(matchesEng, `Job "${job.title}" must match Engineering department`);
    });
  });

  // Combined: Recommended + Keyword Search
  const recKeywordRes = await request('/jobs?recommended=true&search=Architect&limit=20');
  test('Combined Recommended + Keyword filters accurately', () => {
    assert.strictEqual(recKeywordRes.status, 200);
    assert(recKeywordRes.data.jobs.length > 0);
    recKeywordRes.data.jobs.forEach(job => {
      assert.strictEqual(job.is_recommended, true, 'Must be recommended');
      const match = job.title.toLowerCase().includes('architect') ||
                    (job.description && job.description.toLowerCase().includes('architect')) ||
                    (job.required_skills && JSON.stringify(job.required_skills).toLowerCase().includes('architect'));
      assert(match, 'Job must match search term Architect');
    });
  });

  // Combined: Recommended + Location
  const recLocRes = await request('/jobs?recommended=true&location=Bengaluru&limit=20');
  test('Combined Recommended + Location filters accurately', () => {
    assert.strictEqual(recLocRes.status, 200);
    assert(recLocRes.data.jobs.length > 0);
    recLocRes.data.jobs.forEach(job => {
      assert.strictEqual(job.is_recommended, true, 'Must be recommended');
      const locMatch = (job.location + ' ' + (job.city || '')).toLowerCase().includes('bengaluru');
      assert(locMatch, `Job location must match Bengaluru: ${job.location}`);
    });
  });

  // Combined: Recommended + Department + Location + Keyword
  const recComboRes = await request('/jobs?recommended=true&department=Engineering%20%26%20Technology&location=Bengaluru&search=Lead&limit=10');
  test('Multi-filter combination (Recommended + Dept + Location + Keyword) executes safely', () => {
    assert.strictEqual(recComboRes.status, 200);
    assert(Array.isArray(recComboRes.data.jobs));
    recComboRes.data.jobs.forEach(job => {
      assert.strictEqual(job.is_recommended, true);
    });
  });

  // --- Step 4: Draft and Closed Jobs Exclusion ---
  console.log('\n--- Step 4: Ineligible Job Isolation ---');
  test('Draft, closed, and internal-only jobs never appear in public listing', () => {
    defaultJobs.forEach(j => {
      assert.notStrictEqual(j.status, 'draft', 'Draft job must not appear');
      assert.notStrictEqual(j.status, 'closed', 'Closed job must not appear');
    });
    recJobs.forEach(j => {
      assert.notStrictEqual(j.status, 'draft', 'Draft job must not appear');
      assert.notStrictEqual(j.status, 'closed', 'Closed job must not appear');
    });
  });

  // --- Step 5: Autocomplete APIs Unaffected ---
  console.log('\n--- Step 5: Autocomplete API Health ---');
  const kwRes = await request('/jobs/suggestions/keywords?q=Dev');
  test('Keyword suggestions endpoint responds with valid suggestions', () => {
    assert.strictEqual(kwRes.status, 200);
    assert(Array.isArray(kwRes.data.suggestions));
    assert(kwRes.data.suggestions.length > 0);
  });

  const locRes = await request('/jobs/suggestions/locations?q=Ben');
  test('Location suggestions endpoint responds with valid suggestions', () => {
    assert.strictEqual(locRes.status, 200);
    assert(Array.isArray(locRes.data.suggestions));
    assert(locRes.data.suggestions.some(l => l.toLowerCase().includes('bengaluru')));
  });

  console.log('\n====================================================');
  console.log(`PHASE 7 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
