const Sequelize = require('sequelize');
const Utils = require('./Utils');

module.exports = class StricheService {

    constructor (client) {
        this.discordClient = client;
        this.setupDatabase();
    }

    /**
     * Set up the database connection
     */
    setupDatabase() {
        this.db = new Sequelize('', '', '', {
            dialect: 'sqlite',
            // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
            operatorsAliases: false,
        
            logging: false,
        
            // SQLite only
            storage: './db/database.sqlite'
        });
        
        this.db.authenticate().then(() => {
            console.log('Database-Connection has been established successfully.');
        }).catch(err => {
            console.error('Unable to connect to the database:', err);
        });
        
        this.db.Strich = this.db.define('strich', {
            userid: {
                type: Sequelize.STRING
            },
            reason: {
                type: Sequelize.STRING,
                allowNull: true
            },
            executionerid: {
                type: Sequelize.STRING
            }
        });
        this.db.Strich.sync();

        this.cacheUsers();
    }

    /**
     * Sends overview of the striche of all users
     * @param {Discord.Message} message
     */
    async sendStricheOverview(message) {
        let striche = await this.getAllStriche();

        //if there is no user with Striche
        if (Object.getOwnPropertyNames(striche).length === 0) {
            message.channel.send(`Sieht so aus als ob hier noch keiner Striche verteilt hat ${Utils.getEmoji(message.guild, 'zade')}`);
            return;
        }

        let text = `**__Striche:__**\n`;
        for (let id in striche) {
            let user = (await this.discordClient.fetchUser(id)).username;
            let amount = striche[id];

            text = text.concat(`${user} : ${amount}\n`);
        }
        message.channel.send(text);
    }

    /**
     * Sends overview of the striche with the stated reason of a single user 
     * @param {Discord.Message} message
     * @param {Discord.User} user
     */
    async sendUserStriche(message, user) {

        //get the users Striche
        let striche = await this.getUserStriche(user.id);

        //give first Strich if user has none already
        if (striche.length === 0) {
            message.channel.send(`Sieht so aus als ob ${user.username} noch keine Striche hat. ${Utils.getEmoji(message.guild, 'zade')}`);

            message.author = this.discordClient.user;
            this.addStrich(message, user, 'Weil er noch keine Striche hatte.')
            return;
        }

        let stricheMessage = `**__Striche von ${user.username}:__**\n`;
        for (let i = 0; i < striche.length; i++) {
            let strich = striche[i].get();
            let executioner = (await this.discordClient.fetchUser(strich.executionerid)).username;

            stricheMessage = stricheMessage.concat(`Strich von ${executioner} _"${strich.reason}"_ (${strich.createdAt.toLocaleString()})\n`);            
        }

        message.channel.send(stricheMessage);
    }

    /**
     * Returns the amount of Striche each user has
     * @returns {Object}
     */
    async getAllStriche() {

        // get all users which have Striche
        let distinctusers = await this.db.Strich.aggregate('userid', 'DISTINCT', { plain: false });
        
        // get the amount of Striche for every user
        let usersWithCount = {};
        for (let index = 0; index < distinctusers.length; index++) {
            let user = distinctusers[index];
            let id = user.DISTINCT;
            let count = await this.db.Strich.count({where: {"userid": id}});
        
            usersWithCount[id] = count;
        }
        
        return usersWithCount;
    }

    /**
     * Returns all Striche from a single user
     * @param {String} userId
     * @returns {Object}
     */
    async getUserStriche(userId) {
        return await this.db.Strich.findAll({where:{"userid": userId}});
    }

    /**
     * Add a strich to a user
     * @param {Discord.Message} message
     * @param {Discord.User} userId
     * @param {String} reason
     */
    addStrich(message, user, reason) {

        if (!reason || reason == '') {
            reason = 'weil Baum'
        }

        let id = user.id;
        let executioner = message.author.id;
        this.db.Strich.create({'userid': id, 'reason': reason, 'executionerid': executioner}).then(() => {
            message.channel.send(`Ein Strich für ${user.username} _"${reason}"_`);
        }).catch(err => {
            message.channel.send(`Ups da ist wohl etwas schief gelaufen.`);
            console.log(err);
        });

        // fetch the users from discord to make sure they are cached
        this.discordClient.fetchUser(id, true);
        this.discordClient.fetchUser(executioner, true);
    }

    /**
     * Called from constructor. 
     * Fetches all user from Discord, which are referenced in striche-DB to cache them to allow faster answers from blechadler
     */
    cacheUsers() {
        this.db.Strich.findAll().then(striche => {
            striche.forEach(strich =>{
                this.discordClient.fetchUser(strich.userid, true);
                this.discordClient.fetchUser(strich.executionerid, true);
            });
        });
    }


}