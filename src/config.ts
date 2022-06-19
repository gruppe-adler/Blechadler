interface TeamspeakConfig {
    ip: string
    port: number
    sid: number
    username: string
    password: string
    discordChannelIDs: string[]
    joinEmoji: string
    leaveEmoji: string
}

interface BirthdaysConfig {
    discordChannelIDs: string[]
}

interface LeetConfig {
    discordChannelIDs: string[]
}

interface OfftopicConfig {
    allowedRoles: string[]
    mainCategory: string
    archiveCategory: string
}

interface Config {
    token: string
    clientId: string
    guildId: string
    botChannel: string
    teamspeak: TeamspeakConfig
    birthdays: BirthdaysConfig
    leet: LeetConfig
    offtopic: OfftopicConfig
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const config: Config = require('../config/config.json');

export default config;
