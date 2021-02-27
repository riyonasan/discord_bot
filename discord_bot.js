const ENV = require('dotenv').config().parsed;
const Discord = require('discord.js');
const client = new Discord.Client();
const DISCORD_TOKEN = ENV.DISCORD_TOKEN;
const { getCharactarStatistics } = require('./fflogs');

client.on('ready', () => {
    console.log(`Logged in with ${client.user.username}.`)
});

client.on('message', async (msg) => {
    const reg = /(https:\/\/ja.fflogs.com\/character\/id\/\d{8})|(https:\/\/ja.fflogs.com\/character\/[a-zA-Z]+\/[a-zA-Z]+\/[a-zA-Z]+%20[a-zA-Z]+)/;
    if (msg.content.match(reg)) {
        const logsUrl = msg.content.match(reg)[0];
        const embed = await getCharactarStatistics(logsUrl);
        msg.channel.send(embed);
        return;
    };

});

client.login(DISCORD_TOKEN);