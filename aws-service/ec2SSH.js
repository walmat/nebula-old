const Client = require('ssh2').Client;
const keyPairManager = require('./keyPairManager');
let conn = new Client();

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}


function createProxy(Instance, proxyUsername, proxyPassword) {
    // console.log(Buffer.from(keyPairManager.getKeyPair().KeyMaterial));
    // console.log(Instance.PublicDnsName);
    // console.log(keyPairManager.getKeyPair().KeyMaterial);
    conn.connect({
        host: 'ec2-54-166-156-247.compute-1.amazonaws.com',
        username: 'ubuntu',
        privateKey: `-----BEGIN RSA PRIVATE KEY-----
        MIIEowIBAAKCAQEAzPQpX2/BNP5sfuvdcXSOXnMsObJKdwMiok5eqEv1s9NSBBHpHOQqSP93Ix+w
        sygUDv8hdMuo+XaJTarej4r+LWvZK8ykN8cEI/ybT6mwQbJOg+qfTS7fZToH9GmuC9Xyu6RitImG
        uKsfCWsmDmOUApwEGu3OnRWhlrOQtX2AuOL9VG+asM0yVADdOTokiv86w1I6pwh48JWXLwKBQQ81
        TXTnbUVK5Fze6HaBedo4ON/15jMgJJHK8S3uDn0kNtw2TpG+UlmoOGg6Qfig2VO8SlR5dsMPPjtc
        x8/dAW8g5zD28mjQlx5bfgX4gQFLMB0EkVWjCQRIcjLeKFtQWOnXnwIDAQABAoIBAESTTWSJV/QL
        TPIKqUVU4m3ny1xis1euzN/RqQpWoBdTFZYXCBCKpztVft9Zsx2+wzdhVihmHFubtcUu7tjIgNNh
        yoBFMI0ZIeGIm87D0B2rM2ogDr0cedK83/x/f6SmKVlvXzdY7KLNXs0f9NPLrbJR0W3RM9iLbE2o
        NzsCixdRAnPTcEhwAfKfFPy9VQdx/8EAmAq3VMan5KSxE0QgoNNj0YmSf0QjP+TaWY1BpitM9btP
        fNadfxObS+OqpeGA8gwGWljY4yijfVRT3v9znwkX1ze8Uy9FAW+imLiaHE/NIbIbZTqCSkn3iywb
        s9YG7CJZheE0iDf1ImeZJk2DOoECgYEA6QGWwpuCzzy0r+VmFItI7l+9t2yYodV87TXP6bVth/vz
        PvQ8rTiNjJIwk3L1GubTMKL8znAikHtkth08i4y0Yb165fqldwHwweTw83rzZ80hTrIUZEglKBtk
        bs3+tvfrun7L54+gDdQ/cobl1xwM/B2inmaH7uEeHsOHrRmlj/cCgYEA4S3i+fDczhfApavH5nmb
        IRyAU6aY8NA7LqLtAxPaB9274UnSP9LR+6nuJ9gQ4KX6FEXcGKli7U05ZMjsDewbdeXjfviuiqs6
        aZvfMptVa5ir7Nnvc3EWeksNp/nfr2Y9p05htGDJPquHU8fHlX6ApOBYy1nLiJYP3QnpDM0GW5kC
        gYAuQxZ/xQiPxOnLEqzV32G3kmLEjFcxqoWHQ2voZxE8MpX1JeD2M4hHJK9oVya7FKFRwsqW4kS6
        kwVH8z4WJvWZglloV/+KRWRb2uzMKtkw/tViHpFV580YzXd/WH7+LPMssAgkDawlksKWJppzvyoE
        1I15Dbpnf2LPkNrbT4BDuQKBgQDWKsqCZi/cZIL6D1PlRSviZjU3WnCEOcjQJm2+S5dHfAFB2PB7
        e4v0DD9S7hG/WJ1twrP/ULuib5xy2xaId1P24ltpXCTGBu1bnMDAZTTtTRvX/b/c0GZMki2+4c16
        CYgCJG6RHKzLSmE/sfeFm/fG2Qoa/qCym+cimFZrsmSloQKBgASrghUfsW6eQUgKk3aYlGBVGAl/
        lY1zoHOnuYk78lmGMdK31+lgMx13fveLpaGwbUY5t/fdmLDSOc7PfHkZRGBwoHFGsnjubrXm3NZj
        w/H5+WshYfJIBu+Ax5pJUMzXgC0HDKP38NoEkpRHAQvSiyuCYurF8kAxdQMmKj3trfg2
        -----END RSA PRIVATE KEY-----`,
        debug: console.log
    });
}

// createProxy();

function runProxyScript(proxyUsername, proxyPassword) {
    console.log('Client :: ready');
    sleep(100000);
    console.log('after sleep');
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



