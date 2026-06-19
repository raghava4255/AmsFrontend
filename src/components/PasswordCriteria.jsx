// src/components/PasswordCriteria.jsx
import React from 'react';
import styles from './PasswordCriteria.module.css';

/**
 * Renders a checklist of password criteria.
 * `criteria` is an object where each key is a rule and the value is a boolean.
 */
export const PasswordCriteria = ({ criteria = {} }) => (
  <ul className={styles.criteriaList}>
    {Object.entries(criteria || {}).map(([key, met]) => {
      // Human readable label
      const labels = {
        length: 'Minimum length',
        upper: 'Uppercase letter',
        lower: 'Lowercase letter',
        number: 'Number',
        special: 'Special character',
        noUserId: 'Does not contain user ID',
        noForbidden: 'No forbidden words',
        match: 'Passwords match'
      };
      const label = labels[key] || key;
      return (
        <li key={key} className={met ? styles.pass : styles.fail}>
          {label}
        </li>
      );
    })}
  </ul>
);

export default PasswordCriteria;
