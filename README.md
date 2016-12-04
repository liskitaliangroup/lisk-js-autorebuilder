#Lisk Anti-Stuck in js
##switch-forging branch

The code in this branch can handle the forging monitoring and activation of 2 nodes, a master node and a slave node.

All the script activity will be logged in the following file:
    
    - forever-autorebuild.log

The file is a collection of your delegate node fork | autorebuild | autoreload |forging events like switch and activation

##Install
##Master node

Make sure that your lisk master node is already sync and forging

Clone the repository in the same directory of lisk installation folder, for instance:

```
/HOME DIRECTORY
    /lisk-main
    /lisk-js-autorebuilder
```

In the lisk-main folder check if:
 
    - 127.0.0.1 is whitelisted in the forging section in the config.json
    - Your Slave node ip is whitelisted in the forging section in the config.json

For the autorebuilder do as follow:

    - cd into the cloned directory lisk-js-autorebuilder
    - git fetch
    - git checkout switch-forging
    - rename the config.sample.json in config.json
    - edit the config.json
            "backUpNode": "ipOfYourSecondBackupNode:8000",
            "delegate":"nameOfYourDelegate",
            "secret":"superSecretPasswd",
            "reloadTollerance":"tolerance between your blockchain height and the higher one found (default 4)",
            "minutsOfCheckHeight":"each n minutes the script will compare your blockchain height with the higher one found (default 3)",
            
##Slave node


##Run
Cd into the lisk-js-autorebuilder

    - forever start -l forever.log -o forever-autorebuild.log -e forever-autorebuild-err.log -a autorebuild.js

To see logs

    - tail -f forever-autorebuild.log
