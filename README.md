# Getting started
run `npm install` to install all dependencies
run `cp config-sample.json config.json`

## Optional Settings
Inside `ClientAuth.json`, we configure authorized users to connect. Change the usernames to whatever you see fit and 
change `allow_unauthorized_connections` to `false` or just leave `allow_unauthorized_connections` set to `true`

# Run the client
Fill in the url inside the config.json file
Run `node client.js`
Enter a username
Wait for it to say [username] connected
Run `/help` in the chat for in chat options

# Heroku
To tail heroku logs, we need to run `heroku logs --tail`