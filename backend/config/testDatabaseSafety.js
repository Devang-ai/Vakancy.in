const REQUIRED_TEST_MODE = 'isolated-mysql';
const RESET_ACKNOWLEDGEMENT = 'I_UNDERSTAND_THIS_DATABASE_IS_DISPOSABLE';

const normalize = value => String(value || '').trim().toLowerCase();

function getIsolatedTestConfig(env = process.env, { destructive = false } = {}) {
  if (env.NODE_ENV !== 'test' || env.DATABASE_TEST_MODE !== REQUIRED_TEST_MODE) {
    throw new Error('Isolated database access requires NODE_ENV=test and DATABASE_TEST_MODE=isolated-mysql.');
  }

  const required = ['TEST_DB_HOST', 'TEST_DB_USER', 'TEST_DB_PASSWORD', 'TEST_DB_NAME'];
  const missing = required.filter(name => !String(env[name] || '').trim());
  if (missing.length) throw new Error(`Missing isolated database settings: ${missing.join(', ')}.`);

  const database = String(env.TEST_DB_NAME).trim();
  if (!/^vakancy_(?:ci_)?test_[a-z0-9_]+$/i.test(database)) {
    throw new Error('TEST_DB_NAME must use the dedicated vakancy_test_* or vakancy_ci_test_* naming convention.');
  }

  const sameEndpoint = normalize(env.TEST_DB_HOST) === normalize(env.DB_HOST || 'localhost') &&
    String(env.TEST_DB_PORT || 3306) === String(env.DB_PORT || 3306);
  if (sameEndpoint && normalize(database) === normalize(env.DB_NAME || 'vakancy_main_db')) {
    throw new Error('The isolated database must not be the configured application database.');
  }

  const forbidden = ['vakancy_main_db', 'vakancy_db', 'production', 'prod', 'development', 'dev', 'mysql', 'test'];
  if (forbidden.includes(normalize(database))) throw new Error('Refusing a reserved or application database identifier.');
  if (destructive && env.TEST_DB_RESET_ACK !== RESET_ACKNOWLEDGEMENT) {
    throw new Error('Destructive test setup/teardown requires the exact TEST_DB_RESET_ACK acknowledgement.');
  }

  return {
    host: env.TEST_DB_HOST,
    port: Number(env.TEST_DB_PORT || 3306),
    user: env.TEST_DB_USER,
    password: env.TEST_DB_PASSWORD,
    database,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0
  };
}

module.exports = { getIsolatedTestConfig, REQUIRED_TEST_MODE, RESET_ACKNOWLEDGEMENT };
