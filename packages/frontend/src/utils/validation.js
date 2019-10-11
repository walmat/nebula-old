const regexes = {
  email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
  urlRegex: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/i,
  keywordRegex: /^[+-][A-Za-z0-9&-]+$/,
  variantRegex: /[0-9]/,
  aws_access_key: /(^|[^A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])/,
  aws_secret_key: /^[A-Za-z0-9/+=]{40}$/,
  creditCardCvv: /^\d{3}$/,
  creditCardNumber: /^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
  creditCardExp: /^(?:0[1-9]|1[0-2])\/?[0-9]{2}$/,
  phoneNumber: /^(?:\+\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
  settingsProxyDefault: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(?:6553[0-5]|655[0-2][0-9]|65[0-4][0-9][0-9]|6[0-4][0-9][0-9][0-9]|[0-5]?[0-9][0-9]?[0-9]?[0-9]?)$/,
  settingsProxyUserPass: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(?:6553[0-5]|655[0-2][0-9]|65[0-4][0-9][0-9]|6[0-4][0-9][0-9][0-9]|[0-5]?[0-9][0-9]?[0-9]?[0-9]?):[^\s:]+:[^\s:]+$/,
  settingsProxySubnet: /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/,
  settingsProxySubnetUserPass: /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?:[^\s:]+:[^\s:]+$/,
  discordWebhook: /https:\/\/discordapp.com\/api\/webhooks\/[0-9]+\/[a-zA-Z-0-9]*/,
  slackWebhook: /https:\/\/hooks\.slack\.com\/services\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z-0-9]*/,
};

export default regexes;
