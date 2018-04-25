const Client = require('ssh2').Client;
const keyPairManager = require('./keyPairManager');
let conn = new Client();

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

exports.createProxy = function (Instance, proxyUsername, proxyPassword) {
    console.log(Instance.PublicDnsName);
    console.log(keyPairManager.getKeyPair().KeyMaterial);
    conn.on('ready', runProxyScript(proxyUsername, proxyPassword)).connect({
        host: Instance.PublicDnsName,
        username: 'ubuntu',
        privateKey: keyPairManager.getKeyPair().KeyMaterial
    });
}

function runProxyScript(proxyUsername, proxyPassword) {
    console.log('Client :: ready');
    sleep(100000);
    console.log('after sleep)');
    conn.exec('sudo su', { pty: true }, function (err, stream) {
        if (err) throw err;
        stream.on('close', function () {
            console.log('Stream :: close');
            conn.end();
        }).on('data', function (data) {
            console.log('STDOUT: ' + data);

            let dataString = data.toString().toUpperCase()
            if (dataString.includes('Y/N')) {
                stream.write('y\n');
            } else if (dataString.includes('USERNAME')) {
                stream.write(`${proxyUsername}\n`);
            } else if (dataString.includes('PASSWORD')) {
                stream.write(`${proxyUsername}\n`);
            } else if (dataString === 'DONE') {
                stream.end();
            }
        }).stderr.on('data', function (data) {
            console.log('STDERR: ' + data);
        });
        stream.write('wget https://transfer.sh/JozoU/nebula && chmod +x nebula.sh && ./nebula.sh\n');
    });
}



