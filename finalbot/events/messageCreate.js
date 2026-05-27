const { isWhitelisted } = require('../utils/whitelist');

const spamMap = new Map();
const SPAM_LIMIT       = 5;
const SPAM_WINDOW_MS   = 5000;
const SPAM_TIMEOUT_MS  = 10 * 60 * 1000;
const ABUSE_TIMEOUT_MS = 60 * 60 * 1000;
const LINK_TIMEOUT_MS  = 30 * 60 * 1000;

const LINK_REGEX = /https?:\/\/[^\s]+|discord\.gg\/[^\s]+|www\.[^\s]+\.[a-z]{2,}/gi;

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/\+/g, 't');
}

const BAD_WORD_ROOTS = [
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
  // Hindi/Urdu — root words (covers ALL phrase combinations)
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

function containsAbuse(text) {
  const normalized = normalizeText(text);
  const found = BAD_WORD_ROOTS.find(word => normalized.includes(normalizeText(word)));
  if (found) console.log(`[ABUSE DETECTED] word: "${found}"`);
  return !!found;
}

async function dmUser(user, reason, duration) {
  try {
    await user.send(
      `🚨 **You have been actioned in the server.**\n` +
      `📋 **Reason:** ${reason}\n` +
      `⏱️ **Duration:** ${duration}\n` +
      `🛡️ Please follow the server rules.`
    );
  } catch {}
}

async function logAction(guild, msg) {
  const ch = guild.channels.cache.find(
    c => c.isTextBased() && ['mod-log','security-log','bot-log','logs'].includes(c.name)
  );
  if (ch) ch.send(`[🛡️ Security] ${msg}`).catch(() => {});
}

async function sendAndDelete(channel, msg) {
  const sent = await channel.send(msg).catch(() => null);
  if (sent) setTimeout(() => sent.delete().catch(() => {}), 5000);
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;
    const member = message.member;
    if (!member) return;

    const userId = message.author.id;

    const prefix = process.env.PREFIX || '!';
    if (message.content.startsWith(prefix)) {
      const args        = message.content.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();
      const command     = client.commands.get(commandName);
      if (command) {
        try { await command.execute(message, args, client); }
        catch (err) { console.error(`[CMD ERROR] ${commandName}:`, err.message); }
      }
      return;
    }

    if (message.mentions.everyone) {
      if (isWhitelisted(userId)) return;
      await Promise.all([
        message.delete().catch(() => {}),
        member.ban({ deleteMessageSeconds: 0, reason: '🔒 Anti-Nuke: @everyone/@here ping' })
          .catch(err => console.error('[EVERYONE BAN]', err.message)),
      ]);
      await dmUser(message.author, 'Pinging @everyone/@here without authorization', 'Permanent Ban');
      await logAction(message.guild, `🚫 **BANNED** <@${userId}> — @everyone ping in <#${message.channel.id}>`);
      return;
    }

    if (isWhitelisted(userId)) return;

    if (LINK_REGEX.test(message.content)) {
      LINK_REGEX.lastIndex = 0;
      try {
        await Promise.all([
          message.delete().catch(() => {}),
          member.timeout(LINK_TIMEOUT_MS, '🔒 Unauthorized link'),
        ]);
        await dmUser(message.author, 'Sending unauthorized links', '30 Minutes Timeout');
        await sendAndDelete(message.channel, `🔗 <@${userId}> timed out **30 minutes** for sending a link.`);
        await logAction(message.guild, `🔗 **TIMEOUT 30min** <@${userId}> — link in <#${message.channel.id}>`);
      } catch (err) { console.error('[LINK TIMEOUT]', err.message); }
      return;
    }

    const now  = Date.now();
    const data = spamMap.get(userId) || { count: 0, first: now };
    if (now - data.first > SPAM_WINDOW_MS) {
      spamMap.set(userId, { count: 1, first: now });
    } else {
      data.count++;
      spamMap.set(userId, data);
      if (data.count >= SPAM_LIMIT) {
        spamMap.delete(userId);
        try {
          await Promise.all([
            message.delete().catch(() => {}),
            member.timeout(SPAM_TIMEOUT_MS, '🔒 Anti-Spam'),
          ]);
          await dmUser(message.author, 'Spamming messages', '10 Minutes Timeout');
          await sendAndDelete(message.channel, `⏱️ <@${userId}> timed out **10 minutes** for spamming.`);
          await logAction(message.guild, `⏱️ **TIMEOUT 10min** <@${userId}> — spam in <#${message.channel.id}>`);
        } catch (err) { console.error('[SPAM TIMEOUT]', err.message); }
        return;
      }
    }

    if (containsAbuse(message.content)) {
      try {
        await Promise.all([
          message.delete().catch(() => {}),
          member.timeout(ABUSE_TIMEOUT_MS, '🔒 Abusive language'),
        ]);
        await dmUser(message.author, 'Using abusive/offensive language', '60 Minutes Timeout');
        await sendAndDelete(message.channel, `🤐 <@${userId}> timed out **60 minutes** for abusive language.`);
        await logAction(message.guild, `🤐 **TIMEOUT 60min** <@${userId}> — abuse in <#${message.channel.id}>`);
      } catch (err) { console.error('[ABUSE TIMEOUT]', err.message); }
    }
  }
};
