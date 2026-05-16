const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'timeout',
  async execute(message, args, client) {
    if (!isWhitelisted(message.author.id)) {
      return message.reply('❌ You are not authorized to use this command.');
    }

    const target = message.mentions.members.first()
      || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply('❌ Please mention a user or provide their ID.\nExample: `!timeout @user 10 reason`');
    if (isWhitelisted(target.id)) return message.reply('❌ That user is whitelisted and cannot be timed out.');

    const minutes = parseInt(args[1]) || 10;
    const reason  = args.slice(2).join(' ') || 'No reason provided';
    const ms      = minutes * 60 * 1000;

    try {
      await Promise.all([
        message.delete().catch(() => {}),
        target.timeout(ms, `Timed out by ${message.author.tag}: ${reason}`),
      ]);
      await message.channel.send(`⏱️ **${target.user.tag}** has been timed out for **${minutes} minutes**. Reason: ${reason}`);
    } catch (err) {
      console.error('[TIMEOUT ERROR]', err.message);
      message.channel.send(`❌ Failed to timeout: ${err.message}`);
    }
  }
};
