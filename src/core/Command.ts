import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export default interface BlechadlerCommand {
    builder: SlashCommandBuilder|Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
    callback: (interaction: CommandInteraction) => unknown
}
