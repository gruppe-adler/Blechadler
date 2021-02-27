import Blechadler from '..';

export default abstract class BlechadlerPlugin {
    protected blechadler: Blechadler;

    constructor(bot: Blechadler) {
        this.blechadler = bot;

        this.setup();
    }

    protected abstract setup(): void;
}
