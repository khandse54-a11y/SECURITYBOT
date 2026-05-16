const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'unban',
  async execute(message, args, client) {
    if (!isWhitelisted(message.author.id)) {
      return message.reply('❌ You are not authorized to use this command.');
    }

    const userId = args[0]?.replace(/[<@!>]/g, '').trim();
    if (!userId || isNaN(userId)) {
      return message.reply('❌ Provide a valid user ID.\nExample: `!unban 123456789012345678`');
    }

    try {
      const bans = await message.guild.bans.fetch();
      const banned = bans.get(userId);
      if (!banned) return message.reply(`❌ User \`${userId}\` is not banned in this server.`);

      await message.guild.members.unban(userId, `Unbanned by ${message.author.tag}`);
      return message.reply(`✅ **${banned.user.tag}** (\`${userId}\`) has been unbanned.`);
    } catch (err) {
      console.error('[UNBAN ERROR]', err.message);
      return message.reply(`❌ Failed to unban: ${err.message}`);
    }
  }
};
