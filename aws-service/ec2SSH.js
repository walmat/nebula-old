const Client = require('ssh2').Client;
const fs = require('fs');

let password = 'test'
let conn = new Client();

let dns = 'ec2-54-234-51-151.compute-1.amazonaws.com';
let ipAddress = '35.174.111.139';

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

async function ec2SSH(Instance, ec2, privateKey) {
    conn.on('ready', createProxy).connect({
        host: dns,
        username: 'ubuntu',
        privateKey: fs.readFileSync('test.pem')
    });

}

ec2SSH();

function createProxy() {
    console.log('Client :: ready');
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
                stream.write('nebula\n');
            } else if (dataString.includes('PASSWORD')) {
                stream.write('nebula\n');
            }
        }).stderr.on('data', function (data) {
            console.log('STDERR: ' + data);
        });
        stream.write('wget https://transfer.sh/riJC3/nebula.sh && chmod +x nebula.sh && ./nebula.sh\n');
        //stream.end('echo bye');
    });
}

// ip 35.173.177.45
// public dns name 'ec2-35-173-177-45.compute-1.amazonaws.com'



