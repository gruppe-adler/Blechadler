export default class BlechadlerError extends Error {
    public readonly name = 'BlechadlerError';

    public readonly ephemeral: boolean;
    public readonly messageContent: string;

    constructor (message: string, options?: ErrorOptions & { ephemeral?: boolean, messageContent?: string }) {
        super(message, options);

        this.ephemeral = options?.ephemeral ?? false;
        this.messageContent = options?.messageContent ?? 'Da is irgendetwas schief gelaufen 😰. Bitte hau mich nicht 🥺';
    }
}
