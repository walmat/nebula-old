var a=['./app','setUpEnvironment','app','appendSwitch','ignore-certificate-errors','true','isDevelopment','log','Application\x20is\x20ready','quit','window-all-closed','onWindowAllClosed','certificate-error','onCertificateErrorHandler','web-contents-created','nodeIntegration','allowRunningInsecureContent','startsWith','file:///','src','https://localhost','https://accounts.google.com','preventDefault','will-navigate','electron','./env'];(function(c,d){var e=function(f){while(--f){c['push'](c['shift']());}};e(++d);}(a,0x80));var b=function(c,d){c=c-0x0;var e=a[c];return e;};const Electron=require(b('0x0'));const nebulaEnv=require(b('0x1'));const App=require(b('0x2'));nebulaEnv[b('0x3')]();const app=new App();Electron[b('0x4')]['commandLine'][b('0x5')](b('0x6'),b('0x7'));Electron['app']['on']('ready',()=>{if(nebulaEnv[b('0x8')]()){console[b('0x9')](b('0xa'));}app['onReady']();});Electron['app']['on'](b('0xb'),()=>{if(nebulaEnv[b('0x8')]()){console['log']('Application\x20is\x20quitting');}});Electron['app']['on'](b('0xc'),()=>{if(nebulaEnv['isDevelopment']()){console[b('0x9')]('All\x20of\x20the\x20window\x20was\x20closed.');}app[b('0xd')]();});Electron['app']['on'](b('0xe'),app[b('0xf')]);Electron[b('0x4')]['on'](b('0x10'),(c,d)=>{d['on']('will-attach-webview',(e,f,g)=>{f[b('0x11')]=![];f['webSecurity']=!![];f[b('0x12')]=![];f['experimentalCanvasFeatures']=![];f['experimentalFeatures']=![];f['blinkFeatures']='';if(!g['src'][b('0x13')](b('0x14'))&&!g[b('0x15')][b('0x13')](b('0x16'))&&!g[b('0x15')]['startsWith'](b('0x17'))){e[b('0x18')]();}});d['on'](b('0x19'),(h,i)=>{if(!i['startsWith']('file:///')&&!i[b('0x13')]('https://localhost')&&!i[b('0x13')](b('0x17'))){h[b('0x18')]();}});});