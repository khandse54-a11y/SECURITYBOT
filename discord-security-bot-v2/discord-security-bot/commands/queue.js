// commands/queue.js
module.exports = {
  name: 'queue',
  async execute(message, args, client) {
    const sq = client.musicQueues.get(message.guild.id);
    if (!sq || !sq.queue.length) return message.reply('📭 Queue is empty. Use `!play <song>` to add songs!');
    const list = sq.queue.map((song, i) =>
      `${i === 0 ? '🎵' : `${i + 1}.`} **${song.title}** — *${song.requestedBy}*`
    ).join('\n');
    message.reply(`🎶 **Queue (${sq.queue.length} songs):**\n${list}`);
  }
};
