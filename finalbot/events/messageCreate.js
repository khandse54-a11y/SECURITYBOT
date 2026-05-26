const { isWhitelisted } = require('../utils/whitelist');

const spamMap = new Map();
const SPAM_LIMIT       = 5;
const SPAM_WINDOW_MS   = 5000;
const SPAM_TIMEOUT_MS  = 10 * 60 * 1000;
const ABUSE_TIMEOUT_MS = 60 * 60 * 1000;
const LINK_TIMEOUT_MS  = 30 * 60 * 1000;

// ── LINK DETECTION ────────────────────────────────────────────────────────────
const LINK_REGEX = /https?:\/\/[^\s]+|discord\.gg\/[^\s]+|www\.[^\s]+\.[a-z]{2,}/gi;

// ── ADVANCED ABUSE DETECTION ──────────────────────────────────────────────────
// Normalize text: remove spaces, leet speak, unicode tricks, zalgo, repeated chars
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove accents
    .replace(/[^a-z0-9\s]/g, '')       // remove special chars
    .replace(/(.)\1{2,}/g, '$1')       // remove repeated chars (fuuuck → fuk)
    .replace(/\s+/g, '')               // remove spaces
    // leet speak replacements
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

// Core bad word roots — normalized forms (no need to list every variation)
const BAD_WORD_ROOTS = [
  // ── English ──
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
  'pussy','pussy','pussi',
  'retard','rtard',
  'wanker','wank',
  'twat','twt',
  'prick','prik',
  'douchebag','douche',
  'dipshit','dips',
  'jackass','jckass',
  'shithead','shthead',

  // ── Hindi / Urdu ──
  'chutiya','chutia','chut','choot',
  'madarchod','madarjat','maderchod','maarachod',
  'behenchod','bhenchod','bhnchd',
  'bhosdike','bhosdi','bhosd',
  'harami','hrami',
  'kamina','kameena',
  'laude','lawde','lodu','lund','lavde',
  'randi','raand',
  'gaandu','gandu','gaand','gand',
  'mkc','mkg','bsdk','mc','bc',
  'haramzada','haramkhor',
  'kutte','kutta','kutti',
  'saala','sala','saali',
  'jhatu','jhaatu',
  'bhadwa','dalal',
  'tatti','tattu',
  'ullu','bakwaas',
  'hijra','chakka',

  // ── Odia ──
  'pela','peluchi','peliba',
  'maabahana','bahana',
  'machikani','machike',
  'chhinali',
  'bhau','thulimaa',
  'kukura','gadha',

  // ── Spanish ──
  'puta','puto',
  'mierda',
  'cabron','cabrona',
  'cono','coño',
  'joder',
  'pendejo','pendeja',
  'chingada','chinga','chingo',
  'verga',
  'culero','culona',
  'maricon','marica',
  'pinche',
  'putamadre',
  'hijodeputa','hdp',
  'gilipollas',
  'imbecil',
  'carajo',
  'mamada',
  'culiao',

  // ── Arabic ──
  'kuss','kos','kus',
  'sharmouta','sharmuta',
  'khara','khare',
  'kalb','kelb',
  'hmar','himar',
  'zebi','zbi',
  'ayre','aire',
  'khawal',
  'manyak',
  'qahba','kahba',

  // ── French ──
  'merde',
  'putain',
  'connard','connasse',
  'salope',
  'encule','enculé',
  'batard','bâtard',
  'fdp','ntm','tg',
  'bordel',
  'couille',
  'nique','niquer',

  // ── German ──
  'scheiße','scheisse','scheiss',
  'fick','ficken',
  'hurensohn','hure',
  'wichser','wichse',
  'arschloch','arsch',
  'schlampe',
  'blödmann','bloedmann',
  'vollidiot',
  'mistkerl',

  // ── Portuguese ──
  'porra',
  'caralho',
  'merda',
  'foder','fodase',
  'cuzao','cuzão',
  'viado',
  'buceta',
  'fdp','fdputa',
  'arrombado',
  'babaca',

  // ── Russian (romanized) ──
  'blyad','blyat',
  'suka','suka',
  'pizda','pizde',
  'khuy','huy',
  'ebat','ebal','ebu',
  'mudak',
  'pidor','pidor',
  'zalupa',
  'cyka',
  'nahuy','nahui',
  'pizdec',
  'gandon',
  'shlyukha',

  // ── Turkish ──
  'sik','sikerim',
  'orospu','orospucocugu',
  'got','götü',
  'amk','amina',
  'bok',
  'pic','piç',
  'ibne',
  'yarrak',
  'kahpe',

  // ── Bengali ──
  'magi','maagi',
  'choda','chode',
  'bokachoda','boka',
  'khanki',
  'banchod','baanchod',
  'shuorer',

  // ── Italian ──
  'cazzo','cazz',
  'vaffanculo','vaffan',
  'minchia',
  'stronzo','stronza',
  'puttana',
  'figliodiputtana',
  'coglione',
  'fanculo',

  // ── Japanese (romaji) ──
  'kichiku','kisama','temee','kuso','yarō','manuke',

  // ── Korean (romaji) ──
  'sibal','ssibal','gaesekki','byeonshin','jiral','jotat','ssangnyom',
];

// Check if message contains abuse using normalized comparison
function containsAbuse(text) {
  const normalized = normalizeText(text);
  return BAD_WORD_ROOTS.some(word => {
    const normWord = normalizeText(word);
    return normalized.includes(normWord);
  });
}

// ── ANTI-NUKE TRACKER ─────────────────────────────────────────────────────────
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
  channelDelete : { count: 2, window: 8000  },
  roleDelete    : { count: 2, window: 8000  },
  ban           : { count: 2, window: 8000  },
  kick          : { count: 2, window: 8000  },
  webhookCreate : { count: 2, window: 8000  },
  roleCreate    : { count: 3, window: 8000  },
  channelCreate : { count: 3, window: 8000  },
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
    if (ch) ch.send(`🚨 **ANTI-NUKE TRIGGERED!**\n🚫 <@${executorId}> was **INSTANTLY BANNED**\n📋 Reason: ${reason}`).catch(() => {});
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
        await dmUser(message.author, 'Sending unauthorized links in the server', '30 Minutes Timeout');
        await message.channel.send(`🔗 <@${userId}> timed out **30 minutes** for sending a link.`).catch(() => {});
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
          await message.channel.send(`⏱️ <@${userId}> timed out **10 minutes** for spamming.`).catch(() => {});
          await logAction(message.guild, `⏱️ **TIMEOUT 10min** <@${userId}> — spam in <#${message.channel.id}>`);
        } catch (err) { console.error('[SPAM TIMEOUT]', err.message); }
        return;
      }
    }

    // ── 4. ADVANCED ABUSE DETECTION → 60 MIN TIMEOUT ─────────────────────
    if (containsAbuse(message.content)) {
      try {
        await Promise.all([
          message.delete().catch(() => {}),
          member.timeout(ABUSE_TIMEOUT_MS, '🔒 Abusive language'),
        ]);
        await dmUser(message.author, 'Using abusive/offensive language', '60 Minutes Timeout');
        await message.channel.send(`🤐 <@${userId}> timed out **60 minutes** for abusive language.`).catch(() => {});
        await logAction(message.guild, `🤐 **TIMEOUT 60min** <@${userId}> — abuse in <#${message.channel.id}>`);
      } catch (err) { console.error('[ABUSE TIMEOUT]', err.message); }
    }
  }
};
