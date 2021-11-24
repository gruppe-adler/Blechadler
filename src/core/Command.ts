import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export default interface BlechadlerCommand {
    builder: SlashCommandBuilder
    callback: (interaction: CommandInteraction) => unknown
}
