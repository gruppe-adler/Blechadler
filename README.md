# Blechadler
Blech + Adler = Blechadler | A discord bot

## Installation
- Clone this repository to a location of your choice
- Run `npm install`
- Copy `auth_sample.json` to `auth.json`
- Fill in your discord bot client token and ts server query credentials into this config file
- Review `config.json` and make sure `serverip`, `port`, `sid` (virtual server id), `category` and `noticesTargetChannel` match your preferences
- Run `npm start`

### Needed Teamspeak permissions
The server query account needs at least this permissions
- `b_serverquery_login`
- `b_serverinstance_version_view`
- `b_virtualserver_select`
- `b_virtualserver_notify_register`
- `b_virtualserver_channel_list`
- `b_virtualserver_client_list`
- `i_channel_subscribe_power`
- `i_channel_needed_subscribe_power`

### Needed Discord permissions
For the channel feature to work the Blechadler needs the `Manage Permissions` for the channels category.

## Direct commands
All commands have to begin with the specified command symbol (`!` per default)
- `ts`: Displays all active teamspeak clients with a channel list. Needs to be issued from a channel specified in `noticesTargetChannel`

## Mention commands
All commands have to be writted down directly after the bot's mention. Message has to start with the mention.
- `about`: Displays the version, description and name of the bot
- `channel`: Same as direct command
- `help`: Displays help to all commands / a specific command
- `pick`: Picks a random answer from the given choices
- `reminder`: Remind a user about something
- `strich`: Add a "strich" to a user
- `striche`: List all "striche"
- `teamspeak`: Same as direct command

## Extras
- You can add aliases for all commands, by editing the command_aliases.json, with the key beeing th alias and the value beeing the command it should refer to.
- You can disable commands by removig them from the commands array in the config. Each command matches one JavaScript file in src/commands
