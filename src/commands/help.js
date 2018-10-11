const commandAliases = require('../../config/command_aliases.json');

module.exports = (discordClient, message, args, services) => {

    if (args.length == 0) {
        services.help.sendCommandOverview(message);
        return;
    }

    for (let i = 0; i < args.length; i++) {
        args[i] = commandAliases[args[i]] || args[i];        
    }

    services.help.sendCommand(message, args.join(' '));
}