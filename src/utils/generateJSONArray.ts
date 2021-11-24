import * as fs from 'fs';

/**
 * Generate array, which will be automatically synched with json file.
 * @param {string} path Path to JSON file
 * @returns {T[]} Proxied Array
 */
export default function generateJSONArray<T> (path: string): T[] {
    let arr: T[] = [];

    if (fs.existsSync(path)) {
        arr = JSON.parse(fs.readFileSync(path, 'utf-8'));
    }

    return new Proxy(arr, {
        set (target, property, value) {
            target[property] = value;
            const json = JSON.stringify(target, null, 4);
            fs.writeFileSync(path, json, 'utf8');
            return true;
        }
    });
}
