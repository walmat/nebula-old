const request = require('request-promise');
const Discord = require('discord.js');

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3107.4 Safari/537.36';

let link_builder = {};

link_builder.build = function(url, callback) {

    let links = [];
    let title = [];
    let img = [];

    request({
        method: 'get',
        url: `${url}.json`,
        gzip: true,
        json: true,
        headers: {
            'User-Agent': userAgent
        }
    }).then(function (json) {
        json.product.variants.forEach(function (size) {

            let atclink = (`${size.title} - http://${url.split('//')[1].split('/')[0]}/cart/${size.id}:1`);
            links.push(atclink);
        });
        let name = (`${json.product.title}`);
        let picture = (`${json.product.image.src}`);
        title.push(name);
        img.push(picture);
        return callback(null, sendLinks(title, links, img, '#648767'));

    }).catch(function (e) {
        title.push('N/A');
        links.push('Unable to find variants for that item');

        return callback(e, sendLinks(title, links, null, '#A3333D'));

    });
};

function sendLinks(title, links, img, color) {
    if (!img) img = 'https://cdn.discordapp.com/embed/avatars/0.png';
    return new Discord.RichEmbed()
        .setAuthor(title)
        .setDescription(links)
        .setThumbnail(img.toString())
        .setTimestamp(new Date().toISOString())
        .setColor(color)
        .setFooter('Nebula © 2018', 'https://cdn.discordapp.com/embed/avatars/0.png');
}

module.exports = link_builder;