// commands/resume.js
module.exports = {
  name: 'resume',
  async execute(message, args, client) {
    const sq = client.musicQueues.get(message.guild.id);
    if (!sq || !sq.player) return message.reply('❌ Nothing is paused.');
    sq.player.unpause();
    message.reply('▶️ Resumed!');
  }
};
