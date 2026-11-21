const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Safeguard: mock database config module so real DB connection is never loaded
const databaseConfigPath = path.resolve(__dirname, '../../src/config/database.js');
require.cache[databaseConfigPath] = {
  id: databaseConfigPath,
  filename: databaseConfigPath,
  loaded: true,
  exports: {
    query: () => {
      throw new Error('Real database query must never be executed during unit tests');
    },
  },
};

// Mock paths for User model and argon2
const userModelPath = path.resolve(__dirname, '../../src/models/User.js');
const argon2Path = require.resolve('argon2');

let mockFindByEmail = null;
let mockVerify = null;

// Mock User model in CommonJS cache before loading authService
require.cache[userModelPath] = {
  id: userModelPath,
  filename: userModelPath,
  loaded: true,
  exports: {
    findByEmail: async (...args) => {
      if (typeof mockFindByEmail !== 'function') {
        throw new Error('mockFindByEmail handler not defined for current test');
      }
      return mockFindByEmail(...args);
    },
  },
};

// Mock argon2 in CommonJS cache before loading authService
require.cache[argon2Path] = {
  id: argon2Path,
  filename: argon2Path,
  loaded: true,
  exports: {
    verify: async (...args) => {
      if (typeof mockVerify !== 'function') {
        throw new Error('mockVerify handler not defined for current test');
      }
      return mockVerify(...args);
    },
  },
};

// Load authService with mocked dependencies
const authService = require('../../src/services/authService');

