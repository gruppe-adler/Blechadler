import BirthdayService from '../services/BirthdayService';
import BlechadlerPlugin from './Plugin';
import config from '../config';

// RegEx-pattern containing a date in format YYYY-MM-DD, also taking leap-years into account. If there are multiple dates, only the first will match
// The string can contain more characters and will still match the pattern. E.g. 'test1980-12-16test' would still match, as well as '1231980-12-16123'
const DATE_PATTERN = /([0-9]{4}-((0[13-9]|1[012])-(0[1-9]|[12][0-9]|30)|(0[13578]|1[02])-31|02-(0[1-9]|1[0-9]|2[0-8]))|([0-9]{2}(([2468][048]|[02468][48])|[13579][26])|([13579][26]|[02468][048])00)-02-29)/;

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export default class BirthdayPlugin extends BlechadlerPlugin {
    setup(): void {
        const service = new BirthdayService();
        // sending a discord massage in the #general channel, according to the birthdayamounts
        service.on('birthday_detected', birthdays => {
            let msg = '';
            // Adapting the message to fit the amount of Adler that celebrate their birthdays
            if (birthdays.length === 1) msg += `Kramt die Partyhüte raus, denn heute hat <@${birthdays[0].userID}> Geburtstag! 🥳`;
            if (birthdays.length === 2) msg += `Kramt die Partyhüte raus, denn heute haben <@${birthdays[0].userID}> und <@${birthdays[1].userID}> Geburtstag! 🥳`;
            if (birthdays.length > 2) {
                msg += `Kramt die Partyhüte raus, denn heute haben <@${birthdays[0].userID}>`;
                for (let i = 1; i < birthdays.length - 1; i++) {
                    msg += `, <@${birthdays[i].userID}>`;
                }
                msg += ` und <@${birthdays[birthdays.length - 1].userID}> Geburtstag! 🥳`;
            }
            // send the message in #general
            for (const channel of config.birthdays.discordChannelIDs) {
                this.blechadler.sendMessageToChannel(channel, msg);
            }
        });

        this.blechadler.registerHelpMessage(
            'Antworte auf diese Nachricht, um den Geburtstag eines Adlers hinzuzufügen\nDie Antwort muss Folgendes enthalten:\n- Ein Geburtsdatum im Format YYYY-MM-DD (z.B. 1950-03-10 für den 10. März 1950)\n- Eine mention/tag des Adlers, der hinzugefügt werden soll. Z.B. <@681498875621670964>',
            {},
            async msg => {
                const dateMatches = msg.content.match(DATE_PATTERN);

                if (dateMatches === null) {
                    await msg.reply('Du musst mir schon ein gescheites Datum geben, du Dulli!');
                    return;
                }
                const birthDate = dateMatches[0];

                const user = msg.mentions.users.find(user => user.id !== this.blechadler.discordClientId);

                if (!user) {
                    await msg.reply('Du musst mir schon sagen wessen Geburtstag das ist, du Dulli!');
                    return;
                }

                try {
                    service.addBirthdayEntry(user.id, birthDate, user.username);

                    const d = new Date(birthDate);

                    await msg.reply(`Ich hab mir gemerkt, dass <@${user.id}> am ${d.getDate().toString().padStart(2, '0')}. ${MONTHS[d.getMonth()]} ${d.getFullYear()} Geburtstag hat!`);
                } catch (err) {
                    await msg.reply('Da is irgendetwas schief gelaufen. Laut meinen Unterlagen, ist <@107865644791246848> dafür verantwortlich!');
                }
            }
        );
    }
}
