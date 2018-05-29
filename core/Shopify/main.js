//main file that each task will start

var findItem = require('classes/findItem');
var pay = require('classes/pay');
var common = require('utils/common');
var log = require('utils/log');

let main = {};

main.findItem = findItem.findItem;
main.pay = pay.pay;
main.log = log.log;

module.exports = main;