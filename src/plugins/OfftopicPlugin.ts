import BlechadlerPlugin from '../core/Plugin';
// import logger from '../core/logger';
import config from './../config';
import { channelMention, SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMemberRoleManager, MessageActionRow, Modal, ModalActionRowComponent, ModalSubmitInteraction, Role, TextChannel, TextInputComponent, GuildChannelTypes, GuildBasedChannel, Guild, NonThreadGuildBasedChannel, MessageSelectMenu } from 'discord.js';
import BlechadlerCommand from '../core/Command';
import BlechadlerDigestor from '../core/Digestor';
import BlechadlerError from '../core/Error';

export default class OfftopicPlugin extends BlechadlerPlugin {
    private readonly config = config.offtopic;

    setup (): void {}

    public getCommands (): BlechadlerCommand[] {
        return [
            {
                builder: new SlashCommandBuilder()
                    .setName('offtopic')
                    .setDescription('Manage offtopic channels')
                    .addSubcommand(subcommand =>
                        subcommand
                            .setName('create')
                            .setDescription('Create a offtopic channel')
                    ).addSubcommand(subcommand =>
                        subcommand
                            .setName('archive')
                            .setDescription('Archive a offtopic channel')
                            .addChannelOption(input =>
                                input
                                    .setName('channel')
                                    // TODO: addChannelTypes
                                    // .addChannelTypes(ChannelType.GuildText)
                                    .setRequired(true)
                                    .setDescription('Channel to archive')
                            )
                    ).addSubcommand(subcommand =>
                        subcommand
                            .setName('unarchive')
                            .setDescription('Unarchive a offtopic channel')
                            .addChannelOption(input =>
                                input
                                    .setName('channel')
                                    // TODO: addChannelTypes
                                    // .addChannelTypes(ChannelType.GuildText)
                                    .setRequired(true)
                                    .setDescription('Channel to archive')
                            )
                    ).addSubcommand(subcommand =>
                        subcommand
                            .setName('edit')
                            .setDescription('Edit a offtopic channel')
                            .addChannelOption(input =>
                                input
                                    .setName('channel')
                                    // TODO: addChannelTypes
                                    // .addChannelTypes(ChannelType.GuildText)
                                    .setRequired(true)
                                    .setDescription('Channel to edit')
                            )
                    ).addSubcommand(subcommand =>
                        subcommand
                            .setName('order')
                            .setDescription('Order offtopic channels alphabetically')
                    ),

                callback: async (interaction: CommandInteraction) => {
                    const member = interaction.member;
                    if (member === null) throw new Error('Coudln\'t find member');

                    if (!this.hasRole(member.roles)) throw new BlechadlerError('User is not an Adler', { messageContent: 'Diggi du bist ja gar kein Adler 🥱', ephemeral: true });

                    const subcommand = interaction.options.getSubcommand(true);

                    switch (subcommand) {
                        case 'create':
                            await this.create(interaction);
                            return;
                        case 'edit':
                            await this.edit(interaction);
                            return;
                        case 'archive':
                            await this.archive(interaction);
                            return;
                        case 'unarchive':
                            await this.unarchive(interaction);
                            return;
                        case 'order':
                            await this.order(interaction);
                            return;
                        default:
                            throw new BlechadlerError(`Subcommand ${subcommand} not found`, { messageContent: `Ich hab das Command ${subcommand} nicht gefunden du Dulli 🙄`, ephemeral: true });
                    }
                }
            }
        ];
    }

