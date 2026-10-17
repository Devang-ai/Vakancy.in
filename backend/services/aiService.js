const { aiClient, isGeminiConfigured } = require('../config/gemini');

/**
 * Sanitizes error messages to prevent accidental leakage of API keys, tokens, or auth headers in logs.
 */
function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== 'string') return '';
  return msg
    .replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]')
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .replace(/api[_-]?key[=:\s]+[a-zA-Z0-9_\-]+/gi, 'apiKey=[REDACTED]');
}

/**
 * Classifies Gemini error messages into clear, actionable error codes and user-safe descriptions.
 * At minimum distinguishes:
 * - NOT_CONFIGURED
 * - ACCESS_DENIED (403)
 * - AUTHENTICATION_ERROR (401)
 * - QUOTA_OR_RATE_LIMIT (429)
 * - TIMEOUT
 * - SERVICE_UNAVAILABLE (503)
 * - INVALID_RESPONSE
 * - GENERATION_FAILED
 */
function classifyGeminiError(err) {
  if (!err) {
    return {
      errorCode: 'GENERATION_FAILED',
      message: 'AI generation failed unexpectedly.',
      isTerminal: false
    };
  }

  const rawMessage = typeof err === 'string' ? err : (err.message || '');
  const lower = rawMessage.toLowerCase();

  // 1. Not Configured
  if (lower.includes('not configured') || lower.includes('client not initialized')) {
    return {
      errorCode: 'NOT_CONFIGURED',
      message: 'AI service is not configured. Please set GEMINI_API_KEY.',
      isTerminal: true
    };
  }

  // 2. Access Denied / Project Denied Access / 403
  if (
    lower.includes('403') ||
    lower.includes('denied access') ||
    lower.includes('permission_denied') ||
    lower.includes('forbidden')
  ) {
    return {
      errorCode: 'ACCESS_DENIED',
      message: 'Access to the AI generation service was denied by provider policy or permissions.',
      isTerminal: true
    };
  }

  // 3. Authentication Error / Invalid API Key / 401
  if (
    lower.includes('401') ||
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid credential')
  ) {
    return {
      errorCode: 'AUTHENTICATION_ERROR',
      message: 'AI service authentication failed. Please verify API credentials.',
      isTerminal: true
    };
  }

  // 4. Quota or Rate Limit / 429
  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit')
  ) {
    return {
      errorCode: 'QUOTA_OR_RATE_LIMIT',
      message: 'AI service request rate limit or quota exceeded. Please try again shortly.',
      isTerminal: false
    };
  }

  // 5. Timeout
  if (
    lower.includes('time out') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('deadline_exceeded')
  ) {
    return {
      errorCode: 'TIMEOUT',
      message: 'AI generation request timed out. Please try again.',
      isTerminal: false
    };
  }

  // 6. Service Unavailable / 503 / High Load
  if (
    lower.includes('503') ||
    lower.includes('service unavailable') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('overloaded')
  ) {
    return {
      errorCode: 'SERVICE_UNAVAILABLE',
      message: 'AI service is temporarily unavailable. Please try again later.',
      isTerminal: false
    };
  }

  // 7. Invalid Response
  if (
    lower.includes('invalid response') ||
    lower.includes('malformed') ||
    lower.includes('schema validation') ||
    lower.includes('incomplete')
  ) {
    return {
      errorCode: 'INVALID_RESPONSE',
      message: 'AI generation returned an unparseable or incomplete response.',
      isTerminal: false
    };
  }

  // 8. Generic Generation Failed
  return {
    errorCode: 'GENERATION_FAILED',
    message: 'AI job description generation is currently unavailable.',
    isTerminal: false
  };
}

/**
 * Gemini AI Generator Service — Vacancy.in Cross-Platform Industry-Neutral Engine
 * Supports any legitimate industry or profession: Finance, Sales, HR, Healthcare,
 * Education, Operations, Construction, Retail, Hospitality, Technology, and more.
 *
 * All prompts enforce:
 * - Zero candidate scoring, ranking, or matching algorithms
 * - Mandatory location preservation from database (NO hardcoded Bengaluru / KA defaults)
 * - Mandatory skill preservation
 * - Strict schema validation with auto-retry and sanitization
 */

