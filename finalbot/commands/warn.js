const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'warn',
  async execute(message, args, client) {
    if (!isWhitelisted(message.author.id))
      return message.reply('❌ You are not authorized.');

    const target = message.mentions.members.first()
      || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply('❌ User not found. Usage: `!warn @user reason`');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await target.user.send(
        `⚠️ **You have been warned in ${message.guild.name}**\n` +
        `👮 **Warned by:** ${message.author.tag}\n` +
        `📋 **Reason:** ${reason}\n` +
        `⚠️ Further violations may result in a timeout or ban.`
      );
      await Promise.all([
        message.delete().catch(() => {}),
      ]);
      await message.channel.send(`⚠️ **${target.user.tag}** has been warned. Reason: ${reason}`);
    } catch (err) {
      message.channel.send(`❌ Could not DM user. They may have DMs disabled.`);
    }
  }
};
