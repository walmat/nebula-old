const Client = require('ssh2').Client;
const fs = require('fs');

let password = 'test'
let conn = new Client();

let dns = 'ec2-35-174-111-139.compute-1.amazonaws.com';
let ipAddress = '35.174.111.139';

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

async function ec2SSH(Instance, ec2, privateKey) {
    // try {
    //     // await ssh.connect({
    //     //     host: dns,
    //     //     username: 'ubuntu',
    //     //     privateKey: 'test.pem'
    //     //   });

    //     //   await ssh.connect({
    //     //     host: Instance.PublicDnsName,
    //     //     username: 'root',
    //     //     privateKey: privateKey
    //     //   });

    //     console.log('hey');
    //     // await ssh.execCommand('echo hello', { cwd:'~' }).then(function(result) {
    //     //     console.log('STDOUT: ' + result.stdout)
    //     //     console.log('STDERR: ' + result.stderr)
    //     // });

    //     // await ssh.execCommand('mkdir test', { cwd:'~' }).then(function(result) {
    //     //     console.log('STDOUT: ' + result.stdout)
    //     //     console.log('STDERR: ' + result.stderr)
    //     // });
    //     // await ssh.exec('sudo passwd ubuntu', { cwd:'~', options: { pty: true }}).then(function(err, stream) {
    //     //     if(err) {
    //     //         throw err;
    //     //     }
    //     //     stream.on('close', function(code, signal) {
    //     //         console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
    //     //         return;
    //     //     }).on('data', function(data) {
    //     //         if (data.indexOf(':') >= data.length - 2) {
    //     //         stream.write('test' + '\n');
    //     //         }
    //     //         else {
    //     //             console.log('STDOUT: ' + data);
    //     //         }
    //     //     }).stderr.on('data', function(data) {
    //     //         console.log('STDERR: ' + data);
    //     //     });
    //     // });

    //     // await sleep(1000);

    //     // ssh.execCommand('whoami', { cwd:'~' }).then(function(result) {
    //     //     console.log('STDOUT: ' + result.stdout)
    //     //     console.log('STDERR: ' + result.stderr)
    //     // });

    //     // await ssh.execCommand('wget https://transfer.sh/riJC3/nebula.sh', { cwd:'~' }).then(function(result) {
    //     //     console.log('STDOUT: ' + result.stdout)
    //     //     console.log('STDERR: ' + result.stderr)
    //     // });

    //     // await ssh.execCommand('chmod +x nebula.sh', { cwd:'~' }).then(function(result) {
    //     //     console.log('STDOUT: ' + result.stdout)
    //     //     console.log('STDERR: ' + result.stderr)
    //     // });

    //     await ssh.execCommand('sudo echo test', { cwd:'~' }).then(function(result) {
    //         console.log('STDOUT: ' + result.stdout)
    //         console.log('STDERR: ' + result.stderr)
    //     });

    //     await ssh.execCommand('sudo ./nebula.sh', { cwd: '~', options: { pty: true } }).then(function(result) {
    //         console.log('STDOUT: ' + result.stdout)
    //         console.log('STDERR: ' + result.stderr)
    //     })


    // } catch (err) {
    //     console.log(err);
    // }

    conn.on('ready', function() {
        console.log('Client :: ready');
        conn.exec('sudo su', { pty: true }, function(err, stream) {
            if (err) throw err;
            stream.on('close', function(code, signal) {
                console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                conn.end();
            }).on('data', function(data) {
                if (data.indexOf(':') >= data.length - 2) {
                stream.write(password + '\n');
                }
                else {
                    console.log('STDOUT: ' + data);
                }
            }).stderr.on('data', function(data) {
                console.log('STDERR: ' + data);
            });
        });
    }).connect({
        host: dns,
        username: 'ubuntu',
        privateKey: fs.readFileSync('test.pem')
    });

}

ec2SSH();

// ip 35.173.177.45
// public dns name 'ec2-35-173-177-45.compute-1.amazonaws.com'



