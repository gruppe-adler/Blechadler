const Sequelize = require('sequelize');
const Utils = require('./Utils');

module.exports = class StricheService {

    constructor (client) {
        this.discordClient = client;
        this.setupDatabase();
    }

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
    }

    
    async sendStricheOverview(message) {
        let striche = await this.getStriche();

        let text = `**__Striche:__**\n`;
        for (let id in striche) {
            let user = `<@${id}>`;
            let amount = striche[id];

            text = text.concat(`${user} : ${amount}\n`);
        }
        message.channel.send(text);
    }

    async sendUserStriche(message, user) {
        let striche = await this.getStriche(user.id);

        if (striche.length === 0) {
            message.channel.send(`Sieht so aus als ob ${user.username} noch keine Striche hat. ${Utils.getEmoji(message.guild, 'zade')}`);

            message.author = this.discordClient.user;
            this.addStrich(message, user, 'Weil er noch keine Striche hatte.')
            return;
        }

        let stricheMessage = `**__Striche von ${user.username}:__**\n`;
        for (let i = 0; i < striche.length; i++) {
            let strich = striche[i].get();

            stricheMessage = stricheMessage.concat(`Strich von <@${strich.executionerid}> _"${strich.reason}"_ (${strich.createdAt.toLocaleString()})\n`);            
        }
        message.channel.send(stricheMessage);

    }

    async getStriche(argUserid) {

        //return striche for single user with reason 
        if (argUserid) {
            return await this.db.Strich.findAll({where:{"userid": argUserid}});
        }

        let distinctusers = await this.db.Strich.aggregate('userid', 'DISTINCT', { plain: false });
        
        let usersWithCount = {};
        for (let index = 0; index < distinctusers.length; index++) {
            let user = distinctusers[index];
            let id = user.DISTINCT;
            let count = await this.db.Strich.count({where: {"userid": id}});
        
            usersWithCount[id] = count;
        }
        
        return usersWithCount;
    }

    addStrich(message, user, reason) {

        if (reason == '') {
            reason = 'weil Baum'
        }

        let id = user.id;
        let executioner = message.author.id;
        this.db.Strich.create({'userid': id, 'reason': reason, 'executionerid': executioner}).then(() => {
            message.channel.send(`Ein Strich für ${user.username} _"${reason}"_`);
        }).catch(err => {
            message.channel.send(`Ups da ist wohl etwas schief gelaufen.`);
            console.log(err);
        })
    }


}