const generateResumeEnhancement = async (inputData = {}) => {
  const action = inputData.action || 'general_enhancement';
  const currentSummary = inputData.currentSummary || inputData.summary || '';
  const targetRole = inputData.targetRole || inputData.headline || 'Professional Role';

  const universalFactualityRules = `
UNIVERSAL FACTUALITY & CANDIDATE TRUTH RULES:
1. Candidate-provided information is the ONLY factual source of truth.
2. The Target Role ("${targetRole}") represents career preference or objective ONLY. It does NOT mean the candidate has already held this role, has years of experience in it, or possesses skills associated with it unless candidate data explicitly confirms it. Do NOT fabricate experience based on Target Role.
3. Candidate Context / Source Data must be treated strictly as candidate-supplied text. Do NOT interpret UI actions, field labels, metadata, or form keys as candidate employment experience.
4. You may: rewrite, restructure, shorten, clarify, improve wording, reorder supplied facts, and emphasize supplied achievements.
5. You must NOT invent: companies, job titles, years of experience, degrees, certifications, clients, projects, metrics, revenue, user counts, performance numbers, regulatory experience, compliance history, technology experience, leadership responsibility, team size, awards, achievements, or employment history.
6. Absolutely NO candidate scoring, ranking, or employability evaluation.`;

  let prompt = '';
  if (action === 'Make More Concise' || action === 'concise') {
    prompt = `You are an expert Executive Resume Writer.
Rewrite the following professional summary to be concise (2-3 punchy sentences), retaining core competencies, leadership, and impact while strictly preserving all candidate facts.
Target Role (Preference Only): ${targetRole}
Current Summary: ${currentSummary}
Candidate Context: ${JSON.stringify(inputData)}
${universalFactualityRules}
Return ONLY the improved summary text with no commentary or markdown fences.`;
  } else if (action === 'Add More Metrics' || action === 'metrics') {
    prompt = `You are an expert Executive Resume Writer.
Enhance the following professional summary by emphasizing measurable business impact, scale, and operational throughput while strictly preserving the candidate's authentic background.
Target Role (Preference Only): ${targetRole}
Current Summary: ${currentSummary}
Candidate Context: ${JSON.stringify(inputData)}
${universalFactualityRules}
STRICT METRICS ZERO-HALLUCINATION RULES:
- Use ONLY metrics and numbers explicitly supplied by the candidate.
- Do NOT invent numerical values or quantitative figures.
- Do NOT calculate or infer metrics from vague statements.
- Do NOT estimate percentages (e.g., do not add 20%, 30%, 50%).
- Do NOT estimate revenue or dollar amounts (e.g., do not add $1M).
- Do NOT estimate user counts or requests per second (e.g., do not add 40k RPS).
- Do NOT estimate performance improvements, response times, or SLA numbers (e.g., do not add 99.999% SLA or sub-50ms).
- Do NOT create team sizes, transaction volumes, or time reductions.
- If no factual metrics exist in the candidate input, improve wording around actual responsibilities and deliverables, but do NOT add numerical metrics.
Return ONLY the improved summary text with no commentary or markdown fences.`;
  } else if (action === 'Align with RBI Compliance' || action === 'Align with Role' || action.toLowerCase().includes('compliance')) {
    prompt = `You are an expert Executive Resume Writer.
Refine the following professional summary to emphasize institutional governance, regulatory compliance, data residency, and audit integrity suitable for high-stakes enterprise systems.
Target Role (Preference Only): ${targetRole}
Current Summary: ${currentSummary}
Candidate Context: ${JSON.stringify(inputData)}
${universalFactualityRules}
STRICT COMPLIANCE ZERO-HALLUCINATION RULES:
- If the candidate has not supplied RBI, banking, regulatory, audit, governance, data-residency, or compliance experience, do NOT claim that they have it.
- You must NOT assume that the candidate has RBI or banking experience.
- Do NOT manufacture regulatory certifications, audit ownership, statutory oversight, or banking history.
- You may align phrasing toward compliance-oriented professional standards without inventing compliance history or credentials.
Return ONLY the improved summary text with no commentary or markdown fences.`;
  } else if (action === 'Improve with AI' || action === 'improve') {
    prompt = `You are an expert Executive Resume Writer.
Polish and elevate the following professional summary into an authoritative, compelling executive profile for a candidate targeting ${targetRole}.
Current Summary: ${currentSummary}
Candidate Context: ${JSON.stringify(inputData)}
${universalFactualityRules}
Return ONLY the improved summary text with no commentary or markdown fences.`;
  } else {
    prompt = `You are an expert Executive Resume Writer and Career Strategist.
Improve and structure the following candidate resume information into a compelling professional summary, 5 high-impact bullet points for work experience, and recommended relevant skills.
Target Role (Preference Only): ${targetRole}
Candidate Info: ${JSON.stringify(inputData)}
${universalFactualityRules}
STRICT SKILLS & EXPERIENCE RULES:
- Recommended skills must come ONLY from skills explicitly present in candidate information.
- If the candidate has not supplied a skill, do NOT present it as an existing candidate skill.
- Preserve supplied skills only.
Format your response clearly with headings:
### Professional Summary
[Compelling 2-3 paragraph executive overview strictly using candidate facts]

### Key Achievements & Responsibilities
- [5 high-impact bullet points with active verbs strictly from candidate facts]

### Recommended Skills
[Preserve only skills explicitly provided by candidate]`;
  }

  const result = await callGeminiAPI(prompt, 'resume_builder', inputData);
  if (result && result.error) {
    return {
      isValid: false,
      error: true,
      is_simulated: false,
      source: 'GEMINI',
      model: result.model || 'gemini',
      errorCode: result.errorCode || 'GENERATION_FAILED',
      message: result.message || 'AI resume enhancement is currently unavailable.'
    };
  }

  return {
    isValid: true,
    error: false,
    text: result.text || String(result),
    is_simulated: false,
    source: 'GEMINI',
    model: result.model || 'gemini'
  };
};

