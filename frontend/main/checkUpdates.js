const electron = require('electron');

const { autoUpdater, dialog } = electron;

export default function checkForUpdates(win) {
  autoUpdater.setFeedURL(`https://nebula-deployment.herokuapp.com/dist/nebula/${version}`); // fix this??
  autoUpdater.on('error', err => win.webContents.send('error', err));
  autoUpdater.on('checking-for-update', () => win.webContents.send('log', 'checking-for-update', autoUpdater.getFeedURL()));
  autoUpdater.on('update-available', () => win.webContents.send('log', 'update-available', autoUpdater.getFeedURL()));
  autoUpdater.on('update-not-available', () => win.webContents.send('log', 'update-not-available', autoUpdater.getFeedURL()));
  autoUpdater.on('update-downloaded', (...args) => {
    win.webContents.send('log', 'update-downloaded', autoUpdater.getFeedURL(), args);
    const choice = dialog.showMessageBox(win, {
      message: 'An update has been downloaded. Do you want to restart now to finish installing it?',
      title: 'Update is ready',
      type: 'question',
      buttons: [
        'Yes',
        'No',
      ],
    });

    if (choice === 0) {
      autoUpdater.quitAndInstall();
    }
  });
  autoUpdater.checkForUpdates();
}
