const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'timeout',
  async execute(message, args, client) {
    if (!isWhitelisted(message.author.id))
      return message.reply('❌ You are not authorized.');

    const target = message.mentions.members.first()
      || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply('❌ User not found. Usage: `!timeout @user 10 reason`');
    if (isWhitelisted(target.id)) return message.reply('❌ That user is whitelisted.');

    const minutes = parseInt(args[1]) || 10;
    const reason  = args.slice(2).join(' ') || 'No reason provided';

    try {
      await target.user.send(`⏱️ You have been **timed out** in **${message.guild.name}** for **${minutes} minutes**.\n📋 Reason: ${reason}`).catch(() => {});
      await Promise.all([
        message.delete().catch(() => {}),
        target.timeout(minutes * 60 * 1000, `By ${message.author.tag}: ${reason}`),
      ]);
      await message.channel.send(`⏱️ **${target.user.tag}** timed out **${minutes} min**. Reason: ${reason}`);
    } catch (err) {
      message.channel.send(`❌ Failed: ${err.message}`);
    }
  }
};
