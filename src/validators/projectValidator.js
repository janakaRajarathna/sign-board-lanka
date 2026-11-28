'use strict';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  CUSTOMER_FULL_NAME: 150,
  CUSTOMER_EMAIL: 254,
  CUSTOMER_PHONE: 20,
  CUSTOMER_ADDRESS: 1000,
  PROJECT_NAME: 200,
  PROJECT_ADDRESS: 1000,
  PROJECT_LOCATION: 255,
  PROJECT_DESCRIPTION: 2000,
  CANCELLATION_REASON: 500,
};

/**
 * Parses a positive safe integer from number or numeric string.
 *
 * @param {*} value
 * @returns {number|null}
 */
function parsePositiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 && Number.isSafeInteger(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const num = Number(trimmed);
    return num > 0 && Number.isSafeInteger(num) ? num : null;
  }
  return null;
}

/**
 * Normalizes a string field by trimming whitespace.
 *
 * @param {*} value
 * @returns {string}
 */
function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validates and sanitizes the POST /projects request body.
 * Never trusts client-supplied projectCode, createdBy, assignedBy, currentStageId, or projectStatus.
 *
 * @param {Object} body
 * @returns {{ valid: boolean, errors: Object<string, string>, formValues: Object, data: Object|null }}
 */
function validateCreateProjectInput(body) {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = {};

  const rawMode = cleanString(raw.customerMode);
  const customerMode = rawMode === 'new' ? 'new' : rawMode === 'existing' ? 'existing' : '';

  const customerIdRaw = cleanString(raw.customerId);
  const customerFullName = cleanString(raw.customerFullName);
  const customerEmailRaw = cleanString(raw.customerEmail);
  const customerEmail = customerEmailRaw.toLowerCase();
  const customerPhone = cleanString(raw.customerPhone);
  const customerAddress = cleanString(raw.customerAddress);

  const projectName = cleanString(raw.projectName);
  const projectAddress = cleanString(raw.projectAddress);
  const projectLocation = cleanString(raw.projectLocation);
  const description = cleanString(raw.description);
  const projectManagerIdRaw = cleanString(raw.projectManagerId);

  const formValues = {
    customerMode: customerMode || 'existing',
    customerId: customerIdRaw,
    customerFullName,
    customerEmail: customerEmailRaw,
    customerPhone,
    customerAddress,
    projectName,
    projectAddress,
    projectLocation,
    description,
    projectManagerId: projectManagerIdRaw,
  };

  if (!customerMode) {
    errors.customerMode = 'Please select an existing customer or register a new customer.';
  }

  let parsedCustomerId = null;
  if (customerMode === 'existing') {
    parsedCustomerId = parsePositiveInteger(customerIdRaw);
    if (!parsedCustomerId) {
      errors.customerId = 'Please search and select an active customer.';
    }
  } else if (customerMode === 'new') {
    if (!customerFullName) {
      errors.customerFullName = 'Customer full name is required.';
    } else if (customerFullName.length > LIMITS.CUSTOMER_FULL_NAME) {
      errors.customerFullName = `Customer full name must not exceed ${LIMITS.CUSTOMER_FULL_NAME} characters.`;
    }

    if (!customerEmail) {
      errors.customerEmail = 'Customer email is required.';
    } else if (customerEmail.length > LIMITS.CUSTOMER_EMAIL || !EMAIL_PATTERN.test(customerEmail)) {
      errors.customerEmail = 'Please enter a valid customer email address.';
    }

    if (!customerPhone) {
      errors.customerPhone = 'Customer phone is required.';
    } else if (customerPhone.length > LIMITS.CUSTOMER_PHONE) {
      errors.customerPhone = `Customer phone must not exceed ${LIMITS.CUSTOMER_PHONE} characters.`;
    }

    if (!customerAddress) {
      errors.customerAddress = 'Customer address is required.';
    } else if (customerAddress.length > LIMITS.CUSTOMER_ADDRESS) {
      errors.customerAddress = `Customer address must not exceed ${LIMITS.CUSTOMER_ADDRESS} characters.`;
    }
  }

  if (!projectName) {
    errors.projectName = 'Project name is required.';
  } else if (projectName.length > LIMITS.PROJECT_NAME) {
    errors.projectName = `Project name must not exceed ${LIMITS.PROJECT_NAME} characters.`;
  }

  if (!projectAddress) {
    errors.projectAddress = 'Project address is required.';
  } else if (projectAddress.length > LIMITS.PROJECT_ADDRESS) {
    errors.projectAddress = `Project address must not exceed ${LIMITS.PROJECT_ADDRESS} characters.`;
  }

  if (projectLocation.length > LIMITS.PROJECT_LOCATION) {
    errors.projectLocation = `Project location must not exceed ${LIMITS.PROJECT_LOCATION} characters.`;
  }

  if (description.length > LIMITS.PROJECT_DESCRIPTION) {
    errors.description = `Description must not exceed ${LIMITS.PROJECT_DESCRIPTION} characters.`;
  }

  let parsedProjectManagerId = null;
  if (projectManagerIdRaw !== '') {
    parsedProjectManagerId = parsePositiveInteger(projectManagerIdRaw);
    if (!parsedProjectManagerId) {
      errors.projectManagerId = 'Selected Project Manager is invalid.';
    }
  }

  const valid = Object.keys(errors).length === 0;
  if (!valid) {
    return { valid: false, errors, formValues, data: null };
  }

  return {
    valid: true,
    errors: {},
    formValues,
    data: {
      customerMode,
      customerId: parsedCustomerId,
      newCustomer:
        customerMode === 'new'
          ? {
              fullName: customerFullName,
              email: customerEmail,
              phone: customerPhone,
              address: customerAddress,
            }
          : null,
      projectName,
      projectAddress,
      projectLocation: projectLocation || null,
      description: description || null,
      projectManagerId: parsedProjectManagerId,
    },
  };
}

/**
 * Validates and sanitizes the POST /projects/:projectId/cancel request body.
 * Enforces reason: non-empty string, max 500 characters after trim.
 *
 * @param {Object} body
 * @returns {{ valid: boolean, errors: Object<string, string>, data: Object|null }}
 */
function validateCancelProjectInput(body) {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = {};

  const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';

  if (!reason) {
    errors.reason = 'A cancellation reason is required.';
  } else if (reason.length > LIMITS.CANCELLATION_REASON) {
    errors.reason = `Cancellation reason must not exceed ${LIMITS.CANCELLATION_REASON} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, data: null };
  }

  return { valid: true, errors: {}, data: { reason } };
}

module.exports = {
  LIMITS,
  parsePositiveInteger,
  validateCreateProjectInput,
  validateCancelProjectInput,
};