    public getDigestors (): BlechadlerDigestor[] {
        return [
            {
                name: 'offtopicChannelCreateModal',
                callback: async (interaction: ModalSubmitInteraction) => {
                    const channelName = interaction.fields.getTextInputValue('channel_name');
                    let permissionName = interaction.fields.getTextInputValue('role_name');
                    if (permissionName.length === 0) permissionName = channelName;
                    const description = interaction.fields.getTextInputValue('description');

                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    await interaction.reply({ content: `Warte digga ich erstelle nen channel mit dem Namen ${channelName} und der Permission OT_${permissionName}`, ephemeral: true });
                    const channel = await this.createChannel(interaction.guildId ?? '', channelName, description);
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    const permission = await this.createPermission(interaction.guildId ?? '', `OT_${permissionName}`);
                    if (permission === undefined) throw new Error('Couldn\'t create permission');
                    channel?.permissionOverwrites.create(permission, { VIEW_CHANNEL: true });
                    const member = interaction.member;
                    if (member === null) throw new Error('Couldn\'t find member');
                    await (member.roles as GuildMemberRoleManager).add(permission);
                    await interaction.followUp({ content: 'Diggi 😎 bin fertig. Viel Spaß mit deinem Channel!', ephemeral: true });
                    await this.orderCategory(interaction.guildId ?? '', this.config.mainCategory);
                }
            },
            {
                name: 'offtopicChannelEditModal',
                callback: async (interaction: ModalSubmitInteraction) => {
                    // const channelName = interaction.fields.getTextInputValue('channel_name');

                    // const description = interaction.fields.getTextInputValue('description');
                    // if (interaction.channelId === null) throw new Error('Couldn\'t find channel');
                    // // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    // await interaction.reply({ content: `Warte digga ich bearbeite den Channel mit dem Namen ${channelName}`, ephemeral: true });
                    // await this.editChannel(interaction.guildId ?? '', interaction.channelId, channelName, description);
                    // await interaction.followUp({ content: `Diggi 😎 bin fertig. <#${interaction.channelId}> wurde nach deinen Wünschen editiert!\n**Die Gruppe musst aber selber anpassen!**`, ephemeral: true });
                    // await this.orderCategory(interaction.guildId ?? '', this.config.mainCategory);
                }
            }
        ];
    }

