import { globalActions } from '../store/actions';
import { mapBackgroundThemeToColor } from '.';

export const getAppData = () => {
  if (window.Bridge) {
    return window.Bridge.getAppData();
  }
  return { name: 'Nebula Orion', version: null };
};

export const onExport = async state => {
  if (window.Bridge) {
    // sanitize the state first..
    const toExport = state;
    delete toExport.Sites;
    await window.Bridge.showSave(state);
  }
};

export const onImport = async importState => {
  if (window.Bridge) {
    const { success, data } = await window.Bridge.showOpen();

    if (success) {
      importState(data);
    }
  }
};

export const close = () => (window.Bridge ? window.Bridge.close() : {});
export const minimize = () => (window.Bridge ? window.Bridge.minimize() : {});
export const deactivate = async store => {
  if (window.Bridge) {
    const confirm = await window.Bridge.showDialog(
      'Are you sure you want to deactivate? Doing so will erase all data!',
      'question',
      ['Okay', 'Cancel'],
      'Confirm',
    );
    if (confirm) {
      store.dispatch(globalActions.reset());
      window.Bridge.deactivate();
    }
  }
  return false;
};

export const openCaptchaWindow = ({ host, sitekey, theme, checkpoint = false }) =>
  window.Bridge
    ? window.Bridge.launchCaptchaHarvester({
        backgroundColor: mapBackgroundThemeToColor[theme],
        host,
        sitekey,
        checkpoint,
      })
    : {};
export const closeWindows = () => (window.Bridge ? window.Bridge.closeAllCaptchaWindows() : {});
