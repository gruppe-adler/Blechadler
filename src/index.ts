import * as Discord from 'discord.js';
import config from './config';
import TeamspeakPlugin from './plugins/TeamspeakPlugin';

export default class Blechadler {
    private discordClient: Discord.Client;

    constructor() {
        this.discordClient = new Discord.Client();

        this.discordClient.login(config.token);

        this.discordClient.on('ready', () => {
            console.log('Discord Logged In');
            /* eslint-disable no-new */
            new TeamspeakPlugin(this);
            /* eslint-enable no-new */
        });
    }

    /**
     * Send message to channel.
     * @param channelID Channel ID of text channel
     * @param message Message to send
     * @param options Message options
     */
    public async sendMessageToChannel(channelID: string, message: string, options?: Discord.MessageOptions): Promise<Discord.Message> {
        try {
            const channel = await this.discordClient.channels.fetch(channelID.toString());
            if (channel.type !== 'text') throw new Error('Cannot send message to channel with type other than "text"');
            return (channel as Discord.TextChannel).send(message, options) as Promise<Discord.Message>;
        } catch (err) {
            // TODO: Log error
        }
    }

    /**
     * Subscribe to messages, which are within given channels and pass given filter function.
     * @param filter Filter function; will be passed the message and has to return true for the callback to be called
     * @param channelIDs IDs of all channel in which message has to be for callback to called; Empty array = all channels
     * @param callback Callback
     */
    public subscribeToMessages(filter: (msg: Discord.Message) => boolean, channelIDs: string[] = [], callback: (msg: Discord.Message) => unknown): void {
        this.discordClient.on('message', msg => {
            if (channelIDs.length > 0 && !channelIDs.includes(msg.channel.id)) return;
            if (!filter(msg)) return;

            callback(msg);
        });
    }

    public async registerHelpMessage(message: string, options: Discord.MessageOptions = {}, callback: (msg: Discord.Message) => unknown): Promise<void> {
        const helpMessage = await this.sendMessageToChannel(config.botChannel, message, options);

        this.subscribeToMessages(
            msg => (msg.reference && msg.reference.messageID === helpMessage.id),
            [config.botChannel],
            callback
        );
    }

    public get discordClientId(): string {
        return this.discordClient.user.id;
    }
}

// eslint-disable-next-line no-new
new Blechadler();
