import { SETTINGS_FIELDS } from '../actions';
// import regexes from '../validation';

function validateProxies(proxies) {
  const errorMap = [];
  // proxies.forEach((proxy, idx) => {
  //   const matchDefault = regexes.settingsProxyDefault.test(proxy);
  //   const matchUserPass = regexes.settingsProxyUserPass.test(proxy);
  //   const matchSubnet = regexes.settingsProxySubnet.test(proxy);
  //   const matchSubnetUserPass = regexes.settingsProxySubnetUserPass.test(proxy);
  //   if (!matchDefault && !matchUserPass && !matchSubnet && !matchSubnetUserPass) {
  //     errorMap.push(idx);
  //   }
  // });
  return errorMap;
}

const proxyAttributeValidatorMap = {
  [SETTINGS_FIELDS.EDIT_PROXIES]: validateProxies,
};

export default proxyAttributeValidatorMap;
