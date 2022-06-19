import Blechadler from './Blechadler';
import BlechadlerCommand from './Command';
import BlechadlerDigestor from './Digestor';

export default abstract class BlechadlerPlugin {
    protected blechadler: Blechadler;
    protected commands: BlechadlerCommand[] = [];

    constructor (bot: Blechadler) {
        this.blechadler = bot;

        this.setup();
    }

    public getCommands (): BlechadlerCommand[] {
        return [];
    }

    public getDigestors (): BlechadlerDigestor[] {
        return [];
    }

    protected abstract setup (): void;

    public onDiscordReady (): void {};
}
