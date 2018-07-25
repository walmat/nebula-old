import { SETTINGS_FIELDS } from '../../state/actions';

import regexes from '../validation';

function validateProxies(proxies) {
  const errorMap = [];
  proxies.forEach((proxy, idx) => {
    if (!regexes.settingsProxyDefault.test(proxy) &&
        !regexes.settingsProxyUserPass.test(proxy)) {
      errorMap.push(idx);
    }
  });
  return errorMap;
}

const settingsAttributeValidatorMap = {
  [SETTINGS_FIELDS.EDIT_PROXIES]: validateProxies,
};

export default settingsAttributeValidatorMap;