/**
 * Sanitizes strings, strips accidental markdown headers, and validates structured output schema.
 */
function validateAndSanitizeJdData(rawObj, requiredSkills = [], companyName = '') {
  if (!rawObj || typeof rawObj !== 'object') {
    return { isValid: false, reason: 'Response is not a valid object.' };
  }

  const effectiveCompany = (companyName && String(companyName).trim() && String(companyName).toLowerCase() !== 'pending company profile')
    ? String(companyName).trim()
    : 'Scan2Serve';

  // 1. Sanitize Overview
  let overview = String(rawObj.overview || '').trim();
  overview = overview
    .replace(/^#+\s*Role Overview\s*/gi, '')
    .replace(/^#+\s*Overview\s*/gi, '')
    .replace(/^Role Overview:\s*/gi, '')
    .trim();

  // STRICT COMPANY NAME RULE: Vacancy.in / Vakancy.in is ONLY the job board portal, NEVER the hiring employer!
  overview = overview
    .replace(/\bVacancy\.in\s+is\s+seeking\b/gi, `${effectiveCompany} is seeking`)
    .replace(/\bVakancy\.in\s+is\s+seeking\b/gi, `${effectiveCompany} is seeking`)
    .replace(/\bVacancy\.in\s+is\s+looking\b/gi, `${effectiveCompany} is looking`)
    .replace(/\bVakancy\.in\s+is\s+looking\b/gi, `${effectiveCompany} is looking`)
    .replace(/\bVacancy\.in\s+is\s+hiring\b/gi, `${effectiveCompany} is hiring`)
    .replace(/\bVakancy\.in\s+is\s+hiring\b/gi, `${effectiveCompany} is hiring`)
    .replace(/\bVacancy\s+is\s+seeking\b/gi, `${effectiveCompany} is seeking`)
    .replace(/\bVakancy\s+is\s+seeking\b/gi, `${effectiveCompany} is seeking`)
    .replace(/\bVacancy\.in\b/gi, effectiveCompany)
    .replace(/\bVakancy\.in\b/gi, effectiveCompany);

  if (!overview || overview.length < 20) {
    return { isValid: false, reason: 'Role Overview is missing or less than 20 characters.' };
  }

  // 2. Sanitize Responsibilities Array
  let responsibilities = [];
  if (Array.isArray(rawObj.responsibilities)) {
    responsibilities = rawObj.responsibilities
      .map(r => String(r || '')
        .replace(/^#+\s*Key Responsibilities\s*/gi, '')
        .replace(/^#+\s*Responsibilities\s*/gi, '')
        .replace(/^[-*•\d.]+\s*/, '')
        .trim()
      )
      .filter(r => r.length >= 5);
  } else if (typeof rawObj.responsibilities === 'string' && rawObj.responsibilities.trim()) {
    responsibilities = rawObj.responsibilities
      .split('\n')
      .map(r => String(r || '')
        .replace(/^#+\s*Key Responsibilities\s*/gi, '')
        .replace(/^#+\s*Responsibilities\s*/gi, '')
        .replace(/^[-*•\d.]+\s*/, '')
        .trim()
      )
      .filter(r => r.length >= 5);
  }

  // 3. Sanitize Requirements Array
  let requirements = [];
  if (Array.isArray(rawObj.requirements)) {
    requirements = rawObj.requirements
      .map(req => String(req || '')
        .replace(/^#+\s*Qualifications & Requirements\s*/gi, '')
        .replace(/^#+\s*Requirements\s*/gi, '')
        .replace(/^#+\s*Qualifications\s*/gi, '')
        .replace(/^[-*•\d.]+\s*/, '')
        .trim()
      )
      .filter(req => req.length >= 5);
  } else if (typeof rawObj.requirements === 'string' && rawObj.requirements.trim()) {
    requirements = rawObj.requirements
      .split('\n')
      .map(req => String(req || '')
        .replace(/^#+\s*Qualifications & Requirements\s*/gi, '')
        .replace(/^#+\s*Requirements\s*/gi, '')
        .replace(/^#+\s*Qualifications\s*/gi, '')
        .replace(/^[-*•\d.]+\s*/, '')
        .trim()
      )
      .filter(req => req.length >= 5);
  }

  // Cap max 10 items
  responsibilities = responsibilities.slice(0, 10);
  requirements = requirements.slice(0, 10);

  // Strict check: Minimum 3 meaningful items each
  if (responsibilities.length < 3) {
    return { isValid: false, reason: `Fewer than 3 responsibilities (${responsibilities.length}).` };
  }

  if (requirements.length < 3) {
    return { isValid: false, reason: `Fewer than 3 requirements (${requirements.length}).` };
  }

  // 4. Sanitize Skills and strictly preserve selected skills
  let skills = [];
  if (Array.isArray(rawObj.skills)) {
    skills = rawObj.skills.map(s => String(s || '').trim()).filter(Boolean);
  }

  // Remove any placeholder/hallucinated skill names
  skills = skills.filter(s => {
    const l = s.toLowerCase();
    return l !== 'core competency' && l !== 'core domain competencies' && l !== 'general skills' && l !== 'domain skills';
  });

  if (Array.isArray(requiredSkills) && requiredSkills.length > 0) {
    requiredSkills.forEach(reqSkill => {
      const trimmed = String(reqSkill).trim();
      if (trimmed && !skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
        skills.unshift(trimmed);
      }
    });
  } else if (!requiredSkills || requiredSkills.length === 0) {
    // If employer did not supply any skills, output must not have invented skills
    skills = skills.filter(Boolean);
  }

  return {
    isValid: true,
    data: {
      overview,
      responsibilities,
      requirements,
      skills
    }
  };
}

/**
 * Fallback parser for extracting structured arrays from raw markdown text
 */
function parseMarkdownToStructuredJd(text, requiredSkills = [], companyName = '') {
  if (!text || typeof text !== 'string') return null;

  const overviewMatch = text.match(/(?:### Role Overview|Role Overview:|\*\*Role Overview\*\*)\s*([\s\S]*?)(?=(?:### Key Responsibilities|Key Responsibilities:|\*\*Key Responsibilities\*\*)|$)/i);
  const respMatch = text.match(/(?:### Key Responsibilities|Key Responsibilities:|\*\*Key Responsibilities\*\*)\s*([\s\S]*?)(?=(?:### Qualifications|Qualifications & Requirements:|\*\*Qualifications\*\*|### Required Skills)|$)/i);
  const qualMatch = text.match(/(?:### Qualifications & Requirements|Qualifications & Requirements:|\*\*Qualifications\*\*|### Requirements)\s*([\s\S]*?)(?=(?:### Required Skills|### Benefits|$))/i);

  let overview = overviewMatch ? overviewMatch[1].trim() : text.split('\n\n')[0] || '';
  overview = overview.replace(/^#+\s*Role Overview\s*/gi, '').trim();

  let responsibilities = [];
  if (respMatch) {
    responsibilities = respMatch[1]
      .split('\n')
      .map(l => l.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter(l => l.length > 5);
  }

  let requirements = [];
  if (qualMatch) {
    requirements = qualMatch[1]
      .split('\n')
      .map(l => l.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter(l => l.length > 5);
  }

  return validateAndSanitizeJdData({
    overview,
    responsibilities,
    requirements,
    skills: requiredSkills
  }, requiredSkills, companyName);
}

const generateJobDescription = async (jobDetails = {}) => {
  const title = jobDetails.title || 'Professional Role';
  const rawCompany = (jobDetails.company_name || jobDetails.companyName || '').trim();
  const effectiveCompanyName = (rawCompany && rawCompany.toLowerCase() !== 'pending company profile')
    ? rawCompany
    : 'Scan2Serve';
  const companyDisplayName = effectiveCompanyName;
  const department = jobDetails.department || 'General Operations';
  const category = jobDetails.job_domain || jobDetails.category || 'General';
  const locationText = jobDetails.locationText || jobDetails.location || 'Flexible / Not specified';
  const workplace = jobDetails.workplace_type || 'On-site';
  const employmentType = jobDetails.employment_type || 'Full-time Permanent';
  const seniority = jobDetails.seniority_level || 'Mid Level';
  
  let skillList = [];
  if (Array.isArray(jobDetails.skills)) {
    skillList = jobDetails.skills.map(s => String(s || '').trim()).filter(Boolean);
  } else if (typeof jobDetails.skills === 'string' && jobDetails.skills.trim()) {
    try {
      const parsed = JSON.parse(jobDetails.skills);
      if (Array.isArray(parsed)) skillList = parsed.map(s => String(s || '').trim()).filter(Boolean);
      else skillList = jobDetails.skills.split(',').map(s => s.trim()).filter(Boolean);
    } catch (_) {
      skillList = jobDetails.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  const skillsStr = skillList.length > 0 ? skillList.join(', ') : 'None specified by employer';

  let benefitList = [];
  if (Array.isArray(jobDetails.benefits)) {
    benefitList = jobDetails.benefits.map(b => String(b || '').trim()).filter(Boolean);
  } else if (typeof jobDetails.benefits === 'string' && jobDetails.benefits.trim()) {
    try {
      const parsed = JSON.parse(jobDetails.benefits);
      if (Array.isArray(parsed)) benefitList = parsed.map(b => String(b || '').trim()).filter(Boolean);
      else benefitList = jobDetails.benefits.split(',').map(s => s.trim()).filter(Boolean);
    } catch (_) {
      benefitList = jobDetails.benefits.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  const benefitsStr = benefitList.length > 0 ? benefitList.join(', ') : '';

  if (!isGeminiConfigured()) {
    console.warn('[AI DEBUG] ⚠️ GEMINI_API_KEY is not configured.');
    return {
      isValid: false,
      error: true,
      is_simulated: false,
      source: 'GEMINI',
      model: 'gemini',
      errorCode: 'NOT_CONFIGURED',
      message: 'AI service is not configured. Please set GEMINI_API_KEY.'
    };
  }

  const prompt = `You are a Senior Talent Acquisition Specialist & Executive Recruiter creating a job description for "${companyDisplayName}".
Create a comprehensive, professional, and industry-appropriate Job Description tailored strictly to the role, employer company, and location specifications below.

Role Specifications:
- Hiring Company / Employer: ${companyDisplayName}
- Official Job Title: ${title}
- Department: ${department}
- Job Category / Domain: ${category}
- Seniority Tier: ${seniority}
- Workplace Type: ${workplace}
- Location Specifications:\n${locationText}
- Employment Type: ${employmentType}
- Required Skills: ${skillsStr}
- Offered Perks & Benefits: ${benefitsStr ? benefitsStr : 'None specified by employer'}

CRITICAL COMPANY NAME & IDENTITY RULE:
1. The hiring company name is "${companyDisplayName}".
2. You MUST write the Role Overview from the perspective of "${companyDisplayName}" (for example: "${companyDisplayName} is seeking an experienced and driven...", "At ${companyDisplayName}, we are looking for...", or "Join ${companyDisplayName} as our new ${title}...").
3. ABSOLUTE PROHIBITION: Vacancy.in (or Vakancy.in) is ONLY the hosting job portal platform, NOT the hiring employer!
4. Under NO circumstances should you state or imply that "Vacancy.in" or "Vakancy" is hiring, seeking candidates, or employing this role! NEVER write "Vacancy.in is seeking...". Always use "${companyDisplayName}".

STRICT MULTI-LOCATION RULE:
The job may have one or multiple locations.
Use ONLY the location specifications supplied in the location specifications above (${locationText.replace(/\n/g, ', ')}).
If multiple locations are supplied, preserve ALL of them naturally in the overview/role context (for example: "This role is available for candidates based across Ahmedabad, Gujarat and Bengaluru, Karnataka.").
Never remove, replace, merge, invent, or guess locations.
Never substitute one city for another.
Never use a generic default location or hardcoded location.
Do NOT output a location that is not present in the supplied job location specifications above.
If no location is specified, state "No job location specified" and do not invent one.

STRICT ROLE & TITLE RULE:
Official Job Title is "${title}". Do NOT change the job title or job category (${category}).
Do NOT generate responsibilities or requirements for another role (such as Project Manager or Finance).

STRICT SKILLS PRESERVATION RULE:
${skillList.length > 0 ? `You MUST include all employer-selected skills (${skillsStr}) in the "skills" array and reflect them naturally in the requirements.` : `No required skills were specified by the employer. You MUST output an empty array [] for the "skills" property. Do NOT invent, assume, or fabricate any skills, general competencies, communication, or leadership.`}

${benefitList.length > 0 ? `STRICT BENEFITS PRESERVATION RULE:
The employer has selected the following Perks & Benefits: ${benefitsStr}.
Preserve these benefits accurately if referencing compensation/perks. Do NOT replace them with unrelated benefits, and do NOT fabricate additional perks.` : `STRICT ZERO-HALLUCINATION BENEFITS RULE:
No benefits or perks were selected by the employer.
You MUST NOT invent, guess, or fabricate any benefits, perks, insurance, ESOPs, or allowances.`}

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid, single JSON object conforming to this schema:
{
  "overview": "Clear 2-3 paragraph description of role mission and team context without markdown headers.",
  "responsibilities": [
    "At least 5 clear, actionable bullet points describing day-to-day duties and deliverables"
  ],
  "requirements": [
    "At least 4 clear bullet points covering education, relevant domain experience, certifications, and core competencies"
  ],
  "skills": ${JSON.stringify(skillList)}
}`;

  console.log(`\n[AI DEBUG] 🤖 Requesting Gemini API for ${companyDisplayName}...`);
  console.log(`[AI DEBUG] Title: "${title}", Category: "${category}", Company: "${companyDisplayName}", Locations: "${locationText.replace(/\n/g, ' ')}"`);
  
  let result = await callGeminiAPI(prompt, 'jd_generator', { ...jobDetails, skillList, companyName: companyDisplayName });

  if (result && result.error) {
    console.warn(`[AI DEBUG] ❌ Gemini API generation failed: [${result.errorCode || 'ERROR'}] ${sanitizeErrorMessage(result.error)}`);
    return {
      isValid: false,
      error: true,
      is_simulated: false,
      source: 'GEMINI',
      model: result.model || 'gemini',
      errorCode: result.errorCode || 'GENERATION_FAILED',
      message: result.message || 'AI job description generation is currently unavailable.'
    };
  }

  if (!result || !result.structuredData) {
    return {
      isValid: false,
      error: true,
      is_simulated: false,
      source: 'GEMINI',
      model: result?.model || 'gemini',
      errorCode: 'INVALID_RESPONSE',
      message: 'AI job description generation returned an invalid response structure.'
    };
  }

  // Validate structured result
  let validation = validateAndSanitizeJdData(result.structuredData, skillList, companyDisplayName);

  // Auto-retry ONCE if first call returned incomplete output
  if (!validation.isValid) {
    console.warn(`[AI DEBUG] ⚠️ First Gemini JD generation was incomplete (${validation.reason}). Retrying with correction prompt...`);
    const correctionPrompt = `${prompt}\n\nCORRECTION NOTICE: Your previous output failed schema validation (${validation.reason}). You MUST output a non-empty overview, at least 5 responsibility items in the "responsibilities" array, and at least 4 requirement items in the "requirements" array.`;
    const retryResult = await callGeminiAPI(correctionPrompt, 'jd_generator', { ...jobDetails, skillList, companyName: companyDisplayName });
    if (retryResult && !retryResult.error && retryResult.structuredData) {
      const retryValidation = validateAndSanitizeJdData(retryResult.structuredData, skillList, companyDisplayName);
      if (retryValidation.isValid) {
        result = retryResult;
        validation = retryValidation;
      }
    }
  }

  if (validation.isValid) {
    console.log(`[AI DEBUG] ✅ Real Gemini generation SUCCESS for ${companyDisplayName}! (Responsibilities: ${validation.data.responsibilities.length}, Requirements: ${validation.data.requirements.length})`);
    return {
      isValid: true,
      structuredData: validation.data,
      text: JSON.stringify(validation.data),
      is_simulated: false,
      source: 'GEMINI',
      model: result.model || 'gemini'
    };
  }

  console.warn(`[AI DEBUG] ❌ Gemini generation failed schema validation: ${validation.reason}. Returning explicit AI failure.`);
  return {
    isValid: false,
    error: true,
    is_simulated: false,
    source: 'GEMINI',
    model: result.model || 'gemini',
    errorCode: 'INVALID_RESPONSE',
    message: `AI generated content did not satisfy required structure: ${validation.reason}`
  };
};

async function callGeminiAPI(prompt, type, context = {}) {
  if (!isGeminiConfigured()) {
    const classified = classifyGeminiError('AI client not initialized or not configured');
    return {
      error: classified.message,
      errorCode: classified.errorCode,
      message: classified.message,
      is_simulated: false,
      source: 'GEMINI',
      model: 'gemini'
    };
  }

  const candidateModels = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest'
  ];
  let lastError = null;
  let lastClassified = null;

  for (const modelName of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[AI DEBUG] 🤖 Attempting Gemini model: "${modelName}" (attempt ${attempt})...`);
        const client = aiClient;
        if (!client) throw new Error('Gemini client not initialized');

                const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2048
          }
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini API request timed out for ${modelName}`)), 30000)
        );
        const generatePromise = model.generateContent(prompt);
        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = await result.response;
        const rawText = response.text();
        
        if (rawText && rawText.trim().length > 0) {
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          
          if (type === 'jd_generator') {
            try {
              const parsedData = JSON.parse(cleaned);
              if (parsedData && (parsedData.overview || parsedData.responsibilities)) {
                return {
                  structuredData: parsedData,
                  text: JSON.stringify(parsedData),
                  is_simulated: false,
                  source: 'GEMINI',
                  model: modelName
                };
              }
            } catch (e) {
              console.warn('⚠️ Gemini JSON parse notice, attempting markdown fallback parser:', e.message);
              const markdownParsed = parseMarkdownToStructuredJd(cleaned, context.skillList || [], context.companyName || '');
              if (markdownParsed && markdownParsed.isValid) {
                return {
                  structuredData: markdownParsed.data,
                  text: JSON.stringify(markdownParsed.data),
                  is_simulated: false,
                  source: 'GEMINI',
                  model: modelName
                };
              }
            }
          }

          if (type === 'ats_resume_builder') {
            try {
              const parsedData = JSON.parse(cleaned);
              if (parsedData && (parsedData.name || parsedData.summary || parsedData.skills)) {
                return {
                  structuredData: parsedData,
                  text: JSON.stringify(parsedData),
                  is_simulated: false,
                  source: 'GEMINI',
                  model: modelName
                };
              }
            } catch (e) {
              console.warn('⚠️ Gemini JSON parse error for ats_resume_builder:', e.message);
            }
          }

          return {
            text: cleaned,
            is_simulated: false,
            source: 'GEMINI',
            model: modelName,
            toString() {
              return this.text;
            }
          };
        }
      } catch (err) {
        lastError = sanitizeErrorMessage(err.message);
        lastClassified = classifyGeminiError(err);
        console.warn(`[AI DEBUG] ❌ Model "${modelName}" attempt ${attempt} failed [${lastClassified.errorCode}]:`, sanitizeErrorMessage(err.message));

        // Terminal error (Access Denied / Authentication error) -> STOP immediately! Do NOT cycle candidate models!
        if (lastClassified.isTerminal) {
          return {
            error: lastError,
            errorCode: lastClassified.errorCode,
            message: lastClassified.message,
            is_simulated: false,
            source: 'GEMINI',
            model: modelName
          };
        }

        // For transient errors like 503 / Rate limit, retry once after short delay
        if ((lastClassified.errorCode === 'SERVICE_UNAVAILABLE' || lastClassified.errorCode === 'QUOTA_OR_RATE_LIMIT') && attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        break; // break inner attempt loop to try next candidate model
      }
    }
  }

  return {
    error: lastError || 'AI generation failed across all available models',
    errorCode: lastClassified?.errorCode || 'GENERATION_FAILED',
    message: lastClassified?.message || 'AI generation service is currently unavailable.',
    is_simulated: false,
    source: 'GEMINI',
    model: 'gemini'
  };
}


function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch(e) {
    return dateStr;
  }
}
const generateAtsResume = async (profileData = {}) => {
  if (!isGeminiConfigured()) {
    return {
      isValid: false,
      error: true,
      errorCode: 'NOT_CONFIGURED',
      message: 'AI Resume Builder is temporarily unavailable. Please try again later.'
    };
  }

  // Construct factual summary of candidate records
  const name = profileData.name || 'Candidate';
  const headline = profileData.professional_headline || profileData.current_designation || '';
  const location = profileData.current_location || '';
  const email = profileData.user_info?.email || profileData.email || '';
  const phone = profileData.user_info?.phone || profileData.phone || '';
  const summary = profileData.professional_summary || '';

  const skills = Array.isArray(profileData.skills)
    ? profileData.skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean)
    : [];

  const experience = Array.isArray(profileData.experience)
    ? profileData.experience.map(e => ({
        company: e.organization || '',
        title: e.designation || '',
        period: [formatDate(e.from_date), e.is_currently_working ? 'Present' : formatDate(e.to_date)].filter(Boolean).join(' - '),
        details: [e.reason_for_leaving, e.key_achievements].filter(Boolean).join('. ')
      }))
    : [];

  const education = Array.isArray(profileData.education)
    ? profileData.education.map(ed => ({
        degree: ed.degree || '',
        institution: ed.institution || '',
        year: ed.year ? String(ed.year) : '',
        details: [ed.specialization, ed.cgpa ? `CGPA: ${ed.cgpa}` : ''].filter(Boolean).join(', ')
      }))
    : [];

  const projects = Array.isArray(profileData.projects)
    ? profileData.projects.map(p => {
        let techArr = [];
        try {
          techArr = JSON.parse(p.technologies);
        } catch {
          techArr = p.technologies ? String(p.technologies).split(',') : [];
        }
        return {
          name: p.project_name || '',
          role: p.role || '',
          technologies: Array.isArray(techArr) ? techArr : [],
          description: p.description || ''
        };
      })
    : [];

  const languages = Array.isArray(profileData.languages)
    ? profileData.languages.map(l => l.name || l.language_name).filter(Boolean)
    : [];

  const links = [
    profileData.linkedin_url,
    profileData.github_url,
    profileData.portfolio_url
  ].filter(Boolean);

  const prompt = `You are a professional ATS Resume Writer.
Convert the candidate's authentic profile data into clean, structured, ATS-compliant resume sections.

STRICT ZERO-HALLUCINATION RULES:
1. Candidate profile data is the ONLY source of truth.
2. DO NOT INVENT or assume any employer, company, job title, university, degree, certification, year, date, metric, percentage, throughput, dollar amount, team size, or technology.
3. If candidate details are missing or brief, refine phrasing and grammar of what was actually provided. NEVER fabricate accomplishments, responsibilities, or experiences.
4. If a section is empty in candidate data, return an empty array or empty string for that section.
5. PROFESSIONAL SUMMARY REQUIREMENTS:
   - Target length: approximately 80–140 words, comprising 3–5 meaningful sentences.
   - Tone: Professional resume profile, dense with factual candidate information.
   - Perspective: Write from a professional resume perspective without first-person pronouns ("I", "my").
   - DO NOT begin by introducing the candidate by name (e.g. NEVER begin with "${name} is..." or "Meet Soni is...").
   - DO NOT repeatedly mention the candidate's name.
   - Synthesize the candidate's actual skills, education, experience, and projects into a coherent profile.
   - STRICT RULE: DO NOT append a list of skills (e.g., "Core Skills & Competencies:" or "Skills:") inside or after the summary. The summary must be continuous prose only.
   - CRITICAL: Ensure the summary is a complete, grammatically correct paragraph ending with proper punctuation. NEVER truncate sentences.
6. EXPERIENCE BULLETS:
   - For every experience entry, generate exactly the necessary number of strong, concise bullet points (typically 2-3). Do not force exactly 3 if data is limited.
   - Use only documented responsibilities and contributions. Do not fabricate metrics, impact, or responsibilities.
   - For every experience entry, generate approximately THREE strong, concise bullet points based strictly on the candidate's stored designation, dates, achievements, and context.
   - Focus on what was built, technologies applied, and responsibilities fulfilled where supported by source data.
7. PROJECT BULLETS:
   - For every project, generate concise, meaningful bullet points in "bullets" based strictly on actual project information.
   - Avoid repeating the same technologies across every bullet.
   - Do not claim full ownership or architecture leadership unless explicitly stated in the provided data.

Candidate Data:
Name: ${name}
Headline: ${headline}
Email: ${email}
Phone: ${phone}
Location: ${location}
Links: ${JSON.stringify(links)}
Summary: ${summary}
Skills: ${JSON.stringify(skills)}
Experience: ${JSON.stringify(experience)}
Projects: ${JSON.stringify(projects)}
Education: ${JSON.stringify(education)}
Languages: ${JSON.stringify(languages)}

Return ONLY valid JSON with this exact structure:
{
  "name": "${name}",
  "headline": "${headline}",
  "contact": {
    "email": "${email}",
    "phone": "${phone}",
    "location": "${location}",
    "links": ${JSON.stringify(links)}
  },
  "summary": "...",
  "skills": ["..."],
  "experience": [
    {
      "company": "...",
      "title": "...",
      "period": "...",
      "bullets": ["...", "...", "..."]
    }
  ],
  "projects": [
    {
      "name": "...",
      "role": "...",
      "technologies": ["..."],
      "description": "...",
      "bullets": ["...", "...", "..."]
    }
  ],
  "education": [
    {
      "degree": "...",
      "institution": "...",
      "year": "...",
      "details": "..."
    }
  ],
  "languages": ["..."]
}`;

  const result = await callGeminiAPI(prompt, 'ats_resume_builder', profileData);

  if (result && result.error) {
    return {
      isValid: false,
      error: true,
      errorCode: result.errorCode || 'GENERATION_FAILED',
      message: 'AI Resume Builder is temporarily unavailable. Please try again later.'
    };
  }

  let parsed = null;
  if (result.structuredData) {
    parsed = result.structuredData;
  } else if (result.text) {
    try {
      const clean = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.warn('Failed to parse Gemini response as JSON:', e.message);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      error: true,
      errorCode: 'INVALID_RESPONSE',
      message: 'AI Resume Builder is temporarily unavailable. Please try again later.'
    };
  }

  // Safety assertions: ensure core candidate identity and non-fabricatable facts are exact
  parsed.name = name;
  if (!parsed.contact) parsed.contact = {};
  parsed.contact.email = email;
  parsed.contact.phone = phone;
  parsed.contact.location = location;
  parsed.contact.links = links;
  
  // Enforce DB-only skills and languages
  parsed.skills = skills;
  parsed.languages = languages;

  // Cleanup: Ensure no hallucinated 'Core Skills' or 'Skills' section was appended to the summary
  if (parsed.summary && typeof parsed.summary === 'string') {
    parsed.summary = parsed.summary.replace(/(?:\n|\r)*(?:Core )?Skills(?: & Competencies)?:?[\s\S]*$/i, '').trim();
  }

  return {
    isValid: true,
    error: false,
    data: parsed
  };
};

module.exports = {
  generateResumeEnhancement,
  generateJobDescription,
  generateAtsResume,
  validateAndSanitizeJdData,
  parseMarkdownToStructuredJd,
  classifyGeminiError
};


