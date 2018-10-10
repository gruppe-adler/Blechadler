const Utils = require('../services/Utils');

module.exports = (discordClient, message, args, services) => {

    if (args.length == 0) {
        services.help.sendCommandOverview(message);
        return;
    }

    services.help.sendCommand(message, args.join(' '));
}