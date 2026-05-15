const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const playdl = require('play-dl');

const playNext = async (guildId, client, textChannel) => {
  const sq = client.musicQueues.get(guildId);
  if (!sq || sq.queue.length === 0) {
    if (sq?.connection) try { sq.connection.destroy(); } catch {}
    client.musicQueues.delete(guildId);
    if (textChannel) textChannel.send('✅ Queue finished! Left the voice channel.').catch(() => {});
    return;
  }

  const song = sq.queue[0];

  if (sq.player) {
    sq.player.removeAllListeners();
    sq.player.stop(true);
  }

  try {
    const source = await playdl.stream(song.url, { quality: 2 });
    const resource = createAudioResource(source.stream, { inputType: source.type, inlineVolume: false });

    const player = createAudioPlayer();
    sq.player = player;
    sq.connection.subscribe(player);
    player.play(resource);

    if (textChannel) {
      textChannel.send(`🎵 **Now playing:** ${song.title}\n👤 Requested by: ${song.requestedBy}`).catch(() => {});
    }

    player.once(AudioPlayerStatus.Idle, () => { sq.queue.shift(); playNext(guildId, client, textChannel); });
    player.once('error', err => { console.error('[PLAYER ERROR]', err.message); sq.queue.shift(); playNext(guildId, client, textChannel); });

  } catch (err) {
    console.error('[PLAY ERROR]', err.message);
    sq.queue.shift();
    playNext(guildId, client, textChannel);
  }
};

module.exports = {
  name: 'play',
  playNext,
  async execute(message, args, client) {
    if (!args.length) return message.reply('❌ Usage: `!play <song name or YouTube URL>`');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('❌ Join a voice channel first!');

    const perms = voiceChannel.permissionsFor(message.client.user);
    if (!perms.has('Connect') || !perms.has('Speak'))
      return message.reply('❌ I need Connect and Speak permissions!');

    const searching = await message.reply('🔍 Searching...');
    const query = args.join(' ');
    let songUrl, songTitle;

    try {
      if (playdl.yt_validate(query) === 'video') {
        const info = await playdl.video_info(query);
        songUrl   = query;
        songTitle = info.video_details.title;
      } else {
        const results = await playdl.search(query, { source: { youtube: 'video' }, limit: 1 });
        if (!results.length) return searching.edit('❌ No results found.');
        songUrl   = results[0].url;
        songTitle = results[0].title;
      }
    } catch (err) {
      console.error('[SEARCH ERROR]', err.message);
      return searching.edit('❌ Could not find that song. Try again.');
    }

    const guildId = message.guild.id;
    const song = { title: songTitle, url: songUrl, requestedBy: message.author.tag };

    if (client.musicQueues.has(guildId)) {
      const sq = client.musicQueues.get(guildId);
      sq.queue.push(song);
      return searching.edit(`✅ **Added to queue:** ${song.title} — Position #${sq.queue.length}`);
    }

    client.musicQueues.set(guildId, { queue: [song], player: null, connection: null });
    const sq = client.musicQueues.get(guildId);

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: true,
      });
      sq.connection = connection;

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
          client.musicQueues.delete(guildId);
        }
      });

      await searching.edit(`🔊 Joining **${voiceChannel.name}**...`);
      await playNext(guildId, client, message.channel);
    } catch (err) {
      console.error('[VOICE CONNECT ERROR]', err.message);
      client.musicQueues.delete(guildId);
      searching.edit('❌ Failed to join voice channel. Check my permissions!');
    }
  }
};
