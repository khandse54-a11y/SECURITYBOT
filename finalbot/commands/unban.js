const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'unban',
  async execute(message, args, client) {
    if (!isWhitelisted(message.author.id))
      return message.reply('❌ You are not authorized.');

    const userId = args[0]?.replace(/[<@!>]/g, '').trim();
    if (!userId || isNaN(userId))
      return message.reply('❌ Provide a valid user ID.');

    try {
      const bans   = await message.guild.bans.fetch();
      const banned = bans.get(userId);
      if (!banned) return message.reply(`❌ \`${userId}\` is not banned.`);
      await message.guild.members.unban(userId, `By ${message.author.tag}`);
      await banned.user.send(`✅ You have been **unbanned** from **${message.guild.name}**.`).catch(() => {});
      return message.reply(`✅ **${banned.user.tag}** unbanned.`);
    } catch (err) {
      return message.reply(`❌ Failed: ${err.message}`);
    }
  }
};
