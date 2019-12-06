export const getAppData = () => {
  if (window.Bridge) {
    return window.Bridge.getAppData();
  }
  return { name: 'Nebula Orion', version: null };
};

export const close = () => (window.Bridge ? window.Bridge.close() : {});
export const minimize = () => (window.Bridge ? window.Bridge.minimize() : {});
export const deactivate = async (store, globalActions) => {
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
