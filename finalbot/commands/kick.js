const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'kick',
  async execute(message, args, client) {
    if (!isWhitelisted(message.author.id))
      return message.reply('❌ You are not authorized.');

    const target = message.mentions.members.first()
      || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply('❌ User not found.');
    if (isWhitelisted(target.id)) return message.reply('❌ That user is whitelisted.');

    const reason = args.slice(1).join(' ') || 'No reason provided';
    try {
      await target.user.send(`🚨 You have been **kicked** from **${message.guild.name}**.\n📋 Reason: ${reason}`).catch(() => {});
      await Promise.all([
        message.delete().catch(() => {}),
        target.kick(`By ${message.author.tag}: ${reason}`),
      ]);
      await message.channel.send(`✅ **${target.user.tag}** kicked. Reason: ${reason}`);
    } catch (err) {
      message.channel.send(`❌ Failed: ${err.message}`);
    }
  }
};
