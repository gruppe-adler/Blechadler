module.exports = (discordClient, message, args, services) => {

    // if a user is mentioned 
    let user = message.mentions.users.find(user => (user.id != discordClient.user.id));
    if (user) {       
        services.striche.sendUserStriche(message, user);

        return;
    }

    services.striche.sendStricheOverview(message);
    return;
}