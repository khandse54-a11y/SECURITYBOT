// utils/embeds.js — Reusable embed builders

const { EmbedBuilder } = require('discord.js');

function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x00FF7F)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xFF4444)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function warnEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xFFAA00)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

module.exports = { successEmbed, errorEmbed, warnEmbed, infoEmbed };
