const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.join(repositoryRoot, ...segments), 'utf8');

test('main frontend uses environment-configured API and canonical Admin handoff', () => {
  const api = read('frontend', 'src', 'services', 'api.js');
  const app = read('frontend', 'src', 'App.jsx');
  const redirect = read('frontend', 'src', 'components', 'common', 'LegacyAdminRedirect.jsx');

  assert.match(api, /import\.meta\.env\.VITE_API_URL \|\| '\/api'/);
  assert.match(app, /path="\/admin\/\*" element={<LegacyAdminRedirect \/>}/);
  assert.match(redirect, /VITE_ADMIN_APP_URL/);
  assert.doesNotMatch(app, /import AdminDashboard from/);
});

test('both applications synchronize a 401 with React authentication state', () => {
  for (const application of ['frontend', 'admin-frontend']) {
    const api = read(application, 'src', 'services', 'api.js');
    const auth = read(application, 'src', 'context', 'AuthContext.jsx');
    assert.match(api, /vakancy:auth-expired/);
    assert.match(auth, /addEventListener\('vakancy:auth-expired'/);
    assert.match(auth, /removeEventListener\('vakancy:auth-expired'/);
  }
});

test('route-level lazy loading is enabled in both React applications', () => {
  for (const application of ['frontend', 'admin-frontend']) {
    const app = read(application, 'src', 'App.jsx');
    assert.match(app, /lazy\(\(\) => import\(/);
    assert.match(app, /<Suspense fallback=/);
  }
});

test('Admin navigation is permission-aware and omits unsupported modules', () => {
  const layout = read('admin-frontend', 'src', 'components', 'layout', 'AdminLayout.jsx');
  assert.match(layout, /permissions\.some/);
  assert.match(layout, /permission\.module === module/);
  assert.doesNotMatch(layout, /to: '\/banners'/);
  assert.doesNotMatch(layout, /to: '\/cms'/);
});

test('Admin skills creation uses the implemented protected API route', () => {
  const skills = read('admin-frontend', 'src', 'pages', 'AdminSkills.jsx');
  assert.match(skills, /API\.post\('\/master\/skills'/);
  assert.doesNotMatch(skills, /API\.delete\(`/);
});

test('Admin settings connects to real API and enforces Director authority', () => {
  const settings = read('admin-frontend', 'src', 'pages', 'AdminSettings.jsx');
  assert.match(settings, /API\.get\('\/admin\/settings'\)/);
  assert.match(settings, /API\.put\('\/admin\/settings'/);
  assert.match(settings, /canEdit/);
});

test('Admin callbacks and employers handle team parsing and action error states', () => {
  const callbacks = read('admin-frontend', 'src', 'pages', 'AdminCallbacks.jsx');
  const employers = read('admin-frontend', 'src', 'pages', 'AdminEmployers.jsx');
  assert.match(callbacks, /res\.users \|\| res\.team/);
  assert.match(employers, /actionError/);
  assert.match(employers, /processingId/);
});

test('Admin router handles legacy and subpath alias navigation', () => {
  const adminApp = read('admin-frontend', 'src', 'App.jsx');
  assert.match(adminApp, /path="\/admin"/);
  assert.match(adminApp, /path="\/admin\/\*"/);
});

