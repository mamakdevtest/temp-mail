const { EventEmitter } = require('events');

const emailEvents = new EventEmitter();
emailEvents.setMaxListeners(500);

function publishNewEmail(address, email) {
  emailEvents.emit(`email:${String(address).toLowerCase()}`, email);
}

function waitForEmail(address, timeoutMs) {
  const channel = `email:${String(address).toLowerCase()}`;
  return new Promise((resolve) => {
    const onEmail = (email) => finish(email);
    const timer = setTimeout(() => finish(null), timeoutMs);
    const finish = (email) => {
      clearTimeout(timer);
      emailEvents.removeListener(channel, onEmail);
      resolve(email);
    };
    emailEvents.once(channel, onEmail);
  });
}

module.exports = { emailEvents, publishNewEmail, waitForEmail };
