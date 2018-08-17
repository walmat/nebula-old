import { SETTINGS_FIELDS } from '../../state/actions';

import regexes from '../validation';

function validateProxies(proxies) {
  const errorMap = [];
  proxies.forEach((proxy, idx) => {
    // TEMPORARY
    // const match = proxy.match(regexes.settingsProxyUserPass);
    // let reason = 'passed';
    // if (match) reason = `false, character at ${match.index}`;
    // console.log(`${proxy} => ${reason}`);

    // if (!(proxy.match(regexes.settingsProxyDefault) || proxy.match(regexes.settingsProxyUserPass))) {
    //   errorMap.push(idx);
    // }

    let match = proxy.match(regexes.settingsProxyUserPass);
    console.log(`${proxy} => ${match}`);

    // if ((match = proxy.match(regexes.settingsProxyUserPass))) {
    //   console.log('failed userpass ' + match.index);
    // } else if (!proxy.match(regexes.settingsProxyDefault)) {
    //   console.log('failed default');
    // } else {
    //   console.log('passed');
    // }
  });
  return errorMap;
}

const settingsAttributeValidatorMap = {
  [SETTINGS_FIELDS.EDIT_PROXIES]: validateProxies,
};

export default settingsAttributeValidatorMap;
