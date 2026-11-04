const migrations = [
  require('./001_files'),
  require('./002_scope_and_sharing'),
  require('./003_account_security'),
  require('./004_workflow_integrity'),
  require('./005_company_leads'),
  require('./006_executive_search_enquiry_jobs'),
  require('./007_google_auth'),
  require('./008_email_otp_recovery'),
  require('./009_executive_search_shortlists'),
  require('./010_recruitment_team_hierarchy'),
  require('./011_job_candidate_shortlist'),
  require('./012_job_specific_callbacks'),
  require('./013_executive_share_verification_and_support_email')
];

function validateMigrationOrder(items = migrations) {
  const ids = items.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate migration identifiers detected.');
  const sorted = [...ids].sort();
  if (ids.some((id, index) => id !== sorted[index])) throw new Error('Migrations are not in deterministic order.');
  return true;
}

module.exports = { migrations, validateMigrationOrder };
