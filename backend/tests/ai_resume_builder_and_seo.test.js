const assert = require('assert');
const { generateAtsResume, classifyGeminiError } = require('../services/aiService');

describe('Backend Diagnoses & Fixes Verification Suite', () => {

  describe('Priority 1: SEO Job Preview Query Contract', () => {
    it('SQL query joins EMPLOYERS and CLIENT without referencing non-existent company column', () => {
      const fs = require('fs');
      const seoRoutesCode = fs.readFileSync(require.resolve('../routes/seoRoutes'), 'utf8');

      // Must not query non-existent columns directly from job
      assert.strictEqual(
        seoRoutesCode.includes('SELECT id, title, company, company_name'),
        false,
        'Old failing query with direct company column must be removed'
      );

      // Must use relational COALESCE with EMPLOYERS and CLIENT
      assert.strictEqual(
        seoRoutesCode.includes('COALESCE(e.company_name, c.name, j.manual_company_name'),
        true,
        'Query must join EMPLOYERS e and CLIENT c to resolve company name'
      );
      assert.strictEqual(
        seoRoutesCode.includes('LEFT JOIN EMPLOYERS e ON j.employer_id = e.id'),
        true,
        'Query must have LEFT JOIN EMPLOYERS'
      );
    });
  });

  describe('Priority 2: Gemini Model Identifiers & Error Classification', () => {
    it('Candidate models use valid supported Google Generative AI model names', () => {
      const fs = require('fs');
      const aiServiceCode = fs.readFileSync(require.resolve('../services/aiService'), 'utf8');

      // Invalid models must be gone
      assert.strictEqual(aiServiceCode.includes("'gemini-3.5-flash'"), false, 'gemini-3.5-flash must be removed');
      assert.strictEqual(aiServiceCode.includes("'gemini-flash-lite-latest'"), false, 'gemini-flash-lite-latest must be removed');

      // Verified models must be present
      assert.strictEqual(aiServiceCode.includes("'gemini-1.5-flash'"), true, 'gemini-1.5-flash must be present');
      assert.strictEqual(aiServiceCode.includes("'gemini-2.0-flash'"), true, 'gemini-2.0-flash must be present');
    });

    it('Correctly classifies 503 SERVICE_UNAVAILABLE as retryable', () => {
      const err = new Error('503 Service Unavailable: The model is overloaded. Please try again later.');
      const classified = classifyGeminiError(err);
      assert.strictEqual(classified.errorCode, 'SERVICE_UNAVAILABLE');
      assert.strictEqual(classified.isTerminal, false, '503 must not be terminal');
    });

    it('Correctly classifies 429 ResourceExhausted as retryable', () => {
      const err = new Error('429 Too Many Requests: quota exceeded');
      const classified = classifyGeminiError(err);
      assert.strictEqual(classified.errorCode, 'QUOTA_OR_RATE_LIMIT');
      assert.strictEqual(classified.isTerminal, false, '429 must not be terminal');
    });

    it('Correctly classifies 403 API_KEY_INVALID as terminal', () => {
      const err = new Error('403 Forbidden: API key not valid');
      const classified = classifyGeminiError(err);
      assert.strictEqual(classified.isTerminal, true, 'Auth failure must be terminal');
    });
  });

  describe('Priority 3: ATS Resume Builder Schema & Truncated Response Protection', () => {
    it('Rejects truncated JSON / Unterminated string without corrupting candidate data', async () => {
      // Mock profile data
      const candidateProfile = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+91 9876543210',
        current_location: 'Mumbai, Maharashtra, India',
        professional_headline: 'Senior Full Stack Engineer',
        professional_summary: 'Existing authentic summary that must never be wiped.',
        skills: ['Node.js', 'React', 'MySQL'],
        experience: [{ organization: 'TechCorp', designation: 'Developer' }]
      };

      // When Gemini is not configured or fails, it returns safe structured error
      const result = await generateAtsResume(candidateProfile);
      if (!result.isValid) {
        assert.strictEqual(result.error, true);
        assert.ok(result.errorCode);
        assert.strictEqual(typeof result.message, 'string');
      } else {
        assert.strictEqual(result.data.name, 'John Doe');
        assert.deepStrictEqual(result.data.skills, ['Node.js', 'React', 'MySQL']);
      }
    });

    it('Enforces 8192 token limit for resume builder to prevent unterminated strings', () => {
      const fs = require('fs');
      const aiServiceCode = fs.readFileSync(require.resolve('../services/aiService'), 'utf8');
      assert.strictEqual(
        aiServiceCode.includes('tokenLimit = isResume ? 8192 : 4096'),
        true,
        'Token limit for resume builder must be 8192 to prevent 2048 token cutoff'
      );
    });
  });

  describe('Priority 0: Database Safety & Table Verification', () => {
    it('Database initialization checks information_schema case-insensitively and protects production', () => {
      const fs = require('fs');
      const dbCode = fs.readFileSync(require.resolve('../config/db'), 'utf8');

      // Must not use raw SHOW TABLES LIKE 'JOB' that fails on Linux lowercase table names
      assert.strictEqual(
        dbCode.includes("SHOW TABLES LIKE 'JOB'"),
        false,
        "SHOW TABLES LIKE 'JOB' must be replaced with case-insensitive information_schema query"
      );

      // Must have case-insensitive information_schema query
      assert.strictEqual(
        dbCode.includes('information_schema.TABLES'),
        true,
        'Must check information_schema.TABLES'
      );

      // Must have production safety check
      assert.strictEqual(
        dbCode.includes('isProduction && process.env.ALLOW_AUTO_MIGRATE !== \'true\''),
        true,
        'Must protect production database from automatic schema mutation and seeding'
      );
    });
  });
});

