import TeamspeakService, { TeamspeakChannel, TeamspeakUser, TeamspeakUserType } from './TeamspeakService';

import config from './config';

const { ip, port, sid, username, password } = config.teamspeak;

const tsService = new TeamspeakService(ip, port, sid, username, password);

const printUser = (user: TeamspeakUser) => {
    return `> ${user.nickname}`;
};

const printChannel = (channel: TeamspeakChannel, depth = 0): string => {
    const space = ' '.repeat(4 * depth);

    let channelStr = '';

    for (const user of channel.users) {
        channelStr += `${space}${printUser(user)}\n`;
    }

    for (const c of channel.channels) {
        channelStr += printChannel(c, depth + 1);
    }

    if (channelStr.length === 0) return '';

    if (channel.users.length > 0) {
        return `${space}**${channel.name}** (${channel.users.length})\n${channelStr}`;
    } else {
        return `${space}**${channel.name}**\n${channelStr}`;
    }
};

const showUsers = () => tsService.getChannels().then(channels => {
    const str = channels.map(channel => printChannel(channel, 0)).filter(chStr => chStr.length > 0).join('\n');

    console.log(str);
});

tsService.on('query_connected', () => {
    console.log('query_connected');

    showUsers();

    setInterval(showUsers, 5 * 60 * 1000);
});

tsService.on('query_disconnected', () => console.log('query_disconnected'));
tsService.on('error', err => console.error('error', err));

tsService.on('connected', ({ nickname, type }) => {
    if (type === TeamspeakUserType.Query) return;

    console.log(`${nickname} connected!`);
});
tsService.on('disconnected', ({ nickname, type }) => {
    if (type === TeamspeakUserType.Query) return;

    console.log(`${nickname} disconnected!`);
});
