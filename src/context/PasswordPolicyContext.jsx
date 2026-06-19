// src/context/PasswordPolicyContext.jsx
import React, { createContext, useEffect, useState } from 'react';
import { loadPasswordPolicy } from '../services/passwordPolicyService';

export const PasswordPolicyContext = createContext(null);

export const PasswordPolicyProvider = ({ children }) => {
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState(null);

  const refreshPolicy = async () => {
    try {
      const data = await loadPasswordPolicy();
      setPolicy(data);
    } catch (err) {
      console.error('Failed to load password policy', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    refreshPolicy();
  }, []);

  return (
    <PasswordPolicyContext.Provider value={{ policy, setPolicy, error, refreshPolicy }}>
      {children}
    </PasswordPolicyContext.Provider>
  );
};
