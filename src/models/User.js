const pool = require('../config/database');

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
}

function logLookupFailure(err) {
  const code = err && typeof err.code === 'string' ? err.code : 'unknown';
  console.error(`User lookup failed (${code})`);
}

async function findByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  try {
    const result = await pool.query(
      `SELECT
         users.user_id,
         users.role_id,
         users.full_name,
         users.email,
         users.password_hash,
         users.is_active,
         roles.role_name
       FROM public.users AS users
       INNER JOIN public.roles AS roles ON roles.role_id = users.role_id
       WHERE lower(users.email) = $1`,
      [normalizedEmail]
    );

    return result.rows[0] || null;
  } catch (err) {
    logLookupFailure(err);
    throw new Error('User lookup failed');
  }
}

async function findById(userId) {
  if (userId === undefined || userId === null || userId === '') {
    return null;
  }

  try {
    const result = await pool.query(
      `SELECT
         users.user_id,
         users.role_id,
         users.full_name,
         users.email,
         users.is_active,
         roles.role_name
       FROM public.users AS users
       INNER JOIN public.roles AS roles ON roles.role_id = users.role_id
       WHERE users.user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (err) {
    logLookupFailure(err);
    throw new Error('User lookup failed');
  }
}

module.exports = {
  findByEmail,
  findById,
};
