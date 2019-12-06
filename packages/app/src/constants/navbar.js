/* eslint-disable import/prefer-default-export */
export const getAppData = () => {
  if (window.Bridge) {
    return window.Bridge.getAppData();
  }
  return { name: 'Nebula Orion', version: null };
};
