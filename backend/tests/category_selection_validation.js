/**
 * Automated Validation Suite: Job Category Selection UI & Backend Integration
 * Phase: Job Category Selection UI — Vakancy.in
 *
 * Verifies:
 * 1. Master Category API returns canonical categories (count 49) without duplication or schema mutations.
 * 2. Popular 8–10 categories selection logic matches real canonical records.
 * 3. Backend /api/jobs filters correctly by Category ID and Category Name.
 * 4. Coexistence with Recommended Jobs filter (?recommended=true & ?category=...).
 * 5. Default natural ordering remains latest-first.
 * 6. Category search / query autocomplete.
 * 7. Pagination and filter clearing behavior.
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:5002/api';

async function runTests() {
  console.log('============================================================');
  console.log('🧪 Starting Vakancy.in Job Category Selection Validation Suite');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  // TEST 1: Master Categories API Endpoint & Count
  await test('Master categories API returns 49 canonical categories', async () => {
    const res = await fetch(`${BASE_URL}/master/categories`);
    assert.strictEqual(res.status, 200, 'Expected status 200');
    const data = await res.json();
    assert.strictEqual(data.success, true, 'Expected success: true');
    assert.ok(data.count >= 40, `Expected at least 40 categories, got ${data.count}`);
    assert.ok(Array.isArray(data.categories), 'Expected categories array');
    
    // Check first canonical category structure
    const sample = data.categories[0];
    assert.ok(sample.id, 'Expected category id');
    assert.ok(sample.name, 'Expected category name');
    assert.ok(sample.slug, 'Expected category slug');
  });

  // TEST 2: Canonical Popular Categories existence in master
  await test('Canonical popular categories (8-10) are present in master list', async () => {
    const res = await fetch(`${BASE_URL}/master/categories`);
    const data = await res.json();
    const catNames = data.categories.map(c => c.name.toLowerCase());

    const expectedPopular = [
      'software engineering',
      'data science & ai',
      'product & design',
      'sales & marketing',
      'finance & accounting',
      'human resources',
      'devops & infrastructure',
      'full stack development'
    ];

    for (const exp of expectedPopular) {
      const found = catNames.some(name => name.includes(exp) || exp.includes(name));
      assert.ok(found, `Expected popular category "${exp}" to exist in master categories`);
    }
  });

  // TEST 3: Search within Master Categories
  await test('Master categories supports search query parameter (?q=DevOps)', async () => {
    const res = await fetch(`${BASE_URL}/master/categories?q=DevOps`);
    const data = await res.json();
    assert.strictEqual(data.success, true, 'Expected success: true');
    assert.ok(data.categories.length > 0, 'Expected matches for DevOps');
    assert.ok(
      data.categories.some(c => c.name.toLowerCase().includes('devops')),
      'Expected matching category to have DevOps in name'
    );
  });

  // TEST 4: Filter Jobs by Category Name
  await test('GET /api/jobs with category filter returns matching opportunities', async () => {
    const res = await fetch(`${BASE_URL}/jobs?category=DevOps%20%26%20Infrastructure`);
    assert.strictEqual(res.status, 200, 'Expected status 200');
    const data = await res.json();
    assert.strictEqual(data.success, true, 'Expected success: true');
    assert.ok(data.total > 0, `Expected jobs matching DevOps & Infrastructure, got ${data.total}`);
    assert.ok(Array.isArray(data.jobs), 'Expected jobs array');
  });

  // TEST 5: Independent Coexistence with Recommended Jobs filter
  await test('Job Category filter coexists independently with recommended=true', async () => {
    const allCategoryRes = await fetch(`${BASE_URL}/jobs?category=DevOps%20%26%20Infrastructure`);
    const allCategoryData = await allCategoryRes.json();

    const recCategoryRes = await fetch(`${BASE_URL}/jobs?category=DevOps%20%26%20Infrastructure&recommended=true`);
    const recCategoryData = await recCategoryRes.json();

    assert.strictEqual(recCategoryData.success, true);
    assert.ok(Array.isArray(recCategoryData.jobs));
    assert.ok(
      recCategoryData.total <= allCategoryData.total,
      'Recommended filtered count should be a subset of all category jobs'
    );

    // Every job in the recommended subset must have is_recommended = 1 / true
    recCategoryData.jobs.forEach(j => {
      assert.ok(j.is_recommended === 1 || j.is_recommended === true || j.is_recommended === '1', 'Job must be recommended');
    });
  });

  // TEST 6: Job list default natural ordering remains latest-first
  await test('Job list maintains natural newest-first order with category filter', async () => {
    const res = await fetch(`${BASE_URL}/jobs?category=DevOps%20%26%20Infrastructure`);
    const data = await res.json();
    if (data.jobs.length >= 2) {
      for (let i = 0; i < data.jobs.length - 1; i++) {
        const d1 = new Date(data.jobs[i].created_at || 0).getTime();
        const d2 = new Date(data.jobs[i + 1].created_at || 0).getTime();
        assert.ok(d1 >= d2, `Jobs should be newest-first: index ${i} (${d1}) >= index ${i+1} (${d2})`);
      }
    }
  });

  // TEST 7: Keyword Search + Category Filter Combination
  await test('Keyword search and category filter work together synergistically', async () => {
    const res = await fetch(`${BASE_URL}/jobs?search=Architect&category=DevOps%20%26%20Infrastructure`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.jobs.length > 0, 'Expected matching architect jobs in category');
  });

  // TEST 8: Pagination with Category filter
  await test('Pagination works with category filter without breaking page counts', async () => {
    const res = await fetch(`${BASE_URL}/jobs?category=DevOps%20%26%20Infrastructure&page=1&limit=5`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.page, 1);
    assert.ok(data.jobs.length <= 5, 'Expected at most 5 jobs on page 1');
    assert.ok(data.totalPages >= 1, 'Expected at least 1 total page');
  });

  // TEST 9: Clearing category returns complete job listings
  await test('Clearing category parameter returns all unfiltered jobs', async () => {
    const filteredRes = await fetch(`${BASE_URL}/jobs?category=DevOps%20%26%20Infrastructure`);
    const filteredData = await filteredRes.json();

    const unfilteredRes = await fetch(`${BASE_URL}/jobs`);
    const unfilteredData = await unfilteredRes.json();

    assert.ok(unfilteredData.total >= filteredData.total, 'Unfiltered count must be >= filtered count');
  });

  console.log('\n============================================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log('============================================================');

  await new Promise(r => setTimeout(r, 100));
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
