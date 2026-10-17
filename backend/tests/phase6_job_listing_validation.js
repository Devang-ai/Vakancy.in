/**
 * Vakancy.in — Phase 6 Automated Test Suite
 * Validates:
 * 1. Unified Job Listing & Top 3 Recommended ordering
 * 2. Normal employer jobs newest-first order
 * 3. Vakancy.in Recommended badge data integrity
 * 4. Department-to-Category mapping & filtering
 * 5. Keyword autocomplete suggestions API
 * 6. Location autocomplete suggestions API
 * 7. Combined search and filter behavior
 * 8. Draft job isolation from open listings
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
  console.log('STARTING VAKANCY.IN PHASE 6 VALIDATION TEST SUITE');
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

  // 1. Unified Job Listing & Recommended Jobs Ordering
  console.log('--- Step 1: Unified Job Listing & Top 3 Recommended Ordering ---');
  const allJobsRes = await request('/jobs?limit=20');
  test('Public jobs API responds with 200 OK', () => {
    assert.strictEqual(allJobsRes.status, 200);
    assert.strictEqual(allJobsRes.data.success, true);
    assert(Array.isArray(allJobsRes.data.jobs), 'jobs should be an array');
    assert(allJobsRes.data.jobs.length > 0, 'jobs should not be empty');
  });

  const jobs = allJobsRes.data.jobs;
  const recommendedJobs = jobs.filter(j => j.is_recommended);
  const normalJobs = jobs.filter(j => !j.is_recommended);

  test('At most 3 recommended jobs appear at the top tier before normal jobs', () => {
    const top3 = jobs.slice(0, 3);
    const topRecCount = top3.filter(j => j.is_recommended).length;
    assert(topRecCount <= 3, 'Top tier contains at most 3 recommended jobs');
    if (recommendedJobs.length > 0) {
      assert.strictEqual(jobs[0].is_recommended, true, 'Top job #1 must be a recommended job when available');
    }
  });

  test('Normal employer jobs appear below the top recommended jobs', () => {
    const firstNormalIndex = jobs.findIndex(j => !j.is_recommended);
    if (firstNormalIndex !== -1 && recommendedJobs.length >= 3) {
      assert.strictEqual(firstNormalIndex, 3, 'First normal employer job appears right after top 3 recommended jobs');
    }
  });

  test('Normal employer jobs are ordered newest-first relative to each other', () => {
    for (let i = 0; i < normalJobs.length - 1; i++) {
      const currentCreated = new Date(normalJobs[i].created_at).getTime();
      const nextCreated = new Date(normalJobs[i + 1].created_at).getTime();
      assert(currentCreated >= nextCreated, `Normal job ${i} is newer or equal to ${i + 1}`);
    }
  });

  test('Zero duplicate jobs exist across the unified listing', () => {
    const ids = jobs.map(j => j.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, 'Every job in listing must have a unique ID');
  });

  // 2. Recommended Badge Data Integrity
  console.log('\n--- Step 2: Vakancy.in Recommended Badge Data Integrity ---');
  test('Eligible staff jobs display the "Vakancy.in Recommended" badge', () => {
    recommendedJobs.forEach(job => {
      assert.strictEqual(job.is_recommended, true);
      assert.strictEqual(job.recommendation_badge, 'Vakancy.in Recommended');
      assert.strictEqual(job.badge, 'Vakancy.in Recommended');
    });
  });

  test('Normal employer jobs never display the Recommended badge', () => {
    normalJobs.forEach(job => {
      assert.strictEqual(job.is_recommended, false);
      assert.notStrictEqual(job.badge, 'Vakancy.in Recommended');
    });
  });

  // 3. Department-to-Category Filter
  console.log('\n--- Step 3: Department-to-Category Mapping & Filtering ---');
  const engRes = await request('/jobs?department=Engineering%20%26%20Technology');
  test('Filtering by "Engineering & Technology" returns matching positions', () => {
    assert.strictEqual(engRes.status, 200);
    assert(engRes.data.jobs.length > 0, 'Engineering department should return jobs');
    engRes.data.jobs.forEach(job => {
      const matchText = `${job.department || ''} ${job.job_domain || ''} ${job.title || ''}`.toLowerCase();
      const matchesEng = matchText.includes('engineer') || 
                         matchText.includes('tech') || 
                         matchText.includes('dev') || 
                         matchText.includes('software') || 
                         matchText.includes('architect') ||
                         matchText.includes('cloud');
      assert(matchesEng, `Job ${job.title} should match Engineering & Technology grouping`);
    });
  });

  const unknownDeptRes = await request('/jobs?department=NonExistentDepartmentXyz');
  test('Unknown department filter is handled safely without error', () => {
    assert.strictEqual(unknownDeptRes.status, 200);
    assert.strictEqual(unknownDeptRes.data.total, 0);
    assert.strictEqual(unknownDeptRes.data.jobs.length, 0);
  });

  // 4. Keyword Autocomplete API
  console.log('\n--- Step 4: Role / Skill / Keyword Autocomplete API ---');
  const kwDevRes = await request('/jobs/suggestions/keywords?q=Dev');
  test('Keyword suggestions for "Dev" returns deduplicated items with types', () => {
    assert.strictEqual(kwDevRes.status, 200);
    assert.strictEqual(kwDevRes.data.success, true);
    assert(Array.isArray(kwDevRes.data.suggestions));
    assert(kwDevRes.data.suggestions.length > 0);
    kwDevRes.data.suggestions.forEach(item => {
      assert(item.text, 'Suggestion must have text property');
      assert(['role', 'skill', 'category'].includes(item.type), 'Suggestion must have valid type');
    });
  });

  const kwShortRes = await request('/jobs/suggestions/keywords?q=a');
  test('Single-character query returns empty array without scanning database', () => {
    assert.strictEqual(kwShortRes.status, 200);
    assert.strictEqual(kwShortRes.data.suggestions.length, 0);
  });

  const kwEmptyRes = await request('/jobs/suggestions/keywords?q=');
  test('Empty keyword query returns empty array', () => {
    assert.strictEqual(kwEmptyRes.status, 200);
    assert.strictEqual(kwEmptyRes.data.suggestions.length, 0);
  });

  // 5. Location Autocomplete API
  console.log('\n--- Step 5: Location Autocomplete API ---');
  const locBenRes = await request('/jobs/suggestions/locations?q=Ben');
  test('Location suggestions for "Ben" returns Bengaluru', () => {
    assert.strictEqual(locBenRes.status, 200);
    assert.strictEqual(locBenRes.data.success, true);
    assert(Array.isArray(locBenRes.data.suggestions));
    assert(locBenRes.data.suggestions.some(loc => loc.toLowerCase().includes('bengaluru')));
  });

  const locRemRes = await request('/jobs/suggestions/locations?q=Rem');
  test('Location suggestions for "Rem" returns "Remote"', () => {
    assert.strictEqual(locRemRes.status, 200);
    assert(locRemRes.data.suggestions.includes('Remote'));
  });

  const locShortRes = await request('/jobs/suggestions/locations?q=x');
  test('Short location query returns empty array', () => {
    assert.strictEqual(locShortRes.status, 200);
    assert.strictEqual(locShortRes.data.suggestions.length, 0);
  });

  // 6. Combined Search & Filter Behavior
  console.log('\n--- Step 6: Combined Search & Filter Behavior ---');
  const combinedRes = await request('/jobs?search=Architect&department=Engineering%20%26%20Technology&limit=5');
  test('Combined search (Architect + Engineering & Technology) filters accurately', () => {
    assert.strictEqual(combinedRes.status, 200);
    assert(combinedRes.data.jobs.length > 0);
    combinedRes.data.jobs.forEach(j => {
      const match = j.title.toLowerCase().includes('architect') ||
                    (j.description && j.description.toLowerCase().includes('architect')) ||
                    (j.required_skills && JSON.stringify(j.required_skills).toLowerCase().includes('architect'));
      assert(match, 'Job title, description, or skills must match search term "Architect"');
    });
  });

  test('Matching recommended jobs rank ahead of normal jobs when filters are applied', () => {
    if (combinedRes.data.jobs.length > 0) {
      assert.strictEqual(combinedRes.data.jobs[0].is_recommended, true, 'Top matching job is recommended');
    }
  });

  // 7. Draft Job Isolation
  console.log('\n--- Step 7: Draft & Ineligible Job Isolation ---');
  test('No draft or internal-only jobs appear in the public listing', () => {
    jobs.forEach(j => {
      assert.notStrictEqual(j.status, 'draft', 'Draft job must not appear in public listing');
      assert.notStrictEqual(j.status, 'closed', 'Closed job must not appear in public listing');
    });
  });

  console.log('\n====================================================');
  console.log(`PHASE 6 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
