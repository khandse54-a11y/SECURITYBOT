const store = require('../utils/store');
const { EmbedBuilder } = require('discord.js');

const OWNER_ID = '1018124017581953074';

const BAD_WORDS = [
  'fuck','fck','fuk','fvck','phuck','frick',
  'shit','sht','shyt',
  'bitch','btch','biatch',
  'cunt','cvnt',
  'nigger','nigga','nigg','niga',
  'faggot','fagt',
  'asshole','ashole','azhole',
  'bastard','basterd',
  'motherfucker','mofo',
  'whore','whor',
  'slut','slt',
  'dick','dck','dik',
  'cock','cok',
  'pussy','pussi',
  'retard','rtard',
  'wanker','wank',
  'twat','prick','prik',
  'douchebag','douche',
  'dipshit','jackass','shithead',
  'chut','choot','chutiya','chutia',
  'bhosda','bhosdi','bhosdike','bhosdika',
  'lund','loda','laude','lawde','lodu','lavde',
  'gaand','gand','gaandu','gandu',
  'randi','raand','rand',
  'madarchod','madarjat','maderchod',
  'behenchod','bhenchod',
  'terimakichut','terimaki','makichut',
  'harami','kamina','kameena',
  'laudi','terimkc','mkc','bsdk',
  'haramzada','haramkhor',
  'kutte','kutta','kutti',
  'saala','saali','jhatu','bhadwa','dalal',
  'tatti','hijra','chakka','bur','buur',
  'gandmasti','gandfad','bkl','behenkeland',
  'jhatte','jhat',
  'pela','maabahana','machikani','chhinali','maghia','bedhachua','bokachoda','bia',
  'puta','puto','mierda','cabron','cono',
  'joder','pendejo','chingada','verga',
  'culero','maricon','pinche','gilipollas',
  'kuss','kos','sharmouta','khara','kalb',
  'hmar','zebi','ayre','khawal','manyak',
  'merde','putain','connard','salope','encule',
  'batard','fdp','ntm','bordel','nique',
  'scheisse','fick','hurensohn','wichser',
  'arschloch','schlampe','vollidiot',
  'porra','caralho','merda','foder','cuzao',
  'viado','buceta','arrombado','babaca',
  'blyad','blyat','suka','pizda','khuy',
  'ebat','mudak','pidor','zalupa','cyka',
  'nahuy','pizdec','gandon','shlyukha',
  'sik','orospu','got','amk','bok','pic',
  'ibne','yarrak','kahpe',
  'magi','khanki','banchod',
  'cazzo','vaffanculo','minchia','stronzo',
  'puttana','coglione','fanculo',
  'kichiku','kisama','temee','kuso','manuke',
  'sibal','ssibal','gaesekki','byeonshin','jiral',
];

