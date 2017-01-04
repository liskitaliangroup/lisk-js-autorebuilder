#Lisk Anti-Stuck in js

###With love by liskit delegate, for donation 10310263204519541551L

**** NOT USE IT BEFORE YOU ARE GREEN AND ALREDY FORGING ****

The script will check if your delegate is forging, if not it will rebuild with last available snapshot and activate the forging ones the sync is completed.

It will also check if your blockchain is the sync compared to the higher one found. If is not sync the script will reload Lisk.

    - forever-autorebuild.log

The file is a collection of your delegate node fork | autorebuild | forging events

##Prereq

    - git

They should be installed with Lisk installation script

    - nodejs / npm
    - forever

##Install
Clone the repository in the same directory of lisk installation folder, for instance:

```
/HOME DIRECTORY
    /lisk-main
    /lisk-js-autorebuilder
```

In the lisk-main folder check if 127.0.0.1 is whitelisted in the forging section in the config.json

Fore the autorebuilder do as follow:

    - cd into the cloned directory lisk-js-autorebuilder
    - rename the config.sample.json in config.json
    - edit the config.json
            "delegate":"nameOfYourDelegate",
            "secret":"superSecretPasswd",
            "reloadTollerance":"tolerance between your blockchain height and the higher one found (default 4)",
            "minutsOfCheckHeight":"each n minutes the script will compare your blockchain height with the higher one found (default 3)"
    - npm install

##Run
Cd into the lisk-js-autorebuilder

    - forever start -l forever.log -o forever-autorebuild.log -e forever-autorebuild-err.log -a autorebuild.js

To see logs

    - tail -f forever-autorebuild.log
