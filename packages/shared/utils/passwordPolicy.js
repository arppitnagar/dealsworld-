export function validatePassword(value) {
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must include an uppercase letter.";
  }
  if (!/[a-z]/.test(value)) {
    return "Password must include a lowercase letter.";
  }
  if (!/[0-9]/.test(value)) {
    return "Password must include a number.";
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include a special character.";
  }
  return "";
}
