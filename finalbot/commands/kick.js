const { isWhitelisted } = require('../utils/whitelist');

module.exports = {
  name: 'kick',
  async execute(message, args, client) {
    if (!isWhitelisted(message.author.id)) {
      return message.reply('❌ You are not authorized to use this command.');
    }

    const target = message.mentions.members.first()
      || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply('❌ Please mention a user or provide their ID.');
    if (isWhitelisted(target.id)) return message.reply('❌ That user is whitelisted and cannot be kicked.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await Promise.all([
        message.delete().catch(() => {}),
        target.kick(`Kicked by ${message.author.tag}: ${reason}`),
      ]);
      await message.channel.send(`✅ **${target.user.tag}** has been kicked. Reason: ${reason}`);
    } catch (err) {
      console.error('[KICK ERROR]', err.message);
      message.channel.send(`❌ Failed to kick: ${err.message}`);
    }
  }
};
