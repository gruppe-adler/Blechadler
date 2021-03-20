import LeetService from '../services/LeetService';
import BlechadlerPlugin from './Plugin';
import config from '../config';

interface LEETMsgEntry {
    userID: string,
    name: string,
    timestamp: number
}

const REACTION_ARRAY = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const LEET_HOUR = 12;
const LEET_MINUTE = 38;

export default class LeetPlugin extends BlechadlerPlugin {
    private dayArray: LEETMsgEntry[] = [];
    private service = new LeetService();

    setup(): void {
        this.blechadler.subscribeToMessages(
            msg => {
                const date = new Date(msg.createdTimestamp);
                return date.getHours() === LEET_HOUR && date.getMinutes() === LEET_MINUTE && msg.content.includes('1337') && !this.dayArray.some(entry => (entry.userID === msg.author.id));
            },
            config.leet.discordChannelIDs,
            msg => {
                if (this.dayArray.length === 0) {
                    // This is the first msg. for 13:37 of the day -> add a timeout to run evaluateDay at 13:38
                    const date = new Date(msg.createdTimestamp);
                    setTimeout(() => this.evaluateDay(), (62 - date.getSeconds()) * 1000);
                }

                const entry: LEETMsgEntry = {
                    userID: msg.author.id,
                    name: msg.author.username,
                    timestamp: msg.createdTimestamp
                };

                const placement = this.dayArray.push(entry);
                if (placement <= REACTION_ARRAY.length) {
                    msg.react(REACTION_ARRAY[placement - 1]);
                }
                if (placement > 3) {
                    msg.react('🐌');
                }
            }
        );

        this.blechadler.subscribeToMessages(
            msg => {
                return msg.content.includes('!myLeetRank');
            },
            config.leet.discordChannelIDs,
            msg => {
                const ranking = this.service.getLeetEntry(msg.author.id, msg.author.username);
                const timeSend = new Date(msg.createdTimestamp);

                if (timeSend.getHours() === LEET_HOUR && timeSend.getMinutes() === LEET_MINUTE) {
                    msg.reply('Geduldige dich doch wenigstens, bis der heutige Durchlauf fertig ist, du Bobo!');
                    return;
                }

                if (ranking.points === 0) {
                    msg.reply('Du hast entweder noch nie teilgenommen, oder es nie aufs Treppchen geschafft, du Looser!');
                    return;
                }

                const sortedPoints = this.service.getSortedPoints();
                const index = sortedPoints.findIndex(points => points === ranking.points);
                if (index === -1) {
                    msg.reply('Ich habe aktuell keine Verbindung zum Teamspeak 😰. Bitte hau mich nicht 🥺');
                    return;
                }
                msg.reply(`Du befindest dich im Moment auf Platz **${index + 1}** mit ${ranking.points} Punkten (${ranking.gold} x Gold, ${ranking.silver} x Silber und ${ranking.bronze} x Bronze)`);
            }
        );
    }

    /**
     * Updates the leet-rankings according to todays entries.
     */
    private evaluateDay() {
        const theWorthy = this.dayArray.slice(0, 3);

        theWorthy.forEach((entry, index) => {
            const ranking = this.service.getLeetEntry(entry.userID, entry.name);
            switch (index) {
            case 0:
                ranking.gold++;
                break;
            case 1:
                ranking.silver++;
                break;
            case 2:
                ranking.bronze++;
            }
            this.service.updateLeetEntry(entry.userID, entry.name, ranking.gold, ranking.silver, ranking.bronze);
        });

        this.dayArray = [];
    }
}
