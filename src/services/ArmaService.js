const Gamedig = require('gamedig');
const config = require('../../config/config.json');
const auth = require('../../config/auth.json');
const Discord = require('discord.js');
const Utils = require('./Utils');


module.exports = class TeamspeakService {

    constructor (client) {
        this.discordClient = client;

        this.findTargetChannel();
    }


/*
    function queryArmaServerStatus(port = 2302, cb) {
        config.armaServer.type = 'arma3';
        config.armaServer.port = port;
        Gamedig.query(config.armaServer).then(state => cb(null, state)).catch(error => cb(error));
    }
    
    function sendArmaServerStatus(message) {
        if (latestServerState) {
            let tmpMessage = '';
            tmpMessage = `**Server:** ${latestServerState.name}\n`;
            tmpMessage += `**Karte:** ${latestServerState.map} | **Mission:** ${latestServerState.raw.game} | **Spieler:** ${latestServerState.players.length}/${latestServerState.maxplayers}\n`;
            latestServerState.players.forEach(player => {
                tmpMessage += `\t- ${player.name}\n`;
            });
    
            message.channel.send(tmpMessage);
        } else {
            message.channel.send(`Server arma.gruppe-adler.de:2302 ist offline.`);
        }
    }
    
    function monitorArmaServerStatus() {
        function recurse() {
            queryArmaServerStatus(2302, (error, status) => {
                setTimeout(recurse, 10000);
    
                if (error) {
                    if(!serverDown) {
                        latestServerState = null;
                        broadcastArmaMessage(`Server ${config.armaServer.host}:2302 ist offline.`);
                        serverDown = true;
                        playersOnServer = [];
                    }
                    console.log(error);
                    return;
                }
                latestServerState = status;
    
                if (serverDown) {
                    serverDown = false;
                    broadcastArmaMessage(`Server ${config.armaServer.host}:2302 ist online.`);
                }
                const playerNames = status.players.map(player => {
                    return player.name;
                });
                playerNames.forEach(name => {
                    if (playersOnServer.indexOf(name) === -1) {
                        playersOnServer.push(name);
                        broadcastArmaMessage(`${name} hat den Server 2302 betreten`);
                    }
                });
    
                playersOnServer.forEach(player => {
                    const index = playerNames.indexOf(player);
                    if (index === -1) {
                        playersOnServer.splice(index, 1);
                        broadcastArmaMessage(`${player} hat den Server 2302 verlassen`);
                    }
                });
            });
        }
        recurse();
    }
*/    
    
    /**
     * Broadcasts a message to all channels arma notices should be posted in
     * @param message
     * @param options
     */
/*
    function broadcastArmaMessage(message, options) {
        targetChannelArma.forEach(channel => {
            channel.send(message, options);
        });
    }
*/    

    findTargetChannel() {
        this.targetChannel = [];

        this.discordClient.guilds.forEach(guild => {
            guild.channels.forEach((value, key) => {
                if (config.armaServer.noticesTargetChannel.indexOf(value.name) > -1) {
                    const channel = new Discord.TextChannel(guild, value);
                    this.targetChannel.push(channel);
                    channel.send(`Ein wilder Blechadler ist erschienen ${Utils.getEmoji(guild, 'adlerkopp')}`);
                    console.log('found Teampspeak target channel', channel.id);
                }
            });
        });
    }
}