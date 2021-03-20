import { EventEmitter } from 'events';
import * as path from 'path';
import generateStore from '../utils/generateJSONArray';

export interface LeetEntry {
    userID: string;
    name: string;
    gold: number;
    silver: number;
    bronze: number;
    points: number
}

const LEET_RANKINGS_PATH = path.resolve(__dirname, '../../config/leetRankings.json');

export default class LeetService extends EventEmitter {
    private leetRankings: LeetEntry[];
    private leetCheckHour: number;
    private leetCheckMinute: number;

    /**
     * Creates a new LeetService instance.
     *
     */
    constructor() {
        super();
        this.leetRankings = generateStore(LEET_RANKINGS_PATH);
    }

    /**
     * Getter-Method for all Leet-Rankings.
     * @returns a LeetEntry-Array, with all existing rankings
     */
    public getAllLeetEntries (): LeetEntry[] {
        return this.leetRankings;
    }

    /**
     * Getter-Method for a specific LeetEntry.
     *
     * @param userID The userID of an entry
     * @param name The name of the user
     * @returns The users' LeetEntry
     */
    public getLeetEntry (userID: string, name: string): LeetEntry {
        let index = this.leetRankings.findIndex(entry => entry.userID === userID);
        if (index === -1) {
            this.updateLeetEntry(userID, name, 0, 0, 0);
            index = this.leetRankings.findIndex(entry => entry.userID === userID);
        }
        return this.leetRankings[index];
    }

    /**
     * Adds a new entry to the leetRankings.json config and updates the array of the leetService instance.
     *
     * @param userID The discord-ID of the user
     * @param name The username of the user
     * @param gold The amount of first-medals
     * @param silver The amount of silver-medals
     * @param bronze The amount of bronze-medals
     */
    public updateLeetEntry (userID: string, name: string, gold: number, silver: number, bronze: number): void {
        // check if the entry already exists
        const index = this.leetRankings.findIndex(entry => entry.userID === userID);
        // push the new entry to both Ranking entries...
        if (index === -1) {
            const points = 3 * gold + 2 * silver + bronze;
            this.leetRankings.push({ userID, name, gold, silver, bronze, points });
        // ...or update the rankings
        } else {
            this.leetRankings[index] = {
                gold,
                silver,
                bronze,
                userID,
                name,
                points: 3 * gold + 2 * silver + bronze
            };
        }
    }

    /**
     * Getter-Method for all points-entries of the LeetEntry Array.
     *
     * @returns All LeetEntry-Points in descending order and with 0-values removed
     */
    public getSortedPoints(): number[] {
        const allPoints = [];

        const allRanks = this.getAllLeetEntries();
        allRanks.forEach(entry => {
            allPoints.push(entry.points);
        });

        // removing all entries with 0 points
        for (let i = 0; i < allPoints.length; i++) {
            if (allPoints[i] === 0) {
                allPoints.splice(i, 1);
            }
        }

        const sortedPoints = allPoints.sort((a, b) => { return b - a; });
        return sortedPoints;
    }
}
