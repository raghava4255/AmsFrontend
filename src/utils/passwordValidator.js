// src/utils/passwordValidator.js
/**
 * Validate a password against a dynamic policy object.
 * Returns {valid, criteria} where criteria contains booleans for each rule.
 */
export function validatePassword(password, policy = {}, userId = "") {
  const {
    minLength = 8,
    maxLength = 64,
    requireUpper = true,
    requireLower = true,
    requireNumber = true,
    requireSpecial = true,
    forbiddenSubstrings = []
  } = policy;

  const criteria = {
    length: password.length >= minLength && password.length <= maxLength,
    upper: !requireUpper || /[A-Z]/.test(password),
    lower: !requireLower || /[a-z]/.test(password),
    number: !requireNumber || /[0-9]/.test(password),
    special: !requireSpecial || /[^A-Za-z0-9]/.test(password),
    noUserId: userId ? !password.toLowerCase().includes(userId.toLowerCase()) : true,
    noForbidden: forbiddenSubstrings.every(sub => !password.toLowerCase().includes(sub.toLowerCase()))
  };

  return { criteria, valid: Object.values(criteria).every(Boolean) };
}
