// commands/whitelist.js
// Owner only: !whitelist list / !whitelist add @user / !whitelist remove @user
require('dotenv').config();
const { isWhitelisted, addWhitelist, removeWhitelist, getWhitelist } = require('../utils/whitelist');

module.exports = {
  name: 'whitelist',
  async execute(message, args, client) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply('❌ Only the bot **owner** can manage the whitelist.');
    }

    const sub = (args[0] || 'list').toLowerCase();

    if (sub === 'list') {
      const ids = getWhitelist();
      if (!ids.length) return message.reply('📋 Whitelist is empty.');
      const lines = ids.map((id, i) => `${i + 1}. <@${id}> (\`${id}\`)`).join('\n');
      return message.reply(`🛡️ **Whitelisted Users (${ids.length}):**\n${lines}`);
    }

    if (sub === 'add') {
      const target = message.mentions.members.first()
        || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);
      if (!target) return message.reply('❌ Mention a user or give their ID.\nExample: `!whitelist add @User`');
      if (isWhitelisted(target.id)) return message.reply(`⚠️ <@${target.id}> is already whitelisted.`);
      addWhitelist(target.id);
      return message.reply(`✅ <@${target.id}> **added to whitelist**. They can now use mod commands and bypass security rules.`);
    }

    if (sub === 'remove') {
      const target = message.mentions.members.first()
        || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);
      if (!target) return message.reply('❌ Mention a user or give their ID.\nExample: `!whitelist remove @User`');
      if (target.id === process.env.OWNER_ID) return message.reply('❌ You cannot remove the owner from the whitelist.');
      if (!isWhitelisted(target.id)) return message.reply(`⚠️ <@${target.id}> is not in the whitelist.`);
      removeWhitelist(target.id);
      return message.reply(`✅ <@${target.id}> **removed from whitelist**. Security rules now apply to them.`);
    }

    return message.reply('❌ Usage: `!whitelist list` | `!whitelist add @user` | `!whitelist remove @user`');
  }
};
