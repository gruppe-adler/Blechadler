import Blechadler from './Blechadler';
import BlechadlerCommand from './Command';

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

    protected abstract setup (): void;
}
