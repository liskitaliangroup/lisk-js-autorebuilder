// libs
var tail = require('tail').Tail;
var exec = require('child_process');
var request = require ('request');
var config = require('./config.json');

// logs
var t = new tail("../lisk-main/logs/lisk.log");
var log = '';
var forkString = 'Fork';
var forgeString = 'Forged';
var consString = 'consensus';
var rebuildString = 'Finished sync';

// foring monitoring
var alerted = {};
var nodeToUse = '';
var delegateMonitor = config.delegate;
var pauseReload = false;
var x = 0;

var postOptions = {
    uri: 'http://'+ config.node +'/api/delegates/forging/enable',
    method: 'POST',
    json: {
        "secret": ""+ config.secret +""
    }
};

var checklHeight = function(node) {
    return new Promise(function (resolve, reject) {
        request('http://'+ node +'/api/loader/status/sync', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                resolve(data.height);
            } else {
                reject('checklHeight has some problem');
            }
        });
    });
}

var chooseNode = function() {
    return new Promise(function (resolve, reject) {
        request('http://' + config.nodeToCompareWith + '/api/peers?state=2&orderBy=height:desc', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                while(x < data.peers.length) {
                    if(data.peers[x].height == null){
                        x+=1
                    } else {
                        checkNodeToUse = data.peers[x].ip + ':8000';
                        x=0;
                        break;
                    }
                }
                request('http://' + checkNodeToUse + '/api/peers?state=2&orderBy=height:desc', function (error, response, body) {
                    if (!error && response.statusCode == 200 && body!='Forbidden') {
                        nodeToUse = checkNodeToUse
                        resolve(nodeToUse);
                    } else {
                        reject('Node dropped ' + checkNodeToUse);
                    }
                });
            } else {
                reject(config.nodeToCompareWith +' has some problem');
            }
        });
    });
};

var enableForging = function() {
    return new Promise(function (resolve, reject) {
        request(postOptions, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve('Forging enabled');
            } else {
                reject(error);
            }
        });
    });
};

// write on a specific log file fork lines and forging enabling
t.watch()
t.on("line", data => {
    log = data;
    if(log.indexOf(forkString) !== -1) {
        console.log("\n[" + new Date().toString() + "] | Fork line found in lisk.log");
        console.log(data+"\n");
    }
    if(log.indexOf(forgeString) !== -1) {
        console.log("\n[" + new Date().toString() + "] | Block forged");
        console.log(data+"\n");
    }
    if(log.indexOf(consString) !== -1) {
        console.log("[" + new Date().toString() + "] | Consensus\n");
        console.log(data+"\n");
    }
    if(log.indexOf(rebuildString) !== -1) {
        console.log("[" + new Date().toString() + "] | Sync finished, enabling forging");
        pauseReload = false;
        enableForging().then(function(res) {
            console.log("[" + new Date().toString() + "] | " + res + "\n");
        }, function (err) {
            console.log(err)
        }
    )};
});

// check if I'm delegateMonitor delegate is forging
var checkBlocks = function() {
    // blocks scheduler for alerts
    chooseNode().then(function(res) {
        request('http://' + nodeToUse + '/api/delegates/?limit=101&offset=0&orderBy=rate:asc', function (error, response, body) {
            // getting all delegates
            if (!error && response.statusCode == 200) {
                delegateList = [];
                var res = JSON.parse(body);
                for (var i = 0; i < res.delegates.length; i++) {
                    // check if the delegate is in monitoring mode
                    if (res.delegates[i].username.indexOf(delegateMonitor)!== -1) {
                        // if is in monitoring add to delegateList var
                        delegateList.push(res.delegates[i]);
                    }
                }
                // checking blocks
                request('http://' + nodeToUse + '/api/blocks?limit=100&orderBy=height:desc', function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var data = JSON.parse(body);
                        // checking blocks shifting by 100
                        request('http://' + nodeToUse + '/api/blocks?limit=100&offset=100&orderBy=height:desc', function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                var data2 = JSON.parse(body);
                                data.blocks = data.blocks.concat(data2.blocks);
                                alive = {};
                                for (var i = 0; i < data.blocks.length; i++) {
                                    alive [data.blocks[i].generatorId] = true;
                                }
                                for (var i = 0; i < delegateList.length; i++) {
                                    if (! (delegateList[i].address in alive)) {
                                        alive [delegateList[i].address] = false;
                                        if (! (delegateList[i].address in alerted))
                                        alerted [delegateList[i].address] = 1;
                                        else
                                        alerted [delegateList[i].address] += 1;

                                        if (alerted [delegateList[i].address] == 1 || alerted [delegateList[i].address] % 180 == 0) {
                                            if (delegateList[i].username.indexOf(delegateMonitor)!== -1) {
                                                // if is red rebuild and wait 30 min before rebuilding again
                                                console.log("\n[" + new Date().toString() + "] | Asked to: " + nodeToUse);
                                                console.log("[" + new Date().toString() + "] | Autorebuild started");
                                                exec.exec('bash ../lisk-main/lisk.sh rebuild -u https://snapshot.lisknode.io',function (error, stdout, stderr) {
                                                    console.log(stdout);
                                                    if (error !== null) {
                                                        console.log('exec error: ' + error);
                                                    }
                                                });
                                                pauseReload = true;
                                            }
                                        }
                                    } else {
                                        delete alerted [delegateList[i].address];
                                    }
                                }
                            } else {
                                console.log("Something wrong with get blocks API, second step");
                            }
                        });
                    } else {
                        console.log("Something wrong with get blocks API, first step");
                    }
                });
            } else {
                console.log("Something wrong with get delegates");
            }
        });
    }, function (err) {
        console.log("[" + new Date().toString() + "] | " + err)
    }
);
};

var checkReload = function() {
    chooseNode().then(function(res) {
        checklHeight(res).then(function(res) {
            var choosedNode = res;
            checklHeight(config.node).then(function(res) {
                console.log("\n[" + new Date().toString() + "] | Checked node height: " + choosedNode);
                console.log("[" + new Date().toString() + "] | Your node height: " + res);
                console.log("[" + new Date().toString() + "] | Diff height: " + (choosedNode - res) + "\n");
                if((choosedNode - res)>=4) {
                    console.log("\n[" + new Date().toString() + "] | Height difference > 4");
                    console.log("[" + new Date().toString() + "] | Reload Lisk");
                    exec.exec('bash ../lisk-main/lisk.sh reload',function (error, stdout, stderr) {
                        console.log(stdout);
                        if (error !== null) {
                            console.log('exec error: ' + error);
                        }
                    });
                    pauseReload = true;
                }
            }, function (err) {
                console.log("[" + new Date().toString() + "] | " + err)
            });
        }, function (err) {
            console.log("[" + new Date().toString() + "] | " + err)
        })
    }, function (err) {
        console.log("[" + new Date().toString() + "] | " + err)
    })
}

// run
checkBlocks ();
setInterval (checkBlocks, 10000);

if(pauseReload == false)
    setInterval (checkReload, (config.minutsOfCheckHeight * 60 * 1000));
