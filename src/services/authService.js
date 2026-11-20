const argon2 = require('argon2');
const User = require('../models/User');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

async function login(email, password) {
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return {
      success: false,
      message: 'Invalid email or password.',
    };
  }

  const user = await User.findByEmail(email);

  if (!user || !user.is_active) {
    return {
      success: false,
      message: 'Invalid email or password.',
    };
  }

  const isPasswordValid = await argon2.verify(user.password_hash, password);

  if (!isPasswordValid) {
    return {
      success: false,
      message: 'Invalid email or password.',
    };
  }

  return {
    success: true,
    user: {
      userId: String(user.user_id),
      fullName: user.full_name,
      role: user.role_name,
    },
  };
}

module.exports = {
  login,
};
