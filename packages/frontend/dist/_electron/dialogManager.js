var a=['bind','RequestShowOpenDialog','showMessage','dialog','showMessageBox','showOpenDialog','sender','FinishShowMessage','Invalid\x20arguments.','getOwnerBrowserWindow','send','_onRequestShowOpenDialog','FinishShowOpenDialog','electron','../common/constants','ipc','RequestShowMessage','_onRequestShowMessage'];(function(c,d){var e=function(f){while(--f){c['push'](c['shift']());}};e(++d);}(a,0xc1));var b=function(c,d){c=c-0x0;var e=a[c];return e;};const Electron=require(b('0x0'));const IPCKeys=require(b('0x1'));class DialogManager{constructor(c){c[b('0x2')]['on'](IPCKeys[b('0x3')],this[b('0x4')][b('0x5')](this));c[b('0x2')]['on'](IPCKeys[b('0x6')],this['_onRequestShowOpenDialog']['bind'](this));}static[b('0x7')](d,e){if(d){return Electron[b('0x8')][b('0x9')](d,e);}return Electron[b('0x8')]['showMessageBox'](e);}static[b('0xa')](f,g){if(f){return Electron[b('0x8')][b('0xa')](f,g);}return Electron[b('0x8')][b('0xa')](g);}[b('0x4')](h,i){if(!i){h[b('0xb')]['send'](IPCKeys[b('0xc')],new Error(b('0xd')),null);return;}const j=this[b('0x7')](h[b('0xb')][b('0xe')](),i);h[b('0xb')][b('0xf')](IPCKeys[b('0xc')],j,null);}[b('0x10')](k,l){if(!l){k['sender'][b('0xf')](IPCKeys[b('0x11')],new Error('Invalid\x20arguments.'),null);return;}const m=this[b('0xa')](k[b('0xb')][b('0xe')](),l);k['sender'][b('0xf')](IPCKeys[b('0x11')],m,null);}}module['exports']=DialogManager;