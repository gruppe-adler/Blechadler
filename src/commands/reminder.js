const Discord = require('discord.js');

module.exports = (discordClient, message, args, services) => {

    if (args.length == 0) {
        services.reminder.listReminders(message, message.author);
        return;
    }

    // message matches "remind(er)? <MENTION>" -> list all reminder for a user
    if (args.length == 1 && args[0].match(Discord.MessageMentions.USERS_PATTERN)) {
        let user = message.mentions.users.find(user => (user.id != discordClient.user.id));
        services.reminder.listReminders(message, user);

        return;
    }

    // message matches 'reminder(er)? delete 1' -> delete reminder
    if (args.length == 2 && args[0].match(new RegExp(`(delete|remove)`,'i'))) {

        let reminderId = args[1];

        services.reminder.deleteReminder(message, reminderId);

        return;
    }


    let authorid = message.author.id;
    let userid = authorid;

    // if there is a mention in the beginning remove it from the args array
    if (args[0].match(Discord.MessageMentions.USERS_PATTERN)) {
        userid = args.shift().replace(/^<@!?/i, '').replace(/>.*$/i, '');
    }

    let dateString = null;
    let timeString = null;

    // parse out date (if there is one)
    if (args[0].match(/^\d{4}(\-|\.)\d{2}(\-|\.)\d{2}$/i)) {
        dateString = args.shift();
    }

    // parse out time
    if (args[0].match(/^\d{2}\:\d{2}$/i)) {
        timeString = args.shift();
    }

    // check wether any time / date was given
    if (!dateString && !timeString) {
        message.channel.send(`${message.author} Da hast du wohl irgendwa falsch gemacht.`);
        services.help.sendCommand(message, "reminder");
        return;
    }

    if (args.length == 0) {
        message.channel.send(`${message.author} Da hast du wohl irgendwa falsch gemacht.`);
        services.help.sendCommand(message, "reminder");
        return;
    }
    
    dateString = dateString || (new Date()).toDateString();    
    timeString = timeString || '09:00';
    let date = new Date(dateString.concat(' ').concat(timeString));

    // check if date is invalid
    if (isNaN(date)) {
        message.channel.send(`${message.author} Ich kann das Datum leider nicht lesen :(`);
        services.help.sendCommand(message, "reminder");
        return;
    }

    // user is not in guild
    if (! message.guild.member(userid)) {
        message.channel.send(`${message.author} Du kannst keine Erinnerungen für User anlegen, die nicht hier sind.`);
        return;
    }

    // requested date is in the past
    if (date.getTime() < (new Date()).getTime()) {
        message.channel.send(`Ehh ${message.author} du Held. Ich kann dich schlecht an einem vergangenen Zeitpunkt erinnern. Seh ich wie Marty McFly aus oder was?`);
        return;
    }

    // the rest of the args is the title
    let title = args.join(' ');

    services.reminder.addReminder(userid, date, title, authorid, message);

}