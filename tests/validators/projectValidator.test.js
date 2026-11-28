'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const projectValidator = require('../../src/validators/projectValidator');

describe('projectValidator.validateCreateProjectInput', () => {
  it('1. Accepts valid existing customer project without PM', () => {
    const res = projectValidator.validateCreateProjectInput({
      customerMode: 'existing',
      customerId: '12',
      projectName: '  Dialog Pylon Sign  ',
      projectAddress: '  475 Union Place, Colombo 02  ',
      projectLocation: '',
      description: '',
      projectManagerId: '',
    });

    assert.strictEqual(res.valid, true);
    assert.deepStrictEqual(res.data, {
      customerMode: 'existing',
      customerId: 12,
      newCustomer: null,
      projectName: 'Dialog Pylon Sign',
      projectAddress: '475 Union Place, Colombo 02',
      projectLocation: null,
      description: null,
      projectManagerId: null,
    });
  });

  it('2. Accepts valid new customer project with PM and normalizes email', () => {
    const res = projectValidator.validateCreateProjectInput({
      customerMode: 'new',
      customerFullName: 'Dialog Axiata PLC',
      customerEmail: '  Signage@Dialog.LK  ',
      customerPhone: '+94 11 234 5678',
      customerAddress: '475 Union Place, Colombo 02',
      projectName: 'LED Billboard',
      projectAddress: 'Galle Road, Colombo 03',
      projectLocation: 'Western Province',
      description: 'Double-sided',
      projectManagerId: '5',
      projectCode: 'HACKED-999',
      createdBy: '999',
      assignedBy: '999',
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.data.newCustomer.email, 'signage@dialog.lk');
    assert.strictEqual(res.data.projectManagerId, 5);
    assert.strictEqual(res.data.projectCode, undefined);
    assert.strictEqual(res.data.createdBy, undefined);
    assert.strictEqual(res.data.assignedBy, undefined);
  });

  it('3. Rejects invalid customer email and missing required fields', () => {
    const res = projectValidator.validateCreateProjectInput({
      customerMode: 'new',
      customerFullName: '',
      customerEmail: 'not-an-email',
      customerPhone: '',
      customerAddress: '',
      projectName: '',
      projectAddress: '',
      projectManagerId: 'abc',
    });

    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.customerFullName);
    assert.ok(res.errors.customerEmail);
    assert.ok(res.errors.customerPhone);
    assert.ok(res.errors.customerAddress);
    assert.ok(res.errors.projectName);
    assert.ok(res.errors.projectAddress);
    assert.ok(res.errors.projectManagerId);
  });

  it('4. Rejects oversized optional description and location', () => {
    const res = projectValidator.validateCreateProjectInput({
      customerMode: 'existing',
      customerId: '1',
      projectName: 'Valid Name',
      projectAddress: 'Valid Address',
      projectLocation: 'x'.repeat(256),
      description: 'y'.repeat(2001),
    });

    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.projectLocation);
    assert.ok(res.errors.description);
  });
});

describe('projectValidator.validateCancelProjectInput', () => {
  it('5. Accepts a valid non-empty reason', () => {
    const res = projectValidator.validateCancelProjectInput({ reason: 'Client requested cancellation.' });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.data.reason, 'Client requested cancellation.');
  });

  it('6. Accepts exactly 500-character reason', () => {
    const reason = 'A'.repeat(500);
    const res = projectValidator.validateCancelProjectInput({ reason });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.data.reason, reason);
  });

  it('7. Rejects empty string reason', () => {
    const res = projectValidator.validateCancelProjectInput({ reason: '' });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.reason, 'Should have a reason error');
    assert.strictEqual(res.data, null);
  });

  it('8. Rejects whitespace-only reason', () => {
    const res = projectValidator.validateCancelProjectInput({ reason: '   \t\n  ' });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.reason);
  });

  it('9. Rejects reason over 500 characters', () => {
    const res = projectValidator.validateCancelProjectInput({ reason: 'B'.repeat(501) });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.reason, 'Should have a reason error for >500 chars');
  });

  it('10. Trims surrounding whitespace from valid reason', () => {
    const res = projectValidator.validateCancelProjectInput({ reason: '  Valid reason  ' });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.data.reason, 'Valid reason');
  });

  it('11. Handles missing body object safely', () => {
    const res = projectValidator.validateCancelProjectInput(null);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.reason);
  });

  it('12. Handles non-string reason safely', () => {
    const res = projectValidator.validateCancelProjectInput({ reason: 42 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.reason);
  });
});
