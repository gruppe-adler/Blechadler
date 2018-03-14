# Blechadler
Blech + Adler = Blechadler | A discord bot

## Installation
- Clone this repository to a location of your choice
- Run `npm install`
- Copy `auth_sample.json` to `auth.json`
- Fill in your discord bot client token and server query credentials into this config file
- Review `config.json` and make sure `serverip`, `port`, `sid` (virtual server id) and `noticesTargetChannel` match your preferences
- Run `npm start`

### Needed permissions
The server query account needs at least this permissions
- `b_serverquery_login`
- `b_serverinstance_version_view`
- `b_virtualserver_select`
- `b_virtualserver_notify_register`
- `b_virtualserver_channel_list`
- `b_virtualserver_client_list`
- `i_channel_subscribe_power`
- `i_channel_needed_subscribe_power`

## Direct commands
All commands have to begin with the specified command symbol (`!` per default)
- `ts`: Displays all active teamspeak clients with a channel list. Needs to be issued from a channel specified in `noticesTargetChannel`

## Mention commands
All commands have to be writted down directly after the bot's mention. Message has to start with the mention.
- `version`: Displays the version of the bot
- `ts`: Same as direct command
- `help` or `über` or empty string: Displays the bot's info
