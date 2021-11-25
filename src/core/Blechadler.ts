import * as Discord from 'discord.js';
import config from './../config';
import BlechadlerCommand from './Command';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import BlechadlerPlugin from './Plugin';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

export default class Blechadler {
    public commands: Discord.Collection<string, BlechadlerCommand> = new Discord.Collection();
    private readonly plugins: BlechadlerPlugin[] = [];
    private readonly restClient = new REST({ version: '9' }).setToken(config.token);

    private readonly client: Discord.Client;

    constructor () {
        this.client = new Discord.Client({ invalidRequestWarningInterval: 10, intents: ['GUILDS', 'GUILD_MESSAGES'] });

        this.installPlugins();
        this.registerCommandListener();

        this.client.on('ready', () => {
            console.log('Discord Logged In');

            void this.restClient.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: Array.from(this.commands.values()).map(command => command.builder.toJSON()) }
            );
        });

        void this.client.login(config.token);
    }

    private installPlugins (): void {
        const pluginFiles = fs.readdirSync(path.join(__dirname, '..', 'plugins'));

        for (const file of pluginFiles) {
            if (!/^.+\.(js|ts)$/.test(file)) continue;
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const Plugin = require(path.join(__dirname, '..', 'plugins', file)).default;

            const plugin = new Plugin();
            this.plugins.push(plugin);
            for (const command of plugin.getCommands()) {
                this.commands.set(command.builder.name, command);
            }
        }
    }

    private registerCommandListener (): void {
        this.client.on('interactionCreate', async (interaction: Discord.CommandInteraction) => {
            if (!interaction.isCommand()) return;

            const command = this.commands.get(interaction.commandName);

            if (command == null) return;

            try {
                await command.callback(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        });
    }

    public async sendMsg (channelId: string, msg: string | Discord.MessagePayload | Discord.MessageOptions): Promise<void> {
        try {
            const channel = this.client.channels.cache.get(channelId);

            if (channel?.isText() ?? false) {
                await (channel as Discord.TextChannel).send(msg);
            }
        } catch (err) {

        }
    }
}
