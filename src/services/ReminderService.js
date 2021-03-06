const Sequelize = require('sequelize');
const Utils = require('./Utils');

module.exports = class StricheService {

    constructor (client) {
        this.discordClient = client;
        this.setupDatabase();
        this.setTimeoutToNextReminder();
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
            console.log(`Database-Connection has been established successfully. (${Utils.getDateTime()})`);
        }).catch(err => {
            console.error(`Unable to connect to the database:`, err);
        });
        
        this.db.Reminder = this.db.define('reminder', {
            date: {
                type: Sequelize.DATE
            },
            title: {
                type: Sequelize.STRING,
                allowNull: true
            },
            userid: {
                type: Sequelize.STRING
            },
            author: {
                type: Sequelize.STRING
            }
        });
        this.db.Reminder.sync();
    }

    /**
     * Reset the timeout to the next reminder. A reminder is sent upon timeout completion
     */
    async setTimeoutToNextReminder() {

        // find one reminder. Oder by date, so we get the next reminder
        let nextremider = await this.db.Reminder.findOne({order:  Sequelize.col('date')});

        // exit if no reminder left        
        if (! nextremider) {
            return;
        }

        // calculate time in miliseconds between now an the dateTime of the reminder
        let date = nextremider.date;
        let timeToReminder = date.getTime() - (new Date()).getTime();

        // delete reminder if it is in the past and find a new one again
        // we accept reminders which are up to 10 seconds in the past, because multiple reminders could be at the same date
        if (timeToReminder < -10000 ) {
            // delete reminder of the past
            await nextremider.destroy();

            // try again
            this.setTimeoutToNextReminder();
            return;
        }

        
        // delete timeout if there is one already
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        

        // setTimeout uses a 32 bit integer to store the timeout. If the time to the next reminder is 
        // too big -> Set the timeout to the max value and then try to set the timeout again.
        if (timeToReminder >= Math.pow(2,31)) {
            this.timeout = setTimeout(this.setTimeoutToNextReminder.bind(this), Math.pow(2,31) - 1);
            return;
        }
        
        this.timeout = setTimeout(this.sendReminder.bind(this), timeToReminder, nextremider);
    }

    /**
     * Triggered by timeout. Sends a reminder personal message to recipient
     * @param {Object} reminder
     */
    async sendReminder(reminder) {

        // fetch user from discord
        let user = await this.discordClient.fetchUser(reminder.userid);

        try {
            user.send(`<@${reminder.author}> wanted me to remind you about _${reminder.title}_`);
        } catch(err){};

        // delete the reminder from the db
        await reminder.destroy();
        
        // reset timeout
        this.setTimeoutToNextReminder();
    }

    /**
     * Add a reminder 
     * @param {Discord.User} user user
     * @param {Date} date reminder date
     * @param {String} title reminder title
     * @param {Discord.User} user user
     * @param {Discord.Message} message 
     */
    async addReminder(user, date, title, author, message) {

        this.db.Reminder.create({'date': date, 'title': title, 'userid': user, 'author': author}).then((() => {
            if (user==author) {
                message.channel.send(`Ok <@${author}>. Ich werde dich um ${date.toLocaleString()} an _${title}_ erinnern`);
            } else {
                message.channel.send(`Ok <@${author}>. Ich werde <@${user}> um ${date.toLocaleString()} an _${title}_ erinnern`);
            }

            // reset timeout
            this.setTimeoutToNextReminder();
        }).bind(this)).catch(err => {
            message.channel.send(`Ups da ist wohl etwas schief gelaufen.`);
            console.error(`Error adding reminder (${Utils.getDateTime()}):`, err);
        });
    }
   
    /**
     * List all reminders for given user. 
     * @param {Discord.Message} message 
     * @param {Discord.User} user user
     */
    async listReminders(message, user) {

        // fetch all reminders from database
        let reminders = await this.db.Reminder.findAll({where: {'userid': user.id}, order:  Sequelize.col('date')});

        // if user has no reminders
        if (reminders.length === 0) {
            message.channel.send(`${user.username} hat keine laufenden Reminder.`);
            return;
        }

        let fields = [];
        for (let i = 0; i < reminders.length; i++) {
            let reminder = reminders[i];

            fields.push({
                "name": reminder.title,
                "value": `_${reminder.date.toLocaleString()}_ (\`${reminder.id}\`)`
            })
        }

        message.channel.send(`${message.author} ${user.username} hat ${reminders.length} laufende Reminder:`, {
            "embed": {
              "color": 13733151,
              "author": {
                "name": user.username,
                "icon_url": user.avatarURL
              },
              "fields": fields
            }
        });
    }

    /**
     * Deletes reminder with given id
     * @param {Discord.Message} message 
     * @param {String | Number} id reminder id
     */
    async deleteReminder(message, id) {
        let reminder = await this.db.Reminder.findOne({where: {'id': id}});

        // check wether reminder exists
        if (!reminder) {
            message.channel.send(`Ich habe leider keinen Reminder mit der ID ${id} gefunden.`);
            return;
        }

        // make sure user who is attemting to delete reminder is authorized (either reminder author / reminded person)
        if (reminder.userid != message.author.id && reminder.author != message.author.id) {
            message.channel.send(`Halt Stopp. Das bleibt alles so wie es ist!!1 Du darfst den Reminder mit der ID ${id} ned anfassen.`);
            return;
        }
        
        message.channel.send(`Ok ich habe den Reminder _"${reminder.title}"_ f??r <@${reminder.userid}> gel??scht.`);

        // delete reminder from database
        await reminder.destroy();

        // reset timeout
        this.setTimeoutToNextReminder();
    }
}