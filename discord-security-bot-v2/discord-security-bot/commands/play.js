// commands/play.js — FIXED (stays in VC, works properly)
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const yts  = require('yt-search');

const playNext = async (guildId, client, textChannel) => {
  const sq = client.musicQueues.get(guildId);
  if (!sq || sq.queue.length === 0) {
    if (sq && sq.connection) { try { sq.connection.destroy(); } catch {} }
    client.musicQueues.delete(guildId);
    if (textChannel) textChannel.send('✅ Queue finished! Left the voice channel.').catch(() => {});
    return;
  }

  const song = sq.queue[0];
  try {
    const stream = ytdl(song.url, {
      filter: 'audioonly',
      quality: 'lowestaudio',
      highWaterMark: 1 << 25,
      dlChunkSize: 0,
    });
    stream.on('error', err => {
      console.error('[STREAM ERROR]', err.message);
      sq.queue.shift();
      playNext(guildId, client, textChannel);
    });

    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: false });
    const player   = createAudioPlayer();
    sq.player      = player;
    sq.connection.subscribe(player);
    player.play(resource);

    if (textChannel) {
      textChannel.send(`🎵 **Now playing:** ${song.title}\n👤 Requested by: ${song.requestedBy}`).catch(() => {});
    }

    player.on(AudioPlayerStatus.Idle, () => { sq.queue.shift(); playNext(guildId, client, textChannel); });
    player.on('error', err => {
      console.error('[PLAYER ERROR]', err.message);
      sq.queue.shift();
      playNext(guildId, client, textChannel);
    });
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
    if (!perms.has('Connect') || !perms.has('Speak')) {
      return message.reply('❌ I need Connect and Speak permissions in that voice channel!');
    }

    const searching = await message.reply('🔍 Searching...');
    const query = args.join(' ');
    let songUrl, songTitle;

    try {
      if (ytdl.validateURL(query)) {
        const info = await ytdl.getBasicInfo(query);
        songUrl   = query;
        songTitle = info.videoDetails.title;
      } else {
        const results = await yts(query);
        if (!results.videos.length) return searching.edit('❌ No results found.');
        songUrl   = results.videos[0].url;
        songTitle = results.videos[0].title;
      }
    } catch (err) {
      console.error('[SEARCH ERROR]', err.message);
      return searching.edit('❌ Could not find that song. Try again.');
    }

    const guildId = message.guild.id;
    const song = { title: songTitle, url: songUrl, requestedBy: message.author.tag };

    // If already playing, just queue it
    if (client.musicQueues.has(guildId)) {
      const sq = client.musicQueues.get(guildId);
      sq.queue.push(song);
      return searching.edit(`✅ **Added to queue:** ${song.title} — Position #${sq.queue.length}`);
    }

    // New queue
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

      // Handle unexpected disconnects
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
