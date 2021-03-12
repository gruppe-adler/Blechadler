import TeamspeakService, { TeamspeakUserType, TeamspeakChannel, TeamspeakUser } from '../services/TeamspeakService';
import config from '../config';
import BlechadlerPlugin from './Plugin';

export default class TeamspeakPlugin extends BlechadlerPlugin {
    /**
     * Pretty print teamspeak user
     * @param user User to print
     */
    private static printUser(user: TeamspeakUser): string {
        const date = new Date(0, 0, 0, 0, 0, 0, user.idleTime);

        if (date.getHours() > 0) {
            return `🔸 ${user.nickname} (Idle ${date.getHours()}h)`;
        } else {
            return `🔹 ${user.nickname}`;
        }
    }

    /**
     * Pretty print teamspeak channel
     * @param currentChannel Channel to print
     */
    private static printChannel(currentChannel: TeamspeakChannel): string {
        let channelStr = '';

        if (currentChannel.users.length > 0) {
            for (const user of currentChannel.users) {
                channelStr += `${TeamspeakPlugin.printUser(user)}\n`;
            }

            channelStr = `**${currentChannel.name}** (${currentChannel.users.length})\n${channelStr}`;
        }

        for (const channel of currentChannel.channels) {
            const str = TeamspeakPlugin.printChannel(channel);
            if (str.length === 0) continue;
            channelStr += `${channelStr.length > 0 ? '\n' : ''}${str}`;
        }

        return channelStr;
    }

    /**
     * Recursively count users within teamspeak channel
     * @param currentChannel Channel
     */
    private static countUsers(currentChannel: TeamspeakChannel): number {
        let users = currentChannel.users.length;

        for (const channel of currentChannel.channels) {
            users += TeamspeakPlugin.countUsers(channel);
        }

        return users;
    }

    setup (): void {
        const { ip, port, sid, username, password, discordChannelIDs } = config.teamspeak;
        const service = new TeamspeakService(ip, port, sid, username, password);

        // helper function to send message to all teamspeak channels
        const sendMsg = (msg: string) => {
            for (const chID of discordChannelIDs) {
                this.blechadler.sendMessageToChannel(chID, msg);
            }
        };

        // Send message to #ts channel, when user joins Teamspeak
        service.on('connected', ({ nickname, type, new: isNewUser }) => {
            if (type === TeamspeakUserType.Query) return;

            sendMsg(`➡️  **${nickname}** joined`);
            if (isNewUser) sendMsg(`@here \`${nickname}\` ist neu`);
        });

        // Send message to #ts channel, when user leaves Teamspeak
        service.on('disconnected', ({ nickname, type }) => {
            if (type === TeamspeakUserType.Query) return;

            sendMsg(`⬅️  **${nickname}** left`);
        });

        // subscribe to !ts messages
        this.blechadler.subscribeToMessages(msg => /^⠀*!ts⠀*$/i.test(msg.content), discordChannelIDs, async msg => {
            if (!service.isConnected) {
                msg.channel.send('Ich habe aktuell keine Verbindung zum Teamspeak 😰. Bitte hau mich nicht 🥺');
                return;
            }

            try {
                const channels = await service.getChannels();

                const clientCount = channels.map(TeamspeakPlugin.countUsers).reduce((acc, cur) => cur + acc, 0);

                if (clientCount === 0) {
                    msg.channel.send('Keiner online');
                    return;
                }

                let response = '\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n';
                response += `**Benutzer online:** ${clientCount}\n`;

                for (const channel of channels) {
                    const str = TeamspeakPlugin.printChannel(channel);

                    if (str.length === 0) continue;

                    response += `\n${str}`;
                }

                response += '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

                msg.reply(response);
            } catch (err) {
                msg.reply('Da is irgendetwas schief gelaufen 😰. Bitte hau mich nicht 🥺');
            }
        });
    }
}