describe('authService.login - Isolated Unit Tests', () => {
  beforeEach(() => {
    // Reset mock state before each test to prevent test interference
    mockFindByEmail = null;
    mockVerify = null;
  });

  describe('Input Validation', () => {
    it('should reject when email or password is missing', async () => {
      let findByEmailCalled = false;
      mockFindByEmail = async () => {
        findByEmailCalled = true;
        return null;
      };

      const res1 = await authService.login();
      const res2 = await authService.login(undefined, 'synthetic_pwd');
      const res3 = await authService.login('synthetic@example.com', undefined);

      const expected = { success: false, message: 'Invalid email or password.' };
      assert.deepStrictEqual(res1, expected);
      assert.deepStrictEqual(res2, expected);
      assert.deepStrictEqual(res3, expected);
      assert.strictEqual(findByEmailCalled, false, 'Database lookup should not be called');
    });

    it('should reject when email or password is not a string', async () => {
      let findByEmailCalled = false;
      mockFindByEmail = async () => {
        findByEmailCalled = true;
        return null;
      };

      const nonStringInputs = [
        [null, 'synthetic_pwd'],
        ['synthetic@example.com', null],
        [12345, 'synthetic_pwd'],
        ['synthetic@example.com', 12345],
        [{}, 'synthetic_pwd'],
        ['synthetic@example.com', {}],
        [true, 'synthetic_pwd'],
        ['synthetic@example.com', false],
        [[], 'synthetic_pwd'],
        ['synthetic@example.com', []],
      ];

      const expected = { success: false, message: 'Invalid email or password.' };

      for (const [email, pwd] of nonStringInputs) {
        const result = await authService.login(email, pwd);
        assert.deepStrictEqual(result, expected);
      }

      assert.strictEqual(findByEmailCalled, false, 'Database lookup should not be called');
    });

    it('should reject empty or whitespace-only email and password', async () => {
      let findByEmailCalled = false;
      mockFindByEmail = async () => {
        findByEmailCalled = true;
        return null;
      };

      const whitespaceInputs = [
        ['', 'synthetic_pwd'],
        ['synthetic@example.com', ''],
        ['   ', 'synthetic_pwd'],
        ['synthetic@example.com', '   '],
        ['\t\n\r ', 'synthetic_pwd'],
        ['synthetic@example.com', '\t\n\r '],
      ];

      const expected = { success: false, message: 'Invalid email or password.' };

      for (const [email, pwd] of whitespaceInputs) {
        const result = await authService.login(email, pwd);
        assert.deepStrictEqual(result, expected);
      }

      assert.strictEqual(findByEmailCalled, false, 'Database lookup should not be called');
    });
  });

  describe('User Lookup & Status', () => {
    it('should correctly pass email with uppercase and surrounding whitespace to User.findByEmail', async () => {
      let lookupArg = null;
      mockFindByEmail = async (email) => {
        lookupArg = email;
        return {
          user_id: 301,
          role_id: 1,
          full_name: 'Synthetic User',
          email: 'synthetic.user@example.com',
          password_hash: '$argon2id$v=19$m=65536,t=3,p=4$synthetic_hash',
          is_active: true,
          role_name: 'staff',
        };
      };

      mockVerify = async () => true;

      const inputEmail = '   UPPERCASE.USER@EXAMPLE.COM   ';
      const result = await authService.login(inputEmail, 'valid_password');

      assert.strictEqual(
        lookupArg,
        inputEmail,
        'User.findByEmail should receive the email string directly for normalization'
      );
      assert.strictEqual(result.success, true);
    });

    it('should reject when user is not found in database', async () => {
      let lookupArg = null;
      mockFindByEmail = async (email) => {
        lookupArg = email;
        return null;
      };

      let verifyCalled = false;
      mockVerify = async () => {
        verifyCalled = true;
        return true;
      };

      const result = await authService.login('unknown@example.com', 'synthetic_pwd');

      assert.strictEqual(lookupArg, 'unknown@example.com');
      assert.strictEqual(verifyCalled, false, 'Password verify must not be called when user not found');
      assert.deepStrictEqual(result, {
        success: false,
        message: 'Invalid email or password.',
      });
    });

    it('should reject when user exists but is inactive', async () => {
      let lookupArg = null;
      mockFindByEmail = async (email) => {
        lookupArg = email;
        return {
          user_id: 101,
          role_id: 1,
          full_name: 'Synthetic Inactive User',
          email: 'inactive@example.com',
          password_hash: '$argon2id$v=19$m=65536,t=3,p=4$synthetic_hash',
          is_active: false,
          role_name: 'operator',
        };
      };

      let verifyCalled = false;
      mockVerify = async () => {
        verifyCalled = true;
        return true;
      };

      const result = await authService.login('inactive@example.com', 'synthetic_pwd');

      assert.strictEqual(lookupArg, 'inactive@example.com');
      assert.strictEqual(verifyCalled, false, 'Password verify must not be called for inactive users');
      assert.deepStrictEqual(result, {
        success: false,
        message: 'Invalid email or password.',
      });
    });
  });

  describe('Password Verification', () => {
    it('should reject when password does not match', async () => {
      const syntheticHash = '$argon2id$v=19$m=65536,t=3,p=4$synthetic_hash_value';
      mockFindByEmail = async () => ({
        user_id: 202,
        role_id: 2,
        full_name: 'Synthetic Active User',
        email: 'active@example.com',
        password_hash: syntheticHash,
        is_active: true,
        role_name: 'manager',
      });

      let verifyArgs = null;
      mockVerify = async (hash, plain) => {
        verifyArgs = { hash, plain };
        return false;
      };

      const result = await authService.login('active@example.com', 'wrong_password');

      assert.deepStrictEqual(verifyArgs, {
        hash: syntheticHash,
        plain: 'wrong_password',
      });
      assert.deepStrictEqual(result, {
        success: false,
        message: 'Invalid email or password.',
      });
    });
  });

  describe('Successful Authentication', () => {
    it('should authenticate active user with valid password and return user details', async () => {
      const syntheticHash = '$argon2id$v=19$m=65536,t=3,p=4$synthetic_valid_hash';
      mockFindByEmail = async () => ({
        user_id: 303,
        role_id: 3,
        full_name: 'Synthetic Valid User',
        email: 'valid@example.com',
        password_hash: syntheticHash,
        is_active: true,
        role_name: 'admin',
      });

      let verifyArgs = null;
      mockVerify = async (hash, plain) => {
        verifyArgs = { hash, plain };
        return true;
      };

      const result = await authService.login('valid@example.com', 'correct_password');

      assert.deepStrictEqual(verifyArgs, {
        hash: syntheticHash,
        plain: 'correct_password',
      });
      assert.deepStrictEqual(result, {
        success: true,
        user: {
          userId: '303',
          fullName: 'Synthetic Valid User',
          role: 'admin',
        },
      });
    });

    it('should return userId as a string and exclude sensitive or extra database fields', async () => {
      mockFindByEmail = async () => ({
        user_id: 404,
        role_id: 99,
        full_name: 'Synthetic Secure User',
        email: 'secure@example.com',
        password_hash: '$argon2id$v=19$m=65536,t=3,p=4$sensitive_hash_data',
        password: 'plain_password_should_never_exist_or_leak',
        is_active: true,
        role_name: 'superadmin',
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockVerify = async () => true;

      const result = await authService.login('secure@example.com', 'correct_password');

      assert.strictEqual(result.success, true);
      assert.strictEqual(typeof result.user.userId, 'string');
      assert.strictEqual(result.user.userId, '404');
      assert.strictEqual(result.user.fullName, 'Synthetic Secure User');
      assert.strictEqual(result.user.role, 'superadmin');

      // Verify no sensitive or unintended fields exist on the returned user object
      const returnedKeys = Object.keys(result.user).sort();
      assert.deepStrictEqual(returnedKeys, ['fullName', 'role', 'userId'].sort());

      assert.strictEqual(result.user.password, undefined);
      assert.strictEqual(result.user.password_hash, undefined);
      assert.strictEqual(result.user.email, undefined);
      assert.strictEqual(result.user.role_id, undefined);
      assert.strictEqual(result.user.is_active, undefined);
      assert.strictEqual(result.user.created_at, undefined);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate database lookup errors without converting them to generic failure', async () => {
      const syntheticDbError = new Error('PostgreSQL connection timeout');
      syntheticDbError.code = 'ETIMEDOUT';

      mockFindByEmail = async () => {
        throw syntheticDbError;
      };

      let verifyCalled = false;
      mockVerify = async () => {
        verifyCalled = true;
        return true;
      };

      await assert.rejects(
        async () => {
          await authService.login('error@example.com', 'synthetic_pwd');
        },
        (err) => {
          assert.strictEqual(err, syntheticDbError);
          assert.strictEqual(err.message, 'PostgreSQL connection timeout');
          assert.strictEqual(err.code, 'ETIMEDOUT');
          return true;
        }
      );

      assert.strictEqual(verifyCalled, false, 'Password verify must not be called after lookup error');
    });

    it('should propagate unexpected password verification errors', async () => {
      mockFindByEmail = async () => ({
        user_id: 505,
        role_id: 1,
        full_name: 'Synthetic User',
        email: 'user@example.com',
        password_hash: 'corrupted_hash',
        is_active: true,
        role_name: 'staff',
      });

      const syntheticVerifyError = new Error('Argon2 internal verify failure');
      mockVerify = async () => {
        throw syntheticVerifyError;
      };

      await assert.rejects(
        async () => {
          await authService.login('user@example.com', 'synthetic_pwd');
        },
        (err) => {
          assert.strictEqual(err, syntheticVerifyError);
          assert.strictEqual(err.message, 'Argon2 internal verify failure');
          return true;
        }
      );
    });
  });
});
