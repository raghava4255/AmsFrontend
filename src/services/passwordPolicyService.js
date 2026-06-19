// src/services/passwordPolicyService.js
/**
 * Fetch password‑policy configuration from the backend.
 * Returns an object like:
 * {
 *   minLength: 8,
 *   maxLength: 64,
 *   requireUpper: true,
 *   requireLower: true,
 *   requireNumber: true,
 *   requireSpecial: true,
 *   forbiddenSubstrings: []
 * }
 */
import { API_BASE_URL } from '../config';

export async function loadPasswordPolicy() {
  try {
    const resp = await fetch(`${API_BASE_URL}/password-policy`);
    if (!resp.ok) throw new Error('Failed to fetch policy');
    const data = await resp.json();
    return data;
  } catch (e) {
    // Fallback defaults if the endpoint is unavailable
    console.warn('Using fallback password policy', e);
    return {
      minLength: 8,
      maxLength: 64,
      requireUpper: true,
      requireLower: true,
      requireNumber: true,
      requireSpecial: true,
      forbiddenSubstrings: []
    };
  }
}

export async function updatePasswordPolicy(adminUserId, policyData) {
  const resp = await fetch(`${API_BASE_URL}/password-policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adminUserId,
      minLength: parseInt(policyData.minLength),
      maxLength: parseInt(policyData.maxLength),
      requireUpper: !!policyData.requireUpper,
      requireLower: !!policyData.requireLower,
      requireNumber: !!policyData.requireNumber,
      requireSpecial: !!policyData.requireSpecial
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Failed to update password policy');
  return data;
}
