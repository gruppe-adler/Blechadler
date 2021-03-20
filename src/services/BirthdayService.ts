import { EventEmitter } from 'events';
import * as path from 'path';
import generateJSONArray from '../utils/generateJSONArray';

interface BirthdayEntry {
    userID: string;
    // in format YYYY-MM-DD
    birthDate: string;
    name: string;
}

const BIRTHDAYS_PATH = path.resolve(__dirname, '../../config/birthdays.json');

export default class BirthdayService extends EventEmitter {
    private birthdays: BirthdayEntry[];
    private checkHour: number;

    /**
     * Creates a new BirthdayService instance.
     *
     * @param hourToCheck At which hour of the day, the check for birthdays should take place.
     */
    constructor(private hourToCheck: number = 7) {
        super();
        this.checkHour = hourToCheck;
        // Converting all birthDate strings into actual dates
        this.birthdays = generateJSONArray(BIRTHDAYS_PATH);
        this.startCheckCycle();
    }

    /**
     * Starts the periodical check for birthdays
    */
    private startCheckCycle(): void {
        // schedule the first check for 0800
        setTimeout(() => {
            this.checkForBirthdays();
            // repeat the check every 24 hours
            setInterval(this.checkForBirthdays, 1000 * 60 * 60 * 24);
        }, this.timeUntilFirstCheck);
    }

    /**
     * Calculates the time until the next Birthday-Check.
     *
     * @returns The time until the next check in milliseconds.
     */
    private get timeUntilFirstCheck(): number {
        const now = new Date();
        const currentDay = new Date();
        currentDay.setHours(this.checkHour);
        currentDay.setMinutes(0);
        currentDay.setSeconds(0);
        currentDay.setMilliseconds(0);
        // if its already past 8 o'clock, schedule the next check for 8 o'clock the coming day
        if (currentDay.getTime() < now.getTime()) {
            currentDay.setTime(currentDay.getTime() + 1000 * 60 * 60 * 24);
        }

        return (currentDay.getTime() - now.getTime());
    }

    /**
     * Emits a 'birthday_detected' event, containing all userIDs and birthDates of Adler that celebrate their birthday on the current day.
     * If no birthday is taking place, no event is emitted.
     */
    private checkForBirthdays(): void {
        const currentDate = new Date();
        // filter all Birthdays to return only entries, where the currentDate is a birthday
        const filteredBirthdays = this.birthdays.filter(({ birthDate }) => {
            const date = new Date(birthDate);
            return (date.getDate() === currentDate.getDate() && date.getMonth() === currentDate.getMonth());
        });
        // if it's no ones birthday, exit the function...
        if (filteredBirthdays.length === 0) return;
        // ... otherwise, emit a 'birthday detected' event and pass the birthdays as parameters
        this.emit('birthday_detected', filteredBirthdays);
    }

    /**
     * Adds a new entry to the birthdays.json config.
     *
     * @param userID The discord-ID of the Adler
     * @param birthDate The Adlers date of birth
     * @param name The username of the Adler
     */
    public addBirthdayEntry (userID: string, birthDate: string, name: string): void {
        // check if the entry already exists
        const index = this.birthdays.findIndex(entry => entry.userID === userID);

        const entry: BirthdayEntry = { userID, birthDate, name };

        if (index === -1) {
            this.birthdays.push(entry);
        // ...or update the birthdates
        } else {
            this.birthdays[index] = entry;
        }
    }
}
