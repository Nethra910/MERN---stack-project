/**
 * Client-side password validation
 * Must match backend validation rules
 */
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
    };
  }

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }

  if (password.length > 128) {
    errors.push('Less than 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('One number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('One special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate password strength score
 * Returns: weak, medium, strong
 */
export const getPasswordStrength = (password) => {
  if (!password) return { strength: 'none', score: 0 };

  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;

  // Consecutive characters penalty
  if (/(.)\1{2,}/.test(password)) score -= 1;

  if (score <= 3) return { strength: 'weak', score };
  if (score <= 5) return { strength: 'medium', score };
  return { strength: 'strong', score };
};
