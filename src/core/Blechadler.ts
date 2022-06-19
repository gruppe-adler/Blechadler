import * as Discord from 'discord.js';
import config from './../config';
import BlechadlerCommand from './Command';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import BlechadlerPlugin from './Plugin';
import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import BlechadlerDigestor from './Digestor';
import BlechadlerError from './Error';

type BlechadlerPluginConstructor = new (bot: Blechadler) => BlechadlerPlugin;

export default class Blechadler {
    public commands: Discord.Collection<string, BlechadlerCommand> = new Discord.Collection();
    public digestors: Discord.Collection<string, BlechadlerDigestor> = new Discord.Collection();
    private readonly plugins: BlechadlerPlugin[] = [];
    private readonly restClient = new REST({ version: '9' }).setToken(config.token);

    public readonly client: Discord.Client;

    constructor () {
        this.client = new Discord.Client({ invalidRequestWarningInterval: 10, intents: ['GUILDS', 'GUILD_MESSAGES'] });

        void this.installPlugins();
        this.registerCommandListener();

        this.client.on('ready', () => {
            logger.info('Discord Logged In');

            void this.restClient.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: Array.from(this.commands.values()).map(command => command.builder.toJSON()) }
            );

            this.plugins.forEach(plugin => plugin.onDiscordReady());
        });

        void this.client.login(config.token);
    }

    private async installPlugins (): Promise<void> {
        const pluginFiles = fs.readdirSync(path.join(__dirname, '..', 'plugins'));

        for (const file of pluginFiles) {
            if (!/^.+\.(js|ts)$/.test(file)) continue;
            const { default: PluginConstructor } = await import(path.join(__dirname, '..', 'plugins', file)) as { default: BlechadlerPluginConstructor };

            const plugin = new PluginConstructor(this);
            this.plugins.push(plugin);
            for (const command of plugin.getCommands()) {
                this.commands.set(command.builder.name, command);
            }
            for (const digestor of plugin.getDigestors()) {
                this.digestors.set(digestor.name, digestor);
            }
        }
    }

    private registerCommandListener (): void {
        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isCommand()) {
                const command = this.commands.get(interaction.commandName);

                if (command === undefined) {
                    await interaction.reply({ content: 'Diesen Befehl kenne ich nicht 😰. Bitte hau mich nicht 🥺', ephemeral: true });
                    return;
                }

                try {
                    await command.callback(interaction);
                } catch (error) {
                    logger.error('Error executing command: ' + JSON.stringify(error));
                    logger.error(error);

                    if (error instanceof BlechadlerError) {
                        if (interaction.deferred || interaction.replied) {
                            await interaction.editReply({ content: error.messageContent });
                        } else {
                            await interaction.reply({ content: error.messageContent, ephemeral: error.ephemeral });
                        }
                    }
                }
                return;
            }

            if (interaction.isModalSubmit()) {
                const digestor = this.digestors.get(interaction.customId);

                try {
                    if (digestor == null) throw new Error(`Could not fund digestor for command ${interaction.customId}.`);
                    await digestor.callback(interaction);
                } catch (error) {
                    logger.error('Error executing digestor: ' + JSON.stringify(error));
                    await interaction.reply({ content: 'Da is irgendetwas schief gelaufen 😰. Bitte hau mich nicht 🥺', ephemeral: true });
                }
            }
        });
    }

    public getEmoji (name: string): Discord.GuildEmoji|undefined {
        return this.client.emojis.cache.find(e => e.name === name);
    }

    public async sendMsg (channelId: string, msg: string | Discord.MessagePayload | Discord.MessageOptions): Promise<void> {
        try {
            const channel = this.client.channels.cache.get(channelId);

            if (channel?.isText() ?? false) {
                await (channel as Discord.TextChannel).send(msg);
            }
        } catch (error) {
            logger.error('Error sending message: ' + JSON.stringify(error));
        }
    }
}
