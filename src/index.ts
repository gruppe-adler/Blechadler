import Discord from 'discord.js';

export default class Blechadler {
    private discordClient: Discord.Client;

    constructor() {
        this.discordClient = new Discord.Client();

        // this.discordClient.login(auth.token);

        // this.discordClient.on('ready' () => {
        //     // TODO
        // });
    }

    /**
     * Send message to channel.
     * @param channelID Channel ID of text channel
     * @param message Message to send
     * @param options Message options
     */
    public async sendMessageToChannel(channelID: string, message: string, options?: Discord.MessageOptions): Promise<void> {
        try {
            const channel = await this.discordClient.channels.fetch(channelID.toString());
            if (channel.type !== 'text') throw new Error('Cannot send message to channel with type other than "text"');
            (channel as Discord.TextChannel).send(message, options);
        } catch (err) {
            // TODO: Log error
        }
    }

    public subscribeToMessages(filter: (msg: Discord.Message) => boolean, channelIDs: string[] = [], callback: (msg: Discord.Message) => unknown): void {
        this.discordClient.on('message', msg => {
            if (channelIDs.length > 0 && !channelIDs.includes(msg.channel.id)) return;
            if (!filter(msg)) return;

            callback(msg);
        });
    }
}

// eslint-disable-next-line no-new
new Blechadler();
