module.exports = (discordClient, message, args, services) => {
    services.ts.sendClientList(message);
    return;
}