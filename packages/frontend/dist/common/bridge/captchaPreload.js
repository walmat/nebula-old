var a=['removeEvent','StopHarvestCaptcha','RequestRefresh','Bridge','electron','../constants','../../_electron/env','./index','setUpEnvironment','getCurrentWindow','sendEvent','RequestLaunchYoutube','getPosition','HarvestCaptcha','handleEvent','StartHarvestCaptcha'];(function(c,d){var e=function(f){while(--f){c['push'](c['shift']());}};e(++d);}(a,0xe4));var b=function(c,d){c=c-0x0;var e=a[c];return e;};const {remote}=require(b('0x0'));const IPCKeys=require(b('0x1'));const nebulaEnv=require(b('0x2'));const {base,util}=require(b('0x3'));nebulaEnv[b('0x4')]();const _saveProxyForCaptchaWindow=c=>{const {id}=remote[b('0x5')]();util['sendEvent'](IPCKeys['RequestSaveCaptchaProxy'],id,c);};const _launchYoutube=()=>{util[b('0x6')](IPCKeys[b('0x7')]);};const _getPosition=()=>{const d=remote['getCurrentWindow']();return d[b('0x8')]();};const _endCaptchaSession=()=>{const {id}=remote[b('0x5')]();util[b('0x6')](IPCKeys['RequestEndSession'],id);};const _harvestCaptchaToken=(e,f,g)=>{util['sendEvent'](IPCKeys[b('0x9')],e,f,g);};const _registerForStartHarvestCaptcha=h=>{util[b('0xa')](IPCKeys[b('0xb')],h);};const _deregisterForStartHarvestCaptcha=i=>{util[b('0xc')](IPCKeys['StartHarvestCaptcha'],i);};const _registerForStopHarvestCaptcha=j=>{util[b('0xa')](IPCKeys[b('0xd')],j);};const _deregisterForStopHarvestCaptcha=k=>{util[b('0xc')](IPCKeys[b('0xd')],k);};const _refreshCaptchaWindow=()=>{util[b('0x6')](IPCKeys[b('0xe')]);};process['once']('loaded',()=>{window[b('0xf')]=window[b('0xf')]||{...base,'launchYoutube':_launchYoutube,'refreshCaptchaWindow':_refreshCaptchaWindow,'harvestCaptchaToken':_harvestCaptchaToken,'saveProxyForCaptchaWindow':_saveProxyForCaptchaWindow,'Captcha':{'start':{'register':_registerForStartHarvestCaptcha,'deregister':_deregisterForStartHarvestCaptcha},'stop':{'register':_registerForStopHarvestCaptcha,'deregister':_deregisterForStopHarvestCaptcha},'getPosition':_getPosition},'endCaptchaSession':_endCaptchaSession};});