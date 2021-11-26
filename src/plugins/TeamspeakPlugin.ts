import * as Discord from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import config from '../config';
import BlechadlerPlugin from '../core/Plugin';
import BlechadlerCommand from '../core/Command';
import TeamspeakService, { TeamspeakChannel, TeamspeakUser, TeamspeakUserType } from '../services/TeamspeakService';
import logger from '../core/logger';

export default class TeamspeakPlugin extends BlechadlerPlugin {
    private readonly config = config.teamspeak;
    private service!: TeamspeakService; // This is set in setup-method, which is called by the constructor

    protected setup (): void {
        const { ip, port, sid, username, password, leaveEmoji, joinEmoji } = config.teamspeak;
        this.service = new TeamspeakService(ip, port, sid, username, password);

        // Send message to #ts channel, when user joins Teamspeak
        this.service.on('connected', ({ nickname, type, new: isNewUser }) => {
            if (type === TeamspeakUserType.Query) return;

            this.sendMsg(`:${joinEmoji}:  **${nickname}** joined`);
            if (isNewUser) this.sendMsg(`@here \`${nickname}\` ist neu`);
        });

        // Send message to #ts channel, when user leaves Teamspeak
        this.service.on('disconnected', ({ nickname, type }) => {
            if (type === TeamspeakUserType.Query) return;

            this.sendMsg(`:${leaveEmoji}:  **${nickname}** left`);
        });
    }

    private sendMsg (msg: string | Discord.MessagePayload | Discord.MessageOptions): void {
        for (const channel of this.config.discordChannelIDs) {
            void this.blechadler.sendMsg(channel, msg);
        }
    }

    public getCommands (): BlechadlerCommand[] {
        return [
            {
                builder: new SlashCommandBuilder().setName('ts').setDescription('Aktuelle Teamspeak Nutzer anzeigen').setDefaultPermission(true),
                callback: async (interaction: CommandInteraction) => {
                    if (!this.config.discordChannelIDs.includes(interaction.channelId)) {
                        void interaction.reply({ content: 'Du bist im falschen Channel unterwegs 🙄', ephemeral: true });
                        return;
                    }

                    await interaction.deferReply();

                    if (!this.service.isConnected) {
                        await interaction.editReply('Ich habe aktuell keine Verbindung zum Teamspeak 😰. Bitte hau mich nicht 🥺');
                        return;
                    }

                    try {
                        const channels = await this.service.getChannels();

                        const clientCount = channels.map(TeamspeakPlugin.countUsers).reduce((acc, cur) => cur + acc, 0);

                        if (clientCount === 0) {
                            await interaction.editReply('Keiner online');
                            return;
                        }

                        let response = '\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n';
                        response += `**Benutzer online:** ${clientCount}\n`;

                        for (const channel of channels) {
                            const str = TeamspeakPlugin.printChannel(channel);

                            if (str.length === 0) continue;

                            response += `\n${str}`;
                        }

                        response += '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

                        await interaction.editReply(response);
                    } catch (error) {
                        logger.error('Error constructing TS3-message: ' + JSON.stringify(error));
                        await interaction.editReply('Da is irgendetwas schief gelaufen 😰. Bitte hau mich nicht 🥺');
                    }
                }
            }
        ];
    }

    /**
     * Recursively count users within teamspeak channel
     * @param currentChannel Channel
     */
    private static countUsers (currentChannel: TeamspeakChannel): number {
        let users = currentChannel.users.length;

        for (const channel of currentChannel.channels) {
            users += TeamspeakPlugin.countUsers(channel);
        }

        return users;
    }

    /**
     * Pretty print teamspeak channel
     * @param currentChannel Channel to print
     */
    private static printChannel (currentChannel: TeamspeakChannel): string {
        let channelStr = '';

        if (currentChannel.users.length > 0) {
            for (const user of currentChannel.users) {
                channelStr += `${TeamspeakPlugin.printUser(user)}\n`;
            }

            channelStr = `**${currentChannel.name}** (${currentChannel.users.length})\n${channelStr}`;
        }

        for (const channel of currentChannel.channels) {
            const str = TeamspeakPlugin.printChannel(channel);
            if (str.length === 0) continue;
            channelStr += `${channelStr.length > 0 ? '\n' : ''}${str}`;
        }

        return channelStr;
    }

    /**
     * Pretty print teamspeak user
     * @param user User to print
     */
    private static printUser (user: TeamspeakUser): string {
        const date = new Date(0, 0, 0, 0, 0, 0, user.idleTime);

        if (date.getHours() > 0) {
            return `🔸 ${user.nickname} (Idle ${date.getHours()}h)`;
        } else {
            return `🔹 ${user.nickname}`;
        }
    }
}
