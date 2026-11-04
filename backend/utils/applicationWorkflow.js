const ALIASES = Object.freeze({ reviewing: 'under_review', hired: 'selected' });
const STATUSES = Object.freeze(['applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected', 'on_hold']);
const TRANSITIONS = Object.freeze({
  applied: ['under_review', 'shortlisted', 'rejected', 'on_hold'],
  under_review: ['shortlisted', 'interview', 'rejected', 'on_hold'],
  shortlisted: ['interview', 'selected', 'rejected', 'on_hold'],
  interview: ['selected', 'rejected', 'on_hold'],
  on_hold: ['under_review', 'shortlisted', 'interview', 'rejected'],
  selected: [],
  rejected: []
});

function normalizeApplicationStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ALIASES[status] || status;
}

function validateTransition(current, target) {
  const from = normalizeApplicationStatus(current);
  const to = normalizeApplicationStatus(target);
  if (!STATUSES.includes(to)) return { valid: false, code: 'INVALID_APPLICATION_STATUS', from, to };
  if (from === to) return { valid: true, unchanged: true, from, to };
  if (!(TRANSITIONS[from] || []).includes(to)) return { valid: false, code: 'INVALID_STATUS_TRANSITION', from, to };
  return { valid: true, unchanged: false, from, to };
}

module.exports = { STATUSES, normalizeApplicationStatus, validateTransition };