    private async create (interaction: CommandInteraction): Promise<void> {
        const modal = new Modal()
            .setTitle('Offtopic Channel erstellen')
            .setCustomId('offtopicChannelCreateModal')
            .addComponents(
                new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                        .setCustomId('channel_name')
                        .setRequired(true)
                        .setLabel('Channel Name')
                        .setPlaceholder('r6-siege')
                        .setMaxLength(100)
                        .setStyle('SHORT')
                ),
                new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                        .setCustomId('role_name')
                        .setLabel('Rollen Name')
                        .setPlaceholder('R6Siege')
                        .setMaxLength(100)
                        .setStyle('SHORT')
                ),
                new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                        .setCustomId('description')
                        .setLabel('Beschreibung')
                        .setPlaceholder('Geiler Channel')
                        .setStyle('PARAGRAPH')
                )
            );

        await interaction.showModal(modal);
    }

    private async edit (interaction: CommandInteraction): Promise<void> {
        const channelParam = interaction.options.getChannel('channel');
        if (channelParam === null) throw new BlechadlerError('Could not find parameter channel');

        const channel = await this.fetchChannel(interaction.guildId ?? '', channelParam.id);
        if (channel === null) throw new BlechadlerError('Could not find channel');
        const isInArchive = channel.parentId === this.config.archiveCategory;
        const isInMain = channel.parentId === this.config.mainCategory;

        if (!isInArchive && !isInMain) throw new BlechadlerError('Channel is not in offtopic or archive category', { messageContent: `Diggi 🤔 der Channel ist doch gar nicht in <#${this.config.mainCategory}> oder <#${this.config.archiveCategory}> 😑`, ephemeral: true });

        if (channel === null) throw new BlechadlerError('Could not find channel');
        const modal = new Modal()
            .setTitle('Offtopic Channel bearbeiten')
            .setCustomId('offtopicChannelEditModal')
            .addComponents(
                new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                        .setCustomId('channel_name')
                        .setRequired(true)
                        .setLabel('Channel Name')
                        .setPlaceholder('r6-siege')
                        .setMaxLength(100)
                        .setRequired(true)
                        .setStyle('SHORT')
                        .setValue(channel?.name ?? '')
                ),
                new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                        .setCustomId('description')
                        .setLabel('Beschreibung')
                        .setPlaceholder('Geiler Channel')
                        .setStyle('PARAGRAPH')
                        .setMaxLength(1024)
                        .setValue((channel as TextChannel).topic ?? '')
                )
            );

        await interaction.showModal(modal);

        const modalIteraction = await interaction.awaitModalSubmit({ time: 60 * 1000 });

        const name = modalIteraction.fields.getTextInputValue('channel_name');
        const description = modalIteraction.fields.getTextInputValue('description');

        await this.editChannel(interaction.guildId ?? '', channel.id, name, description);
        await this.orderCategory(interaction.guildId ?? '', isInMain ? this.config.mainCategory : this.config.archiveCategory);

        await modalIteraction.reply({ content: `Diggi 😎 bin fertig. <#${channel.id}> wurde nach deinen Wünschen editiert!\n**Die Gruppe musst aber selber anpassen!**`, ephemeral: true });
    }

    private async archive (interaction: CommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });
        const channelParam = interaction.options.getChannel('channel');
        if (channelParam === null) throw new BlechadlerError('Could not find parameter channel');
        await this.moveChannel(interaction.guildId ?? '', channelParam.id, this.config.mainCategory, this.config.archiveCategory);
        await interaction.editReply('Bin fertig 😎');
    }

    private async unarchive (interaction: CommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });
        const channelParam = interaction.options.getChannel('channel');
        if (channelParam === null) throw new BlechadlerError('Could not find parameter channel');
        await this.moveChannel(interaction.guildId ?? '', channelParam.id, this.config.archiveCategory, this.config.mainCategory);
        await interaction.editReply('Bin fertig 😎');
    }

    private async order (interaction: CommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true });
        await this.orderCategory(interaction.guildId ?? '', this.config.mainCategory);
        await this.orderCategory(interaction.guildId ?? '', this.config.archiveCategory);
        await interaction.editReply('Bin fertig 😎');
    }

    private async moveChannel (guildID: string, channelID: string, fromCategory: string, toCategory: string): Promise<void> {
        const channel = await this.fetchChannel(guildID, channelID);
        if (channel === null) throw new BlechadlerError('Could not find channel');

        if (channel.parentId === toCategory) throw new BlechadlerError('Channel is already in target category', { messageContent: `Diggi 🤔 der Channel ist doch schon in <#${toCategory}> 😑` });
        if (channel.parentId !== fromCategory) throw new BlechadlerError('Channel is not in from category', { messageContent: `Diggi 🤔 der Channel ist doch gar nicht in <#${fromCategory}> 😑` });
        await channel.setParent(toCategory);
        await this.orderCategory(guildID, toCategory);
    }

    private async orderCategory (guildId: string, categoryId: string): Promise<void> {
        const category = await this.fetchChannel(guildId, categoryId);
        if (category === null) throw new BlechadlerError('Could not find category');

        if (category.type !== 'GUILD_CATEGORY') throw new BlechadlerError('Channel is not a categoy');

        const arr = category.children.map(val => val).sort((a, b) => a.name.localeCompare(b.name));

        for (let i = 0; i < arr.length; i++) {
            const channel = arr[i];
            if (channel.position === i) continue;
            await channel.setPosition(i);
        }
    }

    private hasRole (roles: string[] | GuildMemberRoleManager): boolean {
        if (Array.isArray(roles)) {
            return roles.find(role => this.config.allowedRoles.includes(role)) !== undefined;
        } else {
            return roles.cache.find(role => this.config.allowedRoles.includes(role.id)) !== undefined;
        }
    }

    private async fetchChannel (guildId: string, channelId: string): Promise<NonThreadGuildBasedChannel|null> {
        const guild = this.blechadler.client.guilds.cache.get(guildId);
        if (guild === undefined) return null;

        const channel = await guild.channels.fetch(channelId);

        return channel;
    }

    private async createChannel (guildId: string, name: string, description: string): Promise<TextChannel> {
        const guild = this.blechadler.client.guilds.cache.get(guildId);
        if (guild === undefined) throw new BlechadlerError('Could not find guild');

        const channel = await guild.channels.create(name, { parent: this.config.mainCategory, topic: description }); // TODO: parent

        // disallow view for evernyone
        await channel.permissionOverwrites.create(channel.guild.roles.everyone, { VIEW_CHANNEL: false });

        return channel;
    }

    private async editChannel (guildId: string, channelId: string, name: string, description: string): Promise<void> {
        const guild = this.blechadler.client.guilds.cache.get(guildId);
        if (guild === undefined) throw new BlechadlerError('Could not find guild');

        const channel = await this.fetchChannel(guildId, channelId);
        await channel?.edit({ name, topic: description });
    }

    private async createPermission (guildId: string, name: string, permissions: [] = []): Promise<Role> {
        const guild = this.blechadler.client.guilds.cache.get(guildId);
        if (guild === undefined) throw new BlechadlerError('Could not find guild');

        return await guild.roles.create({ name, permissions });
    }
}