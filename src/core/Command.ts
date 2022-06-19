import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export default interface BlechadlerCommand {
    builder: SlashCommandBuilder|SlashCommandSubcommandsOnlyBuilder|Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
    callback: (interaction: CommandInteraction) => unknown
}
