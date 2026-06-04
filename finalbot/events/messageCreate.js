const store = require('../utils/store');
const { EmbedBuilder } = require('discord.js');

const OWNER_ID = '1018124017581953074';

const BAD_WORDS = [
  // English
  'fuck','fck','fuk','fvck','phuck','frick',
  'shit','shyt',
  'bitch','btch','biatch',
  'cunt','cvnt',
  'nigger','nigga',
  'faggot',
  'asshole',
  'bastard',
  'motherfucker','mofo',
  'whore','slut','pussy',
  'retard','wanker','twat',
  'douchebag','dipshit','jackass','shithead',
  // Hindi/Urdu
  'chutiya','chutia','choot',
  'bhosda','bhosdi','bhosdike',
  'madarchod','behenchod',
  'lund','loda','laude','lavde',
  'gaandu','gandu',
  'randi','raand',
  'harami','bsdk','mkc',
  'haramzada','haramkhor',
  'jhatu','bhadwa',
  'tatti','hijra',
  'gandmasti','bkl',
  // Odia
  'pela','bokachoda','chhinali',
  'maghia','bedhachua','kukura',
  'randi pua','gandi mara',
  // Spanish
  'puta','mierda','cabron',
  // Arabic
  'sharmouta','khara',
  // French
  'putain','connard','salope',
  // German
  'hurensohn','wichser','arschloch',
  // Portuguese
  'porra','caralho','foder',
  // Russian
  'blyad','suka','pizda','mudak','pidor','cyka',
  // Turkish
  'orospu','yarrak',
  // Bengali
  'khanki','banchod',
  // Italian
  'cazzo','vaffanculo','stronzo',
  // Korean
  'sibal','gaesekki',
];

const BOT_COMMANDS = [
  'ban','kick','timeout','untimeout','unban','warn',
  'whitelist','autorole','giveaway','join'
];

const linkRegex = /(https?:\/\/|discord\.gg\/|www\.)/i;

function containsBadWord(text) {
  const lower = text.toLowerCase();
  for (const word of BAD_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regex;
    if (word.includes(' ')) {
      // Multi-word phrase: check if it appears anywhere
      regex = new RegExp(escaped, 'i');
    } else {
      // Single word: must be standalone (word boundary)
      regex = new RegExp('(^|[\\s,\\.!?;:\'"()])' + escaped + '($|[\\s,\\.!?;:\'"()])', 'i');
    }
    if (regex.test(lower)) return word;
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
    // WHITELISTED / OWNER — full access, zero restrictions
    // ═══════════════════════════════════════════════════════════
    if (isWl) {
      if (!message.content.startsWith(prefix)) return;
      const args = message.content.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();
      const command = client.commands.get(commandName);
      if (!command) return;
      try {
        await command.execute(message, args, client);
      } catch (err) {
        console.error(`[Command Error] ${commandName}:`, err);
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════
    // NON-WHITELISTED — security checks only on violations
    // ═══════════════════════════════════════════════════════════
    const member = message.member;

    // 1. @everyone / @here → INSTANT BAN
    if (message.mentions.everyone) {
      try { await message.delete(); } catch (_) {}
      try {
        await message.guild.bans.create(message.author.id, {
          reason: '🔒 Security: Used @everyone/@here without permission',
        });
        store.markBanned(message.author.id);
      } catch (_) {}
      await sendLog(message.channel, new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🚨 @everyone/@here — INSTANT BAN')
        .setDescription(`<@${message.author.id}> was instantly banned for using @everyone/@here.`)
        .setTimestamp(), 15000);
      return;
    }

    // 2. ABUSIVE LANGUAGE → 60 min timeout
    const detected = containsBadWord(message.content);
    if (detected) {
      try { await message.delete(); } catch (_) {}
      await applyTimeout(member, 60 * 60 * 1000, 'Abusive language detected');
      await sendLog(message.channel, new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🚫 Abusive Language Detected')
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
          { name: '👤 User',     value: `<@${message.author.id}>`, inline: true },
          { name: '⏱️ Timeout', value: '60 minutes',               inline: true },
          { name: '📋 Action',  value: '🔇 Timed out for **60 minutes**' },
        )
        .setFooter({ text: 'Keep the server clean and respectful!' })
        .setTimestamp()
      );
      await sendDM(message.author, new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`🚫 Timed Out — ${message.guild.name}`)
        .setDescription(`Your message was deleted for **abusive language**.\nYou are timed out for **60 minutes**.`)
        .setTimestamp()
      );
      return;
    }

    // 3. LINKS → 30 min timeout
    if (linkRegex.test(message.content)) {
      try { await message.delete(); } catch (_) {}
      await applyTimeout(member, 30 * 60 * 1000, 'Unauthorized link sharing');
      await sendLog(message.channel, new EmbedBuilder()
        .setColor(0xFF8800)
        .setTitle('🔗 Unauthorized Link Detected')
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
          { name: '👤 User',    value: `<@${message.author.id}>`, inline: true },
          { name: '⏱️ Timeout', value: '30 minutes',              inline: true },
          { name: '📋 Action', value: '🔇 Timed out for **30 minutes**' },
        )
        .setFooter({ text: 'Only whitelisted members can share links.' })
        .setTimestamp()
      );
      await sendDM(message.author, new EmbedBuilder()
        .setColor(0xFF8800)
        .setTitle(`🔗 Link Removed — ${message.guild.name}`)
        .setDescription(`You are not allowed to share links.\nYou are timed out for **30 minutes**.`)
        .setTimestamp()
      );
      return;
    }

    // 4. BOT COMMANDS → 30 min timeout (except !help and !ping)
    if (message.content.startsWith(prefix)) {
      const cmdName = message.content.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase();

      if (cmdName === 'help' || cmdName === 'ping') {
        const command = client.commands.get(cmdName);
        if (command) {
          try { await command.execute(message, [], client); } catch (_) {}
        }
        return;
      }

      if (BOT_COMMANDS.includes(cmdName)) {
        try { await message.delete(); } catch (_) {}
        await applyTimeout(member, 30 * 60 * 1000, 'Unauthorized bot command usage');
        await sendLog(message.channel, new EmbedBuilder()
          .setColor(0xFF4400)
          .setTitle('🔒 Unauthorized Command Usage')
          .setThumbnail(message.author.displayAvatarURL())
          .addFields(
            { name: '👤 User',     value: `<@${message.author.id}>`, inline: true },
            { name: '⏱️ Timeout', value: '30 minutes',               inline: true },
            { name: '🚫 Command', value: `\`${prefix}${cmdName}\``,  inline: true },
            { name: '📋 Action',  value: '🔇 Timed out for **30 minutes**' },
          )
          .setFooter({ text: 'Only whitelisted members can use bot commands.' })
          .setTimestamp()
        );
        await sendDM(message.author, new EmbedBuilder()
          .setColor(0xFF4400)
          .setTitle(`🔒 Unauthorized Command — ${message.guild.name}`)
          .setDescription(`You tried to use \`${prefix}${cmdName}\` without permission.\nYou are timed out for **30 minutes**.`)
          .setTimestamp()
        );
        return;
      }
    }

    // 5. NORMAL MESSAGE — do nothing, let them talk freely
  },
};
