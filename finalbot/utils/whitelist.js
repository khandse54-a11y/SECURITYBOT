// utils/whitelist.js
require('dotenv').config();

// Load from .env on startup
const runtimeWhitelist = new Set(
  (process.env.WHITELIST || '').split(',').map(id => id.trim()).filter(Boolean)
);

// Owner is always whitelisted
if (process.env.OWNER_ID) runtimeWhitelist.add(process.env.OWNER_ID.trim());

const isWhitelisted   = (userId) => runtimeWhitelist.has(userId);
const addWhitelist    = (userId) => { runtimeWhitelist.add(userId); };
const removeWhitelist = (userId) => {
  if (userId === process.env.OWNER_ID) return false; // can never remove owner
  runtimeWhitelist.delete(userId);
  return true;
};
const getWhitelist    = () => [...runtimeWhitelist];

module.exports = { isWhitelisted, addWhitelist, removeWhitelist, getWhitelist };
