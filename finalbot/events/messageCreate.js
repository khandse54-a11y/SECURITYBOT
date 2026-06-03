const store = require('../utils/store');
const { errorEmbed, warnEmbed } = require('../utils/embeds');
const { EmbedBuilder } = require('discord.js');

// ─── Bad Words List ────────────────────────────────────────────────────────────
const BAD_WORDS = [
  // English
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
  'twat',
  'prick','prik',
  'douchebag','douche',
  'dipshit','jackass','shithead',
  // Hindi/Urdu
  'chut','choot','chutiya','chutia',
  'bhosda','bhosdi','bhosdike','bhosdika',
  'lund','loda','laude','lawde','lodu','lavde',
  'gaand','gand','gaandu','gandu',
  'randi','raand','rand',
  'madarchod','madarjat','maderchod',
  'behenchod','bhenchod',
  'terimakichut','terimaki','makichut',
  'harami','kamina','kameena',
  'laudi','terimkc',
  'mkc','bsdk',
  'haramzada','haramkhor',
  'kutte','kutta','kutti',
  'saala','saali',
  'jhatu','bhadwa','dalal',
  'tatti','hijra','chakka',
  'bur','buur',
  'gandmasti','gandfad','bkl',
  'behenkeland',
  'jhatte','jhat',
  // Odia
  'pela','maabahana','machikani','chhinali','maghia','bedhachua','bokachoda','bia',
  // Spanish
  'puta','puto','mierda','cabron','cono',
  'joder','pendejo','chingada','verga',
  'culero','maricon','pinche','gilipollas',
  // Arabic
  'kuss','kos','sharmouta','khara','kalb',
  'hmar','zebi','ayre','khawal','manyak',
  // French
  'merde','putain','connard','salope','encule',
  'batard','fdp','ntm','bordel','nique',
  // German
  'scheisse','fick','hurensohn','wichser',
  'arschloch','schlampe','vollidiot',
  // Portuguese
  'porra','caralho','merda','foder','cuzao',
  'viado','buceta','arrombado','babaca',
  // Russian
  'blyad','blyat','suka','pizda','khuy',
  'ebat','mudak','pidor','zalupa','cyka',
  'nahuy','pizdec','gandon','shlyukha',
  // Turkish
  'sik','orospu','got','amk','bok','pic',
  'ibne','yarrak','kahpe',
  // Bengali
  'magi','khanki','banchod',
  // Italian
  'cazzo','vaffanculo','minchia','stronzo',
  'puttana','coglione','fanculo',
  // Japanese
  'kichiku','kisama','temee','kuso','manuke',
  // Korean
  'sibal','ssibal','gaesekki','byeonshin','jiral',
];

// Timeout duration for bad word usage: 5 minutes
const TIMEOUT_DURATION = 5 * 60 * 1000;

// Track warnings per user per guild: Map of `guildId-userId` -> count
const warnCount = new Map();

// Normalize message: lowercase, remove spaces/special chars/leetspeak
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[`*_~|]/g, '')          // remove markdown chars
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/\+/g, 't')
    .replace(/[^a-z]/g, '');          // strip everything non-alpha
}

function containsBadWord(text) {
  const normalized = normalize(text);
  for (const word of BAD_WORDS) {
    if (normalized.includes(normalize(word))) return word;
  }
  return null;
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const prefix = client.prefix;
    const isWl = store.isWhitelisted(message.author.id) || message.author.id === message.guild.ownerId;

    // ── Bad Word Filter (applies to EVERYONE including whitelisted) ──────────
    const detected = containsBadWord(message.content);
    if (detected) {
      // Delete the message
      try { await message.delete(); } catch (_) {}

      const key = `${message.guild.id}-${message.author.id}`;
      const count = (warnCount.get(key) || 0) + 1;
      warnCount.set(key, count);

      const member = message.member;

      // Build warning embed
      const warnEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('🚫 Inappropriate Language Detected')
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `<@${message.author.id}>`, inline: true },
          { name: '⚠️ Warning #', value: `${count}`, inline: true },
          { name: '⏱️ Timeout', value: '5 minutes', inline: true },
          { name: '📋 Action', value: count >= 3
            ? '🔨 **Kicked** (3rd offence)'
            : '🔇 **Timed out** for 5 minutes',
          },
        )
        .setFooter({ text: 'Keep the server clean and respectful!' })
        .setTimestamp();

      // Send warning to channel
      const warn = await message.channel.send({ embeds: [warnEmbed] });
      setTimeout(() => warn.delete().catch(() => {}), 8000); // auto-delete warning after 8s

      // DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle(`⚠️ Warning from ${message.guild.name}`)
          .setDescription(`Your message was deleted for containing inappropriate language.\n\n**Warning #${count}**\nYou have been timed out for **5 minutes**.\n\nRepeated offences will result in a **kick** from the server.`)
          .setTimestamp();
        await message.author.send({ embeds: [dmEmbed] });
      } catch (_) {}

      // Apply timeout (skip for whitelisted but still warn)
      if (!isWl && member?.moderatable) {
        try {
          await member.timeout(TIMEOUT_DURATION, `Bad language detected (warning #${count})`);
        } catch (_) {}
      }

      // Kick on 3rd offence
      if (!isWl && count >= 3 && member?.kickable) {
        try {
          await member.kick('Repeated use of inappropriate language (3 warnings)');
          warnCount.delete(key); // reset after kick
        } catch (_) {}
      }

      return; // Don't process commands if bad word found
    }

    // ── Command Handler ───────────────────────────────────────────────────────
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    // Public commands anyone can use
    const publicCommands = ['help', 'ping'];
    if (!publicCommands.includes(commandName) && !isWl) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('❌ Access Denied')
          .setDescription('🔒 You are **not whitelisted**.\nOnly whitelisted members can use bot commands.')
          .setTimestamp()
        ],
      });
    }

    try {
      await command.execute(message, args);
    } catch (err) {
      console.error(`[Command Error] ${commandName}:`, err);
      message.reply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setTitle('❌ Error').setDescription('An error occurred while running this command.').setTimestamp()] });
    }
  },
};
