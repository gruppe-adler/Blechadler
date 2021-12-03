import { EventEmitter } from 'events';
const DISCORD_EPOCH = 1420070400000;
export default class LeetService extends EventEmitter {
    public convertSnowflakeToDate (snowflake: number, epoch: number = DISCORD_EPOCH): Date {
        return new Date(snowflake / 4194304 + epoch);
    }
}
