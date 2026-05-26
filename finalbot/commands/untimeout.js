const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'untimeout',
  async execute(message, args, client) {
    if (!isWhitelisted(message.author.id))
      return message.reply('❌ You are not authorized.');

    const target = message.mentions.members.first()
      || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply('❌ User not found. Usage: `!untimeout @user`');

    try {
      await Promise.all([
        message.delete().catch(() => {}),
        target.timeout(null),
      ]);
      await target.user.send(`✅ Your timeout has been removed in **${message.guild.name}**.`).catch(() => {});
      await message.channel.send(`✅ **${target.user.tag}** timeout removed.`);
    } catch (err) {
      message.channel.send(`❌ Failed: ${err.message}`);
    }
  }
};
