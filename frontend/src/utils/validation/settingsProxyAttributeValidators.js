import { SETTINGS_FIELDS } from '../../state/actions';

import regexes from '../validation';

function validateProxies(proxies) {
  const errorMap = [];
  proxies.forEach((proxy, idx) => {
    const matchDefault = regexes.settingsProxyDefault.test(proxy);
    const matchUserPass = regexes.settingsProxyUserPass.test(proxy);
    // console.log(`${proxy} => ${matchUserPass} || ${matchDefault}`);
    if (!matchDefault && !matchUserPass) {
      errorMap.push(idx);
    }
  });
  return errorMap;
}

const settingsAttributeValidatorMap = {
  [SETTINGS_FIELDS.EDIT_PROXIES]: validateProxies,
};

export default settingsAttributeValidatorMap;
