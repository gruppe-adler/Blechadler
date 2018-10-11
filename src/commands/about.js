const packageInfo = require('../../package.json');

module.exports = (discordClient, message, args, services) => {

    message.channel.send(`${message.author}`, {
        "embed": {
          "color": 13733151,
          "author": {
              "name": discordClient.user.username,
              "icon_url": discordClient.user.avatarURL,
              "url": "http://github.com/gruppe-adler/Blechadler"
            },
            "footer": {
                "icon_url": discordClient.user.avatarURL,
                "text": "http://github.com/gruppe-adler/Blechadler",
          },
          "fields": [
                {
                    "name": "Name",
                    "value": packageInfo.name
                },
                {
                    "name": "Version",
                    "value": packageInfo.version
                },
                {
                    "name": "Beschreibung",
                    "value": packageInfo.description
                },
            ]
        }
    });
}