// commands/join.js — Join VC, stay deafened and muted
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

module.exports = {
  name: 'join',
  async execute(message, args, client) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('❌ Join a voice channel first!');

    const perms = voiceChannel.permissionsFor(message.client.user);
    if (!perms.has('Connect')) return message.reply('❌ I need permission to join that channel!');

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true,
      });

      // Handle unexpected disconnects — try to reconnect
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
        }
      });

      message.reply(`✅ Joined **${voiceChannel.name}** — staying deafened & muted.`);
    } catch (err) {
      console.error('[JOIN ERROR]', err.message);
      message.reply('❌ Failed to join the voice channel.');
    }
  }
};