const BOT_COMMANDS = [
  'ban','kick','timeout','untimeout','unban','warn',
  'whitelist','autorole','giveaway','help','ping','join'
];

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[`*_~|]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/8/g, 'b')
    .replace(/@/g, 'a').replace(/\$/g, 's').replace(/\+/g, 't')
    .replace(/[^a-z]/g, '');
}

function containsBadWord(text) {
  const normalized = normalize(text);
  for (const word of BAD_WORDS) {
    if (normalized.includes(normalize(word))) return word;
  }
  return null;
}

async function applyTimeout(member, ms, reason) {
  try {
    if (member && member.moderatable) {
      await member.timeout(ms, reason);
      return true;
    }
  } catch (err) {
    console.error('[TIMEOUT ERROR]', err.message);
  }
  return false;
}

async function sendDM(user, embed) {
  try { await user.send({ embeds: [embed] }); } catch (_) {}
}

async function sendLog(channel, embed, autodelete = 10000) {
  try {
    const msg = await channel.send({ embeds: [embed] });
    if (autodelete) setTimeout(() => msg.delete().catch(() => {}), autodelete);
  } catch (_) {}
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const prefix = client.prefix || '!';
    const isOwner = message.author.id === OWNER_ID || message.author.id === message.guild.ownerId;
    const isWl = store.isWhitelisted(message.author.id) || isOwner;

    // ═══════════════════════════════════════════════════════════
    // NON-WHITELISTED USERS — FULL SECURITY
    // ═══════════════════════════════════════════════════════════
    if (!isWl) {
      const member = message.member;

      // ── 1. BAD WORD FILTER → 60 min timeout ──────────────────
      const detected = containsBadWord(message.content);
      if (detected) {
        try { await message.delete(); } catch (_) {}

        const ms = 60 * 60 * 1000; // 60 minutes
        await applyTimeout(member, ms, 'Abusive language detected');

        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🚫 Abusive Language Detected')
          .setThumbnail(message.author.displayAvatarURL())
          .addFields(
            { name: '👤 User',     value: `<@${message.author.id}>`, inline: true },
            { name: '⏱️ Timeout', value: '60 minutes',               inline: true },
            { name: '📋 Action',  value: '🔇 Timed out for **60 minutes**' },
          )
          .setFooter({ text: 'Keep the server clean and respectful!' })
          .setTimestamp();

        await sendLog(message.channel, embed);

        await sendDM(message.author, new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(`🚫 You have been Timed Out — ${message.guild.name}`)
          .setDescription(`Your message was deleted for containing **abusive language**.\n\nYou have been timed out for **60 minutes**.`)
          .setTimestamp()
        );

        return;
      }

      // ── 2. BOT COMMAND USAGE BY NON-WHITELISTED → 30 min timeout ─
      if (message.content.startsWith(prefix)) {
        const cmdName = message.content.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase();
        if (BOT_COMMANDS.includes(cmdName) && cmdName !== 'help' && cmdName !== 'ping') {
          try { await message.delete(); } catch (_) {}

          const ms = 30 * 60 * 1000; // 30 minutes
          await applyTimeout(member, ms, 'Unauthorized bot command usage');

          const embed = new EmbedBuilder()
            .setColor(0xFF4400)
            .setTitle('🔒 Unauthorized Command Usage')
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
              { name: '👤 User',      value: `<@${message.author.id}>`, inline: true },
              { name: '⏱️ Timeout',  value: '30 minutes',               inline: true },
              { name: '🚫 Command',  value: `\`${prefix}${cmdName}\``,  inline: true },
              { name: '📋 Action',   value: '🔇 Timed out for **30 minutes** for using bot commands without permission.' },
            )
            .setFooter({ text: 'Only whitelisted members can use bot commands.' })
            .setTimestamp();

          await sendLog(message.channel, embed);

          await sendDM(message.author, new EmbedBuilder()
            .setColor(0xFF4400)
            .setTitle(`🔒 Unauthorized Command — ${message.guild.name}`)
            .setDescription(`You tried to use \`${prefix}${cmdName}\` without being whitelisted.\n\nYou have been timed out for **30 minutes**.`)
            .setTimestamp()
          );

          return;
        }
      }

      // ── 3. LINKS → 30 min timeout ────────────────────────────
      const linkRegex = /(https?:\/\/|discord\.gg\/|www\.)/i;
      if (linkRegex.test(message.content)) {
        try { await message.delete(); } catch (_) {}

        const ms = 30 * 60 * 1000;
        await applyTimeout(member, ms, 'Unauthorized link sharing');

        const embed = new EmbedBuilder()
          .setColor(0xFF8800)
          .setTitle('🔗 Unauthorized Link Detected')
          .setThumbnail(message.author.displayAvatarURL())
          .addFields(
            { name: '👤 User',    value: `<@${message.author.id}>`, inline: true },
            { name: '⏱️ Timeout', value: '30 minutes',              inline: true },
            { name: '📋 Action', value: '🔇 Timed out for **30 minutes** for sharing links.' },
          )
          .setFooter({ text: 'Only whitelisted members can share links.' })
          .setTimestamp();

        await sendLog(message.channel, embed);

        await sendDM(message.author, new EmbedBuilder()
          .setColor(0xFF8800)
          .setTitle(`🔗 Link Removed — ${message.guild.name}`)
          .setDescription(`You are not allowed to share links.\n\nYou have been timed out for **30 minutes**.`)
          .setTimestamp()
        );

        return;
      }

      // ── 4. @everyone / @here → instant ban ───────────────────
      if (message.mentions.everyone) {
        try { await message.delete(); } catch (_) {}

        try {
          await message.guild.bans.create(message.author.id, {
            reason: '🔒 Security: Non-whitelisted user used @everyone/@here',
          });
          store.markBanned(message.author.id);
        } catch (_) {}

        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🚨 @everyone/@here — INSTANT BAN')
          .setDescription(`<@${message.author.id}> was instantly banned for using @everyone/@here without permission.`)
          .setTimestamp();

        await sendLog(message.channel, embed, 15000);
        return;
      }

      // Allow !help and !ping for everyone
      if (message.content.startsWith(prefix)) {
        const cmdName = message.content.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase();
        if (cmdName === 'help' || cmdName === 'ping') {
          const command = client.commands.get(cmdName);
          if (command) {
            try { await command.execute(message, message.content.slice(prefix.length).trim().split(/\s+/).slice(1), client); } catch (_) {}
          }
        }
      }

      return; // Block everything else for non-whitelisted
    }

    // ═══════════════════════════════════════════════════════════
    // WHITELISTED USERS & OWNER — FULL ACCESS
    // ═══════════════════════════════════════════════════════════
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
    } catch (err) {
      console.error(`[Command Error] ${commandName}:`, err);
      message.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setTitle('❌ Error').setDescription('An error occurred.').setTimestamp()] });
    }
  },
};
