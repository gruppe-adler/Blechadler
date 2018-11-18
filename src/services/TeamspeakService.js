const TeamspeakClient = require('node-teamspeak');
const config = require('../../config/config.json');
const auth = require('../../config/auth.json');
const Discord = require('discord.js');
const Utils = require('./Utils');


module.exports = class TeamspeakService {

    constructor (client) {
        this.discordClient = client;
        this.activeUsers = [];

        this.setupTeamspeakQuery();
        this.findTargetChannel();
    }


    /**
     * Setups a teamspeak client, connects to the specified server query and reconnects if connection has been lost
     */
    setupTeamspeakQuery() {
        if (this.teamspeakClient && this.teamspeakClient.socket) {
            this.teamspeakClient.socket.destroy();
        }
        this.teamspeakClient = new TeamspeakClient(config.teamspeak.serverip, config.teamspeak.queryport);
        this.activeUsers = {};

        this.teamspeakClient.on('connect', this.onConnect.bind(this));
        this.teamspeakClient.on('close', this.reconnect.bind(this));
        this.teamspeakClient.on('error', this.reconnect.bind(this));
        this.teamspeakClient.on('cliententerview', this.onUserEnter.bind(this));
        this.teamspeakClient.on('clientleftview', this.onUserLeave.bind(this));    
    }
    
    
    /*
    * Handles successful server query connections
    * Logs into server query with provided credentials and selects the target virtual server
    * Registers a server notify event to catch joining/leaving users
    */
   onConnect() {
       this.teamspeakClient.send('login', {client_login_name: auth.serverquery.username, client_login_password: auth.serverquery.password}, ((err, response) => {
           if (err) {
               console.log('failed to login into ts query', err);
               return;
            }
            
            this.teamspeakClient.send('use', {sid: config.teamspeak.sid}, ((err, response) => {
                if (err) {
                    console.log('failed to select virtual server', err);
                } else {
                    this.teamspeakClient.send('servernotifyregister', {event: 'server'}, ((err, response) => {
                        console.log('connected and logged into ts query');
                        this.sendPing();
                        this.cacheClients();
                    }).bind(this));
                }
            }).bind(this));
        }).bind(this));
    }
    
    
    /**
     * Sends a ping to the server query to prevent a timeout after 10 minutes idling
     */
    sendPing() {
        this.teamspeakClient.send('version', (() => {
            console.log('ts query ping');
            setTimeout(this.sendPing.bind(this), 60000);
        }).bind(this));
    }
 
    /**
     * Caches all clients on startup to provide a working disconnect notify logic 
     * even if the user was already connected
     */
    cacheClients() {
        this.teamspeakClient.send('clientlist', {'-info': ''}, ((err, response) => {
            if (err) {
                console.log(err);
                return;
            }
 
            if (!Array.isArray(response)) {
                response = [response];
            }
 
            response.forEach(current => {
                // Filter out server query clients
                if (current.client_type !== 1) {
                    this.activeUsers[current.clid.toString()] = current.client_nickname;
                }
            });
        }).bind(this));
    }

    /*
    * Called when a client enters teamspeak
    */
    onUserEnter(response) {
        if (response.client_type === 0) {
            this.broadcastMessage(`➡️  **${response.client_nickname}** joined`);
            this.teamspeakClient.send('clientinfo', {clid: response.clid}, ((err, clientData) => {

                if (clientDate == null) return;

                this.activeUsers[response.clid.toString()] = clientData.client_nickname;
                if (this.isNewUser(clientData.client_created)) {
                    this.broadcastMessage(`@here \`${response.client_nickname}\` ist neu`);
                }
            }).bind(this));
        }
    }

    
    /*
    * Called when a client leaves teamspeak
    */
    onUserLeave(response) {
        if (this.activeUsers[response.clid.toString()]) {
            const username = this.activeUsers[response.clid.toString()];
            delete this.activeUsers[response.clid.toString()];
            this.broadcastMessage(`⬅️  **${username}** left`);
        }
    }

    reconnect() {
        console.log('auto reconnecting to teamspeak server query');
        setTimeout(this.setupTeamspeakQuery.bind(this), 3000);
    }

    /**
     * Compares a past unix timestamp with the current time and returns the difference in milliseconds
     * @param unixTimestamp
     * @returns {boolean}
     */
    isNewUser(unixTimestamp) {
        const date = new Date(unixTimestamp*1000);
        const now = new Date();
        const dif = now.getTime() - date.getTime();
        return dif < 3000;
    }

    
    /**
     * Broadcasts a message to all channels teamspeak notices should be posted in
     * @param message
     * @param options
     */
    broadcastMessage(message, options) {
        this.targetChannel.forEach(channel => {
            channel.send(message, options);
        });
    }

    /**
     * Sends the teamspeak client list to the message origin channel
     * @param message
     */
    sendClientList(message) {
        if (config.teamspeak.noticesTargetChannel.indexOf(message.channel.name) === -1) {
            message.channel.send(`Du bist leider im falschen Channel dafür ☹`);
            return;
        }

        this.teamspeakClient.send('channellist', ((err, channel) => {
            if (!Array.isArray(channel)) {
                channel = [channel];
            }

            this.teamspeakClient.send('clientlist', {'-times': ''}, ((err, clients) => {
                if (!Array.isArray(clients)) {
                    clients = [clients];
                }

                let clientCount = 0;
                clients.forEach(client => {
                    const targetChannel = channel.find(x => x.cid === client.cid);
                    if (client.client_type === 0 && targetChannel) {
                        targetChannel.clients = targetChannel.clients || [];
                        targetChannel.clients.push(client);
                        clientCount++;
                    }
                });

                if (clientCount === 0) {
                    message.channel.send('Keiner online');
                    return;
                }

                let response  = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n';
                response += `**Benutzer online:** ${clientCount}\n\n`;

                channel.forEach(channel => {
                    channel.clients = channel.clients || [];
                    if (channel.clients.length > 0) {
                        response += `**${channel.channel_name}** (${channel.clients.length}):\n`;
                        channel.clients.forEach(x => {
                            const date = new Date(0, 0, 0, 0, 0, 0, x.client_idle_time);
                            if (date.getHours() > 0) {
                                response += `🔸 `;
                            } else {
                                response += `🔹 `;
                            }
                            response += `\t${x.client_nickname}`;
                            if (date.getHours() > 0) {
                                response += ` (Idle: ${date.getHours()}h)`;
                            }
                            response += '\n';
                        });
                        response += '\n';
                    }
                });
                // This is a weird discord newline behaviour workaround, just ignore it
                response = response.substring(0, response.length - 2);
                response += '\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
                message.channel.send(response);
            }).bind(this));
        }).bind(this));
    }

    findTargetChannel() {
        this.targetChannel = [];

        this.discordClient.guilds.forEach(guild => {
            guild.channels.forEach((value, key) => {
                if (config.teamspeak.noticesTargetChannel.indexOf(value.name) > -1) {
                    const channel = new Discord.TextChannel(guild, value);
                    this.targetChannel.push(channel);
                    channel.send(`Ein wilder Blechadler ist erschienen ${Utils.getEmoji(guild, 'adlerkopp')}`);
                    console.log('found Teampspeak target channel', channel.id);
                }
            });
        });
    }
}