interface TeamspeakConfig {
    ip: string;
    port: number;
    sid: number;
    username: string;
    password: string;
    discordChannelIDs: string[];
}

// interface BirthdayEntries {
//     userId: number;
//     birthday: string;
// }

interface Config {
    teamspeak: TeamspeakConfig;
    // birthdays: BirthdayEntries[]
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const config: Config = require('../config/config.json');

export default config;
