module.exports = (discordClient, message, args, services) => {
    
    if (args.length == 0) {
        services.help.sendCommand(message, "pick");
        return;
    }

    let pick = args[Math.floor(Math.random() * args.length)];
    
    //if there is an a-10 pick the a-10 :P
    if (message.content.match(/a\-?10/i)) {
        pick = args.find(option => option.match(/a\-?10/i));
    }

    message.channel.send(`${message.author} Also ich wär für **${pick}**`);
    
}