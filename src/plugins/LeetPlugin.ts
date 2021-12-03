import LeetService from '../services/LeetService';
import BlechadlerPlugin from '../core/Plugin';
import logger from '../core/logger';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import BlechadlerCommand from '../core/Command';

export default class LeetPlugin extends BlechadlerPlugin {
    private service!: LeetService;

    setup (): void {
        this.service = new LeetService();
    }

    public getCommands (): BlechadlerCommand[] {
        return [
            {
                builder: new SlashCommandBuilder().setName('leet').setDescription('Gibt einen timestamp für eine Nachricht zurück').addStringOption(option => option.setName('snowflake').setDescription('ID der Nachricht').setRequired(true)),
                callback: async (interaction: CommandInteraction) => {
                    try {
                        const snowflake = interaction.options.data.find(option => option.name === 'snowflake')?.value ?? 1337;
                        await interaction.deferReply();
                        if (!Number.isInteger(+snowflake)) {
                            await interaction.editReply("That doesn't look like a snowflake. Snowflakes contain only numbers.");
                            return;
                        }
                        if (snowflake < 4194304) {
                            await interaction.editReply("That doesn't look like a snowflake. Snowflakes are much larger numbers.");
                            return;
                        }
                        const timestamp = this.service.convertSnowflakeToDate(+snowflake);
                        if (isNaN(timestamp.getTime())) {
                            await interaction.editReply("That doesn't look like a snowflake. Snowflakes have fewer digits.");
                            return;
                        }
                        await interaction.editReply(new Date(timestamp.getTime() - (timestamp.getTimezoneOffset() * 60000)).toISOString());
                    } catch (error) {
                        logger.error('Error while converting snowflake to timestamp: ' + JSON.stringify(error));
                        await interaction.editReply('Da is irgendetwas schief gelaufen 😰. Bitte hau mich nicht 🥺');
                    }
                }
            }
        ];
    }
}
