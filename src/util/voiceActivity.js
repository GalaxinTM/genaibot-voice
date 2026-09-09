const serverMsgCount = new Map();

function getGuildCounter(guildId) {
  const key = String(guildId);
  if (!serverMsgCount.has(key)) {
    serverMsgCount.set(key, 0);
  }
  return serverMsgCount.get(key);
}

function incrementGuildCounter(guildId) {
  const key = String(guildId);
  const next = (serverMsgCount.get(key) || 0) + 1;
  serverMsgCount.set(key, next);
  return next;
}

function resetGuildCounter(guildId) {
  const key = String(guildId);
  serverMsgCount.set(key, 0);
}

function getGuildCounterValue(guildId) {
  return getGuildCounter(guildId);
}

module.exports = {
  serverMsgCount,
  getGuildCounterValue,
  incrementGuildCounter,
  resetGuildCounter,
};
