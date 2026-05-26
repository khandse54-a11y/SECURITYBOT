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
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/\s+/g, '')
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
  'shit','sht','shyt','sh1t',
  'bitch','btch','b1tch','biatch',
  'cunt','cnt','cvnt',
  'nigger','nigga','nigg','niga',
  'faggot','fag','fgt',
  'asshole','ashole','azhole',
  'bastard','basterd',
  'motherfucker','mofo','mf',
  'whore','whor','hoe',
  'slut','slt',
  'dick','dck','dik',
  'cock','cok',
  'pussy','pussi',
  'retard','rtard',
  'wanker','wank',
  'twat','twt',
  'prick','prik',
  'douchebag','douche',
  'dipshit','jackass','shithead',
  // Hindi/Urdu
  'chutiya','chutia','chut','choot','terimkc','mgh','laudi'
  'madarchod','madarjat','maderchod',
  'behenchod','bhenchod',
  'bhosdike','bhosdi',
  'harami','kamina','kameena',
  'laude','lawde','lodu','lund','lavde',
  'randi','raand',
  'gaandu','gandu','gaand','gand',
  'mkc','bsdk','mc','bc',
  'haramzada','haramkhor',
  'kutte','kutta','kutti',
  'saala','sala','saali',
  'jhatu','bhadwa','dalal',
  'tatti','ullu','hijra','chakka',
  // Odia
  'pela','maabahana','machikani','chhinali','maghia','bedhachua','boka','bokachoda','choda','bia'
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
  'magi','choda','bokachoda','khanki','banchod',
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
  return BAD_WORD_ROOTS.some(word => normalized.includes(normalizeText(word)));
}

const nukeTracker = {
  channelDelete : new Map(),
  roleDelete    : new Map(),
  ban           : new Map(),
  kick          : new Map(),
  webhookCreate : new Map(),
  roleCreate    : new Map(),
  channelCreate : new Map(),
};

const NUKE_LIMITS = {
  channelDelete : { count: 2, window: 8000 },
  roleDelete    : { count: 2, window: 8000 },
  ban           : { count: 2, window: 8000 },
  kick          : { count: 2, window: 8000 },
  webhookCreate : { count: 2, window: 8000 },
  roleCreate    : { count: 3, window: 8000 },
  channelCreate : { count: 3, window: 8000 },
};

function trackNukeAction(type, userId) {
  const map  = nukeTracker[type];
  const now  = Date.now();
  const data = map.get(userId) || { count: 0, first: now };
  if (now - data.first > NUKE_LIMITS[type].window) {
    map.set(userId, { count: 1, first: now });
    return false;
  }
  data.count++;
  map.set(userId, data);
  return data.count >= NUKE_LIMITS[type].count;
}

async function nukeban(guild, executorId, reason, client) {
  try {
    await guild.members.ban(executorId, { reason: `🔒 ANTI-NUKE: ${reason}` });
    const ch = guild.channels.cache.find(
      c => c.isTextBased() && ['mod-log','security-log','bot-log','logs','general'].includes(c.name)
    );
    if (ch) ch.send(`🚨 **ANTI-NUKE!** <@${executorId}> **INSTANTLY BANNED** — ${reason}`).catch(() => {});
  } catch (err) { console.error('[NUKE BAN ERROR]', err.message); }
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

// Auto-delete notification messages after 5 seconds
async function sendAndDelete(channel, msg) {
  const sent = await channel.send(msg).catch(() => null);
  if (sent) setTimeout(() => sent.delete().catch(() => {}), 5000);
}

module.exports = {
  name: 'messageCreate',
  trackNukeAction,
  nukeban,
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;
    const member = message.member;
    if (!member) return;

    const userId = message.author.id;

    // ── COMMAND HANDLER ───────────────────────────────────────────────────
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

    // ── 1. @EVERYONE / @HERE → INSTANT BAN ───────────────────────────────
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

    // ── 2. LINK DETECTION → 30 MIN TIMEOUT ───────────────────────────────
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

    // ── 3. SPAM → 10 MIN TIMEOUT ─────────────────────────────────────────
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

    // ── 4. ABUSIVE LANGUAGE → 60 MIN TIMEOUT ─────────────────────────────
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
