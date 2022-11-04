# Getting started
run `npm install` to install all dependencies
run `cp config-sample.json config.json`

## Optional Settings
Inside `ClientAuth.json`, we configure authorized users to connect. Change the usernames to whatever you see fit and 
change `allow_unauthorized_connections` to `false` or just leave `allow_unauthorized_connections` set to `true`
Remember that if you make your server authorized that your config.js needs to have the correct secrets set up.

# Run the client
Fill in the url inside the config.json file
Run `node client.js`
Enter a username
Wait for it to say [username] connected
Run `/help` in the chat for in chat options

# Customizing the client
Edit the Theme.js inside config to update colors and sounds, be sure to import the sound into the assets 
directory and that it is a wav file. 

Update the banner by changing the figlets font, here is the [cheatsheet](https://devhints.io/figlet)

# Heroku
To tail heroku logs, we need to run `heroku logs --tail`