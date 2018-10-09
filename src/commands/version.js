const packageInfo = require('../../package.json');

module.exports = (discordClient, message, args, services) => {
    message.channel.send(`${packageInfo.name} Version ${packageInfo.version}`);
    return;
}