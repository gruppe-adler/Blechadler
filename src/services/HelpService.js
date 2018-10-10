const config = require('../../config/config.json');
const helpTexts = require('../../config/helpTexts.json');
const Discord = require('discord.js');
const Utils = require('./Utils');


module.exports = class HelpService {

    constructor (client) {
        this.discordClient = client;
    }

    sendCommandOverview(message) {  
        let commands = [];
        for (const command in helpTexts) {
            if (helpTexts.hasOwnProperty(command)) {
                const element = helpTexts[command];
                commands.push(`${element.title}: \`help ${command}\``);
            }
        }

        message.channel.send(`${message.author} Ich kann vieles.`, {
            "embed": {
              "color": 13733151,
              "author": {
                "name": this.discordClient.username,
                "icon_url": this.discordClient.avatarURL
              },
              "fields": [{
                  "name": "Ich kann...",
                  "value": commands.join('\n')
              }]
            }
        });
    }


    sendCommand(message, command) {
        if (! helpTexts.hasOwnProperty(command)) {
            message.channel.send(`${message.author} ich habe das Command _${command}_ leider nicht gefunden. \n Eine Übersicht aller Commands findeset du mit \`help\``)
            return;
        }

        let obj = helpTexts[command];

        let fields = [];

        fields.push({
            "name": "Beschreibung:",
            "value": `${obj.description}`
        });

        if (obj.hasOwnProperty("format")) {
            fields.push({
                "name": "Syntax:",
                "value": `\`${obj.format}\``
            });
        }

        if (obj.hasOwnProperty("examples")) {
            fields.push({
                "name": "Beispiele:",
                "value": `\`${obj.examples.join('`\n`')}\``
            });
            for (let i = 0; i < obj.examples.length; i++) {
                const example = obj.examples[i];
            }
        }

        message.channel.send(`${message.author}`, {
            "embed": {
                "title": `**__${command}:__**`,
                "color": 13733151,
                "author": {
                    "name": this.discordClient.username,
                    "icon_url": this.discordClient.avatarURL
                },
                "fields": fields
            }
        });
    }

}