const assert = require('node:assert/strict');
const { extractOtp, extractOtpFromEmail } = require('../server/utils/otpDetection');

const cases = [
  ['labelled numeric code', () => extractOtpFromEmail('Security code', 'Use 482913 to sign in.'), '482913'],
  ['turkish code on next line', () => extractOtp('Doğrulama kodunuz:\n735901'), '735901'],
  ['labelled alphanumeric code', () => extractOtpFromEmail('Use code AB12CD', ''), 'AB12CD'],
  ['html-only isolated code', () => extractOtpFromEmail('', '', '<p>Your one-time passcode:</p><strong>8492</strong>'), '8492'],
  ['date is not an OTP', () => extractOtp('Tarih: 2026-07-26\nToplantı 12:30'), null],
  ['order number is not an OTP', () => extractOtp('Order #783245 has shipped'), null],
];

for (const [name, getActual, expected] of cases) {
  assert.equal(getActual(), expected, name);
}
console.log(`OTP detection: ${cases.length} cases passed`);
