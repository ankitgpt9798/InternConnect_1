// Partly hidden contact details, so the screen shows where a code went without revealing the whole address.

// "asha.verma@gmail.com" -> "as***@gmail.com"
export function maskEmail(email) {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

// "9876543210" -> "98******10"
export function maskPhone(phone) {
  return `${phone.slice(0, 2)}${'*'.repeat(phone.length - 4)}${phone.slice(-2)}`;
}
