/**
 * Deterministic Candidate Profile Completion Calculator
 *
 * Weighting (Total = 100%):
 * 1. Personal / Identity: 15%
 *    - Full Name = 5%
 *    - DOB = 3%
 *    - Current Location = 4%
 *    - Profile Category = 3%
 *
 * 2. Professional Info: 20%
 *    - Professional Title / Headline = 5%
 *    - Current Organization = 4%
 *    - Current Designation = 4%
 *    - Professional Summary = 4%
 *    - Preferred Salary = 3%
 *
 * 3. Education: 15%
 *    - At least one education record = 10%
 *    - Degree/details sufficiently completed = 5%
 *
 * 4. Experience: 20%
 *    - At least one experience record = 12%
 *    - Experience record has org + designation + dates = 8%
 *
 * 5. Skills: 10%
 *    - At least one skill = 5%
 *    - Multiple selected skills (>= 3) = 5%
 *
 * 6. Projects: 5%
 *    - At least one project = 5%
 *
 * 7. Languages: 5%
 *    - At least one language = 3%
 *    - At least one proficiency selection (Read/Write/Speak) = 2%
 *
 * 8. Social Links: 5%
 *    - At least one social/profile link = 3%
 *    - Portfolio or second professional link = 2%
 *
 * 9. Resumes: 5%
 *    - At least one resume uploaded or generated = 5%
 */

function calculateProfileCompletion(data = {}) {
  let score = 0;
  const missing = [];

  // 1. Personal / Identity (15%)
  if (data.name && String(data.name).trim()) {
    score += 5;
  } else {
    missing.push('Full Name');
  }

  if (data.dob) {
    score += 3;
  } else {
    missing.push('Date of Birth');
  }

  if (data.current_location && String(data.current_location).trim()) {
    score += 4;
  } else {
    missing.push('Current Location');
  }

  if (data.profile_type && String(data.profile_type).trim()) {
    score += 3;
  } else {
    missing.push('Profile Category');
  }

  // 2. Professional Info (20%)
  if (data.professional_headline && String(data.professional_headline).trim()) {
    score += 5;
  } else {
    missing.push('Professional Title');
  }

  if (data.current_organization && String(data.current_organization).trim()) {
    score += 4;
  } else {
    missing.push('Current Organization');
  }

  if (data.current_designation && String(data.current_designation).trim()) {
    score += 4;
  } else {
    missing.push('Current Designation');
  }

  if (data.professional_summary && String(data.professional_summary).trim()) {
    score += 4;
  } else {
    missing.push('Professional Summary');
  }

  if (data.preferred_salary !== null && data.preferred_salary !== undefined && String(data.preferred_salary).trim() !== '') {
    score += 3;
  } else {
    missing.push('Preferred Salary');
  }

  // 3. Education (15%)
  const eduList = Array.isArray(data.education) ? data.education : [];
  if (eduList.length > 0) {
    score += 10;
    const hasDetails = eduList.some(e => (e.degree && e.institution) || e.year || e.cgpa);
    if (hasDetails) {
      score += 5;
    }
  } else {
    missing.push('Education');
  }

  // 4. Experience (20%)
  const expList = Array.isArray(data.experience) ? data.experience : [];
  if (expList.length > 0) {
    score += 12;
    const hasDetails = expList.some(e => e.organization && e.designation && (e.from_date || e.is_currently_working));
    if (hasDetails) {
      score += 8;
    }
  } else {
    missing.push('Work Experience');
  }

  // 5. Skills (10%)
  const skillList = Array.isArray(data.skills) ? data.skills : [];
  if (skillList.length > 0) {
    score += 5;
    if (skillList.length >= 3) {
      score += 5;
    }
  } else {
    missing.push('Skills');
  }

  // 6. Projects (5%)
  const projList = Array.isArray(data.projects) ? data.projects : [];
  if (projList.length > 0) {
    score += 5;
  } else {
    missing.push('Projects');
  }

  // 7. Languages (5%)
  const langList = Array.isArray(data.languages) ? data.languages : [];
  if (langList.length > 0) {
    score += 3;
    const hasProf = langList.some(l => l.can_read || l.can_write || l.can_speak);
    if (hasProf) {
      score += 2;
    }
  } else {
    missing.push('Languages');
  }

  // 8. Social Links (5%)
  const hasSocial = Boolean(data.linkedin_url || data.github_url || data.facebook_url || data.instagram_url || data.twitter_url);
  const hasPortfolioOrSecond = Boolean(data.portfolio_url || (data.linkedin_url && data.github_url));
  if (hasSocial) score += 3;
  if (hasPortfolioOrSecond) score += 2;
  if (!hasSocial && !hasPortfolioOrSecond) {
    missing.push('Social Links');
  }

  // 9. Resumes (5%)
  const resumeList = Array.isArray(data.resumes) ? data.resumes : [];
  if (resumeList.length > 0) {
    score += 5;
  } else {
    missing.push('Resume');
  }

  const percentage = Math.min(100, Math.round(score));
  return {
    percentage,
    missing
  };
}

module.exports = {
  calculateProfileCompletion
};
