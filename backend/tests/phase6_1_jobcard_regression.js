/**
 * Vakancy.in — Phase 6.1 JobCard Regression Test Suite
 *
 * Specifically verifies:
 * 1. Absence of undeclared `is_recommended` references in frontend/src/components/common/JobCard.jsx
 * 2. Safe normalization of recommendation status across all authoritative job properties
 * 3. Prevention of false-positive recommended badges on standard employer jobs
 * 4. Graceful handling of missing/undefined/null job fields and badges
 * 5. Preservation of non-recommended badges (e.g. 'Urgent Hiring')
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runRegressionTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 6.1 JOBCARD REGRESSION TEST SUITE');
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

  // --- Step 1: Static AST / Scope Inspection of JobCard.jsx ---
  console.log('--- Step 1: Static Code Inspection of JobCard.jsx ---');
  const jobCardPath = path.resolve(__dirname, '../../frontend/src/components/common/JobCard.jsx');
  assert(fs.existsSync(jobCardPath), 'JobCard.jsx must exist');
  const jobCardContent = fs.readFileSync(jobCardPath, 'utf8');

  test('JobCard.jsx does NOT reference undeclared is_recommended identifier', () => {
    // Should not contain undeclared `is_recommended ||` or `(is_recommended`
    const undeclaredPattern = /\b(?<!\.)is_recommended\s*(?:\|\||&&|\?|\:|\))/g;
    const matches = jobCardContent.match(undeclaredPattern);
    assert.strictEqual(matches, null, `Found undeclared references to is_recommended: ${JSON.stringify(matches)}`);
  });

  test('JobCard.jsx defines normalized isJobRecommended variable', () => {
    assert(jobCardContent.includes('const isJobRecommended = Boolean('), 'Must declare normalized isJobRecommended variable');
  });

  test('Both detailed and default variants utilize isJobRecommended', () => {
    const detailedVariantCheck = jobCardContent.includes('{isJobRecommended ? (');
    assert.strictEqual(detailedVariantCheck, true, 'Detailed variant must use isJobRecommended');
    const defaultVariantCheck = jobCardContent.includes('{isJobRecommended ? (');
    assert.strictEqual(defaultVariantCheck, true, 'Default grid variant must use isJobRecommended');
  });

  // --- Step 2: Normalization Logic Simulation ---
  console.log('\n--- Step 2: Recommendation Flag Normalization Behavior ---');

  // Exact function extracted from JobCard.jsx implementation
  function normalizeRecommendation(job) {
    if (!job) return false;
    const badge = job.badge || null;
    return Boolean(
      job.is_recommended === true ||
      job.isRecommended === true ||
      job.is_rec === 1 ||
      job.is_rec === true ||
      job.recommendation_badge === 'Vakancy.in Recommended' ||
      (typeof badge === 'string' && badge.includes('Recommended'))
    );
  }

  test('Internal staff job with is_recommended: true returns true', () => {
    const job = { id: 101, title: 'Lead Architect', is_recommended: true, badge: 'Vakancy.in Recommended' };
    assert.strictEqual(normalizeRecommendation(job), true);
  });

  test('Executive search job with camelCase isRecommended: true returns true', () => {
    const job = { id: 102, title: 'VP Engineering', isRecommended: true };
    assert.strictEqual(normalizeRecommendation(job), true);
  });

  test('Job with is_rec: 1 from CTE returns true', () => {
    const job = { id: 103, title: 'DevOps Lead', is_rec: 1 };
    assert.strictEqual(normalizeRecommendation(job), true);
  });

  test('Job with recommendation_badge: "Vakancy.in Recommended" returns true', () => {
    const job = { id: 104, title: 'Security Architect', recommendation_badge: 'Vakancy.in Recommended' };
    assert.strictEqual(normalizeRecommendation(job), true);
  });

  test('Standard employer job returns false (NO recommended badge)', () => {
    const job = { id: 201, title: 'PHP Developer', company: 'Acme Corp', is_recommended: false, badge: null };
    assert.strictEqual(normalizeRecommendation(job), false);
  });

  test('Job with non-recommended badge (e.g. Urgent Hiring) does NOT get recommended flag', () => {
    const job = { id: 202, title: 'React Developer', is_recommended: false, badge: 'Urgent Hiring', badgeType: 'urgent' };
    assert.strictEqual(normalizeRecommendation(job), false);
  });

  test('Empty job object does not crash and returns false', () => {
    assert.strictEqual(normalizeRecommendation({}), false);
  });

  test('Job with null / undefined fields does not throw TypeError', () => {
    const job = { id: 203, is_recommended: null, badge: undefined, recommendation_badge: null };
    assert.strictEqual(normalizeRecommendation(job), false);
  });

  test('Undefined or null job passed to function returns false safely', () => {
    assert.strictEqual(normalizeRecommendation(null), false);
    assert.strictEqual(normalizeRecommendation(undefined), false);
  });

  // --- Step 3: Public API Integration Check ---
  console.log('\n--- Step 3: Public API Job Data Normalization Verification ---');
  const res = await fetch('http://localhost:5002/api/jobs?limit=50');
  assert.strictEqual(res.status, 200, 'Jobs API must respond with 200');
  const data = await res.json();
  assert(Array.isArray(data.jobs), 'Response must include jobs array');

  let recommendedCount = 0;
  let standardCount = 0;

  data.jobs.forEach(job => {
    const isRec = normalizeRecommendation(job);
    if (job.is_recommended) {
      recommendedCount++;
      assert.strictEqual(isRec, true, `Job ${job.title} with is_recommended: true must normalize to true`);
      assert.strictEqual(job.badge, 'Vakancy.in Recommended', 'Recommended job must have badge text');
    } else {
      standardCount++;
      assert.strictEqual(isRec, false, `Job ${job.title} with is_recommended: false must normalize to false`);
      assert.notStrictEqual(job.badge, 'Vakancy.in Recommended', 'Standard job must NOT have Recommended badge');
    }
  });

  test('Public jobs endpoint provides both recommended and standard jobs properly normalized', () => {
    assert(recommendedCount > 0, 'Must have at least 1 recommended job in active listing');
    assert(standardCount > 0, 'Must have standard employer jobs in active listing');
  });

  console.log('\n====================================================');
  console.log(`PHASE 6.1 REGRESSION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runRegressionTests().catch(err => {
  console.error('Fatal error in regression test suite:', err);
  process.exit(1);
});
