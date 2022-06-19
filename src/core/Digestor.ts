import { ModalSubmitInteraction } from 'discord.js';

export default interface BlechadlerDigestor {
    name: string
    callback: (interaction: ModalSubmitInteraction) => unknown
}
