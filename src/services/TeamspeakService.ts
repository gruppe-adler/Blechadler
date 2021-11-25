import { EventEmitter } from 'events';
import { ChannelListResponseData, ClientListResponseData, TeamSpeakClient } from 'node-ts';
export enum TeamspeakUserType {
    Normal = 0,
    Query = 1
}

export interface TeamspeakUser {
    id: number
    nickname: string
    type: TeamspeakUserType
    new: boolean
    idleTime: number
    channelId: number
}

export interface TeamspeakChannel {
    name: string
    users: TeamspeakUser[]
    channels: TeamspeakChannel[]
}

declare interface TeamspeakService {
    on: ((event: 'connected', listener: (user: TeamspeakUser) => void) => this) & ((event: 'disconnected', listener: (user: TeamspeakUser) => void) => this) & ((event: 'query_connected', listener: () => void) => this) & ((event: 'query_disconnected', listener: () => void) => this) & ((event: 'error', listener: (err: Error) => void) => this) & ((event: string | symbol, listener: (...args: any[]) => void) => this)
}

class TeamspeakService extends EventEmitter {
    /**
     * TS Query Client
     */
    private readonly query: TeamSpeakClient;

    /**
     * Username cache client-id -> nickname
     */
    private readonly userCache = new Map<number, TeamspeakUser>();

    private connected = false;

    /**
     * Initial config
     */
    private readonly config: {
        ip: string
        port: number
        sid: number
        username: string
        password: string
        queryTimeout: number
    };

    /**
     * Current query reconnect timeout.
     * This will increase with multiple consecutively reconnect attempts.
     */
    private queryTimeout: number;

    /**
     * @param ip Server IP
     * @param port Server Port
     * @param sid Server ID
     * @param username Username
     * @param password Password
     * @param queryTimeout Initial query reconnect timeout
     */
    constructor (ip: string, port: number, sid: number, username: string, password: string, queryTimeout = 500) {
        super();

        this.config = { ip, port, sid, username, password, queryTimeout };

        this.queryTimeout = queryTimeout;

        this.query = new TeamSpeakClient(ip, port);

        void this.connectToQuery();

        // we'll try to cache usernames every 60 seconds
        // to make sure we won't miss any nickname changes
        setInterval(() => { void this.cacheUsers(); }, 60 * 1000);
        this.query.setTimeout(65 * 1000);

        // callback when query reports client joining
        this.query.on('cliententerview', clients => {
            clients.forEach(async client => {
                try {
                    // we don't get a full client when notified so we'll have to retrieve the full client info
                    const { response: fullClientList } = await this.query.send('clientinfo', { clid: client.clid });
                    if (fullClientList.length === 0) return;
                    const fullClient = fullClientList[0];

                    const user = TeamspeakService.queryUserToTeamspeakUser(fullClient);

                    this.userCache.set(client.clid, user);

                    this.emit('connected', user);
                } catch (err) {

                }
            });
        });

        // callback when query reports client leaving
        this.query.on('clientleftview', clients => {
            clients.forEach(client => {
                const user = this.getUserForId(client.clid);

                if (user === null) return;

                this.userCache.delete(user.id);
                this.emit('disconnected', user);
            });
        });

        this.query.on('close', () => {
            this.connected = false;
            this.emit('query_disconnected');
            console.log(`[TS3 SERVICE] Trying to reconnect in ${this.queryTimeout / 1000}s`);
            setTimeout(() => { void this.connectToQuery(); }, this.queryTimeout);
            this.queryTimeout *= 2;
        });

        this.query.on('error', err => this.emit('error', err));
    }

    /**
     * Attempt connect to query
     */
    private async connectToQuery (): Promise<void> {
        if (this.connected) return;

        try {
            await this.query.connect();

            await this.query.send('use', { sid: this.config.sid });

            await this.query.send('login', {
                client_login_name: this.config.username,
                client_login_password: this.config.password
            });

            await this.query.subscribeServerEvents();

            this.connected = true;
            this.queryTimeout = this.config.queryTimeout;
            this.emit('query_connected');
        } catch (err) {
            // Intentionally do nothing, because this.query.close handler will attempt reconnect
        }

        void this.cacheUsers();
    }

    /**
     * This method is called periodically and caches all users
     */
    private async cacheUsers (): Promise<void> {
        try {
            const users = await this.getUsers(true);

            for (const user of users) {
                this.userCache.set(user.id, user);
            }
        } catch (err) {
            // Intentionally do nothing... it's not that bad if we fail
        }
    }

    /**
     * Get user by client id (clid)
     * @param id Client Id
     */
    private getUserForId (id: number): TeamspeakUser|null {
        return this.userCache.get(id) ?? null;
    }

    /**
     * Compares a past unix timestamp with the current time and returns the difference in milliseconds
     * @param unixTimestamp
     * @returns {boolean}
     */
    private static isNewUser (unixTimestamp: number): boolean {
        const date = new Date(unixTimestamp * 1000);
        const now = new Date();
        const dif = now.getTime() - date.getTime();
        return dif < 3000;
    }

    /**
     * Convert data recieved from query to TeamspeakUser
     * @param {ClientListResponseData} data Query data
     * @returns {TeamspeakUser} User
     */
    private static queryUserToTeamspeakUser (data: ClientListResponseData): TeamspeakUser {
        return {
            nickname: data.client_nickname,
            id: data.clid,
            type: data.client_type,
            new: TeamspeakService.isNewUser(data.client_created),
            idleTime: data.client_idle_time,
            channelId: data.cid
        };
    }

    /**
     * Get all users
     * @param {boolean} returnQueryUsers Return query users (default: false)
     * @returns {Promise<TeamspeakUser[]>} users
     */
    public async getUsers (returnQueryUsers = false): Promise<TeamspeakUser[]> {
        const clientList = await this.query.send('clientlist', { '-info': '', '-times': '' });

        if (!returnQueryUsers) {
            clientList.response = clientList.response.filter(c => c.client_type !== 1);
        }

        const users = clientList.response.map(TeamspeakService.queryUserToTeamspeakUser);

        return users;
    }

    /**
     * Get all channels
     * @returns {Promise<TeamspeakChannel[]>} channels
     */
    public async getChannels (): Promise<TeamspeakChannel[]> {
        const { response: queryChannels } = await this.query.send('channellist', {}, []);
        const usersPromise = this.getUsers();

        // sort channels by parent id
        const channelsByParent = new Map<number, ChannelListResponseData[]>();
        for (const channel of queryChannels) {
            const pid = channel.pid;

            if (channelsByParent.has(pid)) {
                channelsByParent.get(pid)?.push(channel);
            } else {
                channelsByParent.set(pid, [channel]);
            }
        }

        // sort users by channel id
        const users = await usersPromise;
        const userByChannel = new Map<number, TeamspeakUser[]>();
        for (const user of users) {
            const cid = user.channelId;

            if (userByChannel.has(cid)) {
                userByChannel.get(cid)?.push(user);
            } else {
                userByChannel.set(cid, [user]);
            }
        }

        const getChildChannels = (id: number): TeamspeakChannel[] => (channelsByParent.get(id) ?? []).map((data: ChannelListResponseData): TeamspeakChannel => ({
            name: data.channel_name,
            users: userByChannel.get(data.cid) ?? [],
            channels: getChildChannels(data.cid)
        }));

        return getChildChannels(0);
    }

    /**
     * Getter for connected
     */
    public get isConnected (): boolean {
        return this.connected;
    }
}

export default TeamspeakService;
