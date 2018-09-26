const electron = require('electron');

const { app } = electron;

// Make the window menu
const menu = [{
  label: 'File',
  submenu: [{
    label: 'Quit',
    click() {
      app.quit();
    },
    accelerator: 'CmdOrCtrl+Q',
  }],
},
{
  label: 'Edit',
  submenu: [{ role: 'copy' },
    { role: 'paste' },
    { role: 'selectall' }],
}];

module.exports = menu;
