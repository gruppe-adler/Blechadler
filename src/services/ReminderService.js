const Sequelize = require('sequelize');

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
            console.log('Database-Connection has been established successfully.');
        }).catch(err => {
            console.error('Unable to connect to the database:', err);
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

    async setTimeoutToNextReminder() {
        let nextremider = await this.db.Reminder.findOne({order:  Sequelize.col('date')});

        // exit if no reminder left        
        if (! nextremider) {
            return;
        }

        let date = nextremider.date;

        let time = date.getTime() - (new Date()).getTime();

        // delete reminder if it is in the past and find a new one again
        // we accept reminders which are up to 10 seconds in the past, because multiple reminders could be at the same date
        if (time < -10000 ) {
            await nextremider.destroy();

            this.setTimeoutToNextReminder();
            return;
        }
        
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        
        this.timeout = setTimeout(this.sendReminder.bind(this), time, nextremider);
    }

    async sendReminder(reminder) {

        let user = await this.discordClient.fetchUser(reminder.userid);

        user.send(`<@${reminder.author}> wanted me to remind you about _${reminder.title}_`);

        // delete the reminder from the db
        await reminder.destroy();
        
        // 
        this.setTimeoutToNextReminder();
    }

    async addReminder(user, date, title, author, message) {
        this.db.Reminder.create({'date': date, 'title': title, 'userid': user, 'author': author}).then((() => {
            message.channel.send(`Ok <@${author}>. Ich werde <@${user}> um ${date.toLocaleString()} an _${title}_ erinnern`);
            this.setTimeoutToNextReminder();
        }).bind(this)).catch(err => {
            message.channel.send(`Ups da ist wohl etwas schief gelaufen.`);
            console.log(err);
        });
    }

    async listReminders(message, user) {
        let reminders = await this.db.Reminder.findAll({where: {'userid': user.id}, order:  Sequelize.col('date')});

        if (reminders.length === 0) {
            message.channel.send(`${user.username} hat keine laufenden Reminder.`);
            return;
        }

        let reminderMessage = `**__Reminder von ${user.username}:__**\n`;
        for (let i = 0; i < reminders.length; i++) {
            let reminder = reminders[i]
            reminderMessage = reminderMessage.concat(`${reminder.date.toLocaleString()} (\`${reminder.id}\`):_${reminder.title}_\n`);
        }

        message.channel.send(reminderMessage);
    }

    async deleteReminder(message, id) {
        let reminder = await this.db.Reminder.findOne({where: {'id': id}});

        if (!reminder) {
            message.channel.send(`Ich habe leider keinen Reminder mit der ID ${id} gefunden.`);
            return;
        }
        
        message.channel.send(`Ok ich habe den Reminder _"${reminder.title}"_ für <@${reminder.userid}> gelöscht.`);

        await reminder.destroy();

        this.setTimeoutToNextReminder();
    }
}