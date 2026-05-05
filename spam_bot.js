// ==UserScript==
// @name         Custom (спам-бот + автоответчик) Final ClearWhisper
// @namespace    t.me/Qwerlo
// @version      2.0.4
// @description  Полный API
// @author       Кью
// @match        http://*.pony.town/*
// @match        https://*.pony.town/*
// @icon         https://pony.town/favicon-32x32.png
// @grant        none
// ==/UserScript==

(function(){
    // Защита от повторной инициализации
    if (window.__pttwCustomLoaded) return;
    window.__pttwCustomLoaded = true;

    try{
        let w = (window.unsafeWindow?window.unsafeWindow:window);
        if(self != top) return;

        //[Глобальные переменные]
        const qs = (s,e)=>(e??document).querySelector(s);
        const qsa = (s,e)=>(e??document).querySelectorAll(s);
        const ce = n=>document.createElement(n);

        let twOptions, twScripts, gl, ws, onstartmenuloaded, ongameloaded;

        function merge(target, source){
            for(let i in source) target[i] = source[i];
            return target;
        }

        function encryptName(name){
            return btoa(encodeURIComponent(navigator.appVersion + name + navigator.userAgent));
        }
        function saveToLS(name, value){
            w.localStorage.setItem(encryptName(name), value);
        }
        function readFromLS(name){
            return w.localStorage.getItem(encryptName(name));
        }

        let randomString = {
            firstChars: 'abcdefghijklmnopqrstuvwxyz',
            storage: {},
            get(s){
                if(this.storage[s]) return this.storage[s];
                let uuid = this.firstChars[Math.floor(Math.random() * this.firstChars.length)] + crypto.randomUUID().replaceAll('-', '');
                this.storage[s] = uuid;
                return uuid;
            }
        }

        //[API]
        class Player{
            constructor(elem, name, status, tags, social){
                this.elem = elem;
                this.name = name;
                this.status = status;
                this.tags = tags;
                this.social = social;
            }
            isOpened(){ return !!this.elem.parentNode; }
            close(){ dispatchEvent(new KeyboardEvent('keydown', {keyCode: 27})); }
            action(act){
                let pb = this.elem, menu = qs('div.dropdown-menu', pb), toggle = qs('button.dropdown-toggle', pb);
                if(!menu){
                    toggle.click();
                    menu = qs('div.dropdown-menu', pb);
                }
                let ret = false;
                qsa('button.dropdown-item', pb).forEach(btn=>{
                    if(btn.innerText.toLowerCase().includes(act.toLowerCase())){
                        btn.click();
                        toggle.click();
                        ret = true;
                    }
                });
                return ret;
            }
            isActionAvailable(act){
                let pb = this.elem, menu = qs('div.dropdown-menu', pb), toggle = qs('button.dropdown-toggle', pb);
                if(!menu){
                    toggle.click();
                    menu = qs('div.dropdown-menu', pb);
                }
                let ret = false;
                qsa('button.dropdown-item', pb).forEach(btn=>{
                    if(btn.innerText.toLowerCase().includes(act.toLowerCase()) && !btn.disabled){
                        ret = true;
                    }
                });
                return ret;
            }
        }

        class Message{
            constructor(elem, type, time, author, text){
                this.elem = elem;
                this.type = type;
                this.time = time;
                this.author = author;
                this.text = text;
            }
            getPlayer(){ return pt.player.getByMessage(this); }
            getSupporterLevel(){
                return (this.elem.className.match(/chat\-line\-supporter\-([0-9]+)/) || [0, 0])[1];
            }
        }

        Message.create = function(text, author, type){
            if(typeof author == 'undefined') author = 'system';
            if(typeof type == 'undefined') type = '';
            return new Message(null, type, getFormattedTime(), author, text);
        }

        const pt = {
            keyCodes: { left: 37, up: 38, right: 39, down: 40 },
            Player: Player,
            Message: Message,
            sendKey(keyCode, delay){
                return new Promise((res)=>{
                    let cfg = {};
                    if(typeof keyCode == 'number') cfg.keyCode = keyCode;
                    else cfg.code = /^[a-z]{1}$/.test(keyCode)?'Key'+keyCode.toUpperCase():/^[0-9]{1}$/.test(keyCode)?'Digit'+keyCode.toUpperCase():keyCode;
                    w.dispatchEvent(new KeyboardEvent('keydown', cfg));
                    setTimeout(()=>{
                        w.dispatchEvent(new KeyboardEvent('keyup', cfg));
                        res();
                    }, delay);
                });
            },
            move(dir, time){ return this.sendKey(this.keyCodes[dir], time??150); },
            crc32: function(r){for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];return(-1^n)>>>0},
            action: {
                invoke(act){
                    let btn, btns = qsa('.action-button');
                    if(act.crc32){
                        btns.forEach(e=>{ if(!btn && pt.crc32(qs('canvas', e).toDataURL()) == act.crc32) btn = e; });
                    }else if(act.text){
                        btns.forEach(e=>{ if(!btn && e.title.toLowerCase().includes(act.text.toLowerCase())) btn = e; });
                    }else if(act.index){
                        if(act.index == -1){ pt.chat.sendMessage('/e'); return; }
                        btn = btns[act.index];
                    }
                    if(!btn) throw new Error('Action not found');
                    btn.click();
                },
                getAll(){
                    let btns = qsa('.action-button'), ret = [];
                    btns.forEach((e,i)=>{
                        ret.push({ index: i, text: e.title.toLowerCase(), crc32: pt.crc32(qs('canvas', e).toDataURL()) });
                    });
                    return ret;
                },
                select(){
                    return new Promise((res,rej)=>{
                        let actionList = qs('.action-list'), vertActionList = qs('.vertical-action-bar'), bx;
                        function listener(e){
                            let el = e.target.parentNode;
                            bx.close(true);
                            actionList.removeEventListener('contextmenu', listener);
                            if(vertActionList) vertActionList.addEventListener('contextmenu', listener);
                            res({ text: el.title.toLowerCase(), crc32: pt.crc32(qs('canvas', el).toDataURL()) });
                        }
                        bx = box({ title: 'Выбор действия', text: 'Выберите действие, нажав на него правой кнопкой мыши', noOverlay: true });
                        box.onclose = ()=>rej();
                        actionList.addEventListener('contextmenu', listener);
                        if(vertActionList) vertActionList.addEventListener('contextmenu', listener);
                    });
                }
            },
            zoom: {
                set(n){
                    let settingsBtn = qs('div.settings-box button');
                    let style = merge(ce('style'), { innerText: '.settings-box-menu{ position: absolute; width: 1px; height: 1px; left: -999px; top: -999px; }' });
                    document.body.appendChild(style);
                    if(!qs('div.settings-height')){
                        settingsBtn = qs('div.settings-box button');
                        settingsBtn.click();
                    }
                    let inBtn = qs(`button[aria-label="Zoom in"]`);
                    let outBtn = qs(`button[aria-label="Zoom out"]`);
                    for(let i = 0; i < 5; i++) outBtn.click();
                    let num = 0;
                    if(n <= 4) num = n - 1;
                    else num = n - 2;
                    for(let j = 0; j < num; j++) inBtn.click();
                    return new Promise((res)=>{
                        setTimeout(()=>{
                            document.body.removeChild(style);
                            settingsBtn.click();
                            res();
                        }, 150);
                    });
                },
                get(){
                    let settingsBtn = qs('div.settings-box button');
                    let style = merge(ce('style'), { innerText: '.settings-box-menu{ position: absolute; width: 1px; height: 1px; left: -999px; top: -999px; }' });
                    document.body.appendChild(style);
                    if(!qs('div.settings-height')){
                        settingsBtn = qs('div.settings-box button');
                        settingsBtn.click();
                    }
                    return new Promise((res)=>{
                        setTimeout(()=>{
                            let z = parseInt(qs('div[title="Current zoom level"]').innerText.match(/Zoom ([0-9]{1})x/)[1]);
                            document.body.removeChild(style);
                            settingsBtn.click();
                            res(z);
                        }, 150);
                    });
                }
            },
            chat: {
                open(){ if(!qs('.chat-line')) qs('[title="Toggle chatlog"]').click(); },
                getMessageByElement(msg){
                    let time = new Date(), timeArr = qs('.chat-line-timestamp', msg).innerText.split(':');
                    time.setHours(parseInt(timeArr[0])); time.setMinutes(parseInt(timeArr[1]));
                    return new Message(msg, (msg.className.replace(' chat-line-break', '').split(' ')[1]||'normal').replaceAll(' ', '').replace('chat-line', '').replace('-', ''), time, qs('.chat-line-name-content', msg).innerText, qs('.chat-line-message', msg).innerText);
                },
                getMessage(offset){
                    let messages = qsa('.chat-line');
                    if(!messages || messages.length == 0){ qs('[title="Toggle chatlog"]').click(); messages = qsa('.chat-line'); }
                    let msg = messages[messages.length - ((offset??0)+1)];
                    if(!msg) return null;
                    return this.getMessageByElement(msg);
                },
                getMessages(start, end){
                    let arr = [];
                    for(let i = (start??0); i < (end??100); i++){
                        let result = this.getMessage(i);
                        if(result) arr.push(result);
                    }
                    return arr;
                },
                sendMessage(text, forcePublic = false){
                    let chatBox = qs('.chat-box');
                    // Если нужно принудительно переключить чат на общий (используется команда /clearwhisperchat отдельно)
                    if(!chatBox || chatBox.getAttribute('hidden') === ''){
                        qs('[title="Toggle chat"]').click();
                        chatBox = qs('.chat-box');
                    }
                    let inp = qs('.chat-textarea');
                    inp.value = text;
                    inp.dispatchEvent(new InputEvent('input'));
                    qs('[aria-label="Send message"]').click();
                },
                addMessage(msg){
                    if(typeof msg == 'string') msg = Message.create(msg);
                    let messages = qsa('.chat-line');
                    if(!messages || messages.length == 0){ qs('[title="Toggle chatlog"]').click(); messages = qsa('.chat-line'); }
                    let el = messages[messages.length - 1];
                    let nel = el.cloneNode(true);
                    el.parentNode.appendChild(nel);
                    qs('.chat-log-scroll-outer').scroll(0, Number.MAX_SAFE_INTEGER);
                    msg.elem = nel;
                    this.editMessage(msg);
                    return msg;
                },
                editMessage(msg){
                    let el = msg.elem;
                    qs('.chat-line-name-content', el).innerText = msg.author;
                    qs('.chat-line-message', el).innerText = msg.text;
                },
                registerCommand(name, cb){ this.commands[name] = cb; },
                commands: [],
                hook: {
                    send: [], receive: [],
                    attach(type, func){ return this[type].push(func) - 1; },
                    detach(type, index){ this[type].splice(index, 1); }
                }
            },
            status: {
                get(){
                    let status = qs('ui-button', qs('status-box')).title;
                    return status.split('|')[1].trim().toLowerCase();
                },
                set(status){
                    let stBtn, btns = qsa('.status-dropdown-menu a.dropdown-item.mt-1');
                    if(!btns || btns.length == 0){
                        let statusBtn = qs('.status-button')
                        statusBtn.click();
                        setTimeout(()=>statusBtn.click(), 200);
                        btns = qsa('.status-dropdown-menu a.dropdown-item.mt-1');
                    }
                    btns.forEach(e=>{
                        if(e.innerText.toLowerCase().includes(status.toLowerCase())) stBtn = e;
                    });
                    if(!stBtn) throw new Error('Status not found.');
                    stBtn.click();
                }
            },
            player: {
                get(){
                    let ponyBox = qs('pony-box');
                    if(!ponyBox) throw new Error('Pony box not found.');
                    let tags = [];
                    qsa('.pony-box-tag', ponyBox).forEach(e=>{ tags.push(e.innerText.toLowerCase()); });
                    let status = '', statusEl = qs('.pony-box-name-status', ponyBox);
                    if(statusEl.getAttribute('ngbtooltip')){
                        status = statusEl.getAttribute('ngbtooltip').replaceAll(' ', '-').toLowerCase();
                    }else{
                        status = statusEl.className.replace('ng-fa-icon pony-box-name-status text-', '').toLowerCase();
                    }
                    let social = { name: null, url: null }, socialEl = qs('site-info', ponyBox);
                    if(socialEl){
                        social.name = qs('.sr-only', socialEl)?.innerText?.trim()||null;
                        social.url = (qs('a', socialEl)?.href)??null;
                    }
                    return new Player(ponyBox, qs('.pony-box-name-text', ponyBox).innerText, status, tags, social);
                },
                getByMessage(msg){
                    let th = this;
                    return new Promise((res)=>{
                        let ponyBox = qs('pony-box');
                        if(!ponyBox || qs('.pony-box-name-text', ponyBox).innerText != msg.author) qs('.chat-line-name-content', msg.elem).click();
                        setTimeout(()=> res(th.get()), 100);
                    });
                }
            },
            onGameLoad(f){ this.gameLoadedListeners.push(f); },
            wshook: {
                enabled: readFromLS('disableWsHook') != 'true',
                send: [], receive: [],
                attach(type, func){ return this[type].push(func) - 1; },
                detach(type, index){ this[type].splice(index, 1); },
                enable(){ saveToLS('disableWsHook', 'false'); location.reload(); },
                disable(){ saveToLS('disableWsHook', 'true'); location.reload(); },
                getSocket(){ return ws; }
            },
            menuButton: {
                list: [],
                add(text, func){ return this.list.push({ text, func }) - 1; },
                remove(index){ this.list.splice(index, 1); }
            },
            graphics: {
                getGlContext(){ return gl; },
                readPixel(x, y){
                    let px = new Uint8Array(4);
                    let adjustedX = Math.floor(devicePixelRatio * x);
                    let adjustedY = Math.floor(devicePixelRatio * (gl.canvas.clientHeight - y));
                    gl.readPixels(adjustedX, adjustedY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
                    return px;
                },
                readAllPixels(){
                    let pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
                    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    return pixels;
                }
            },
            tweaker: { optionsUI: tweakerUI, antiAfk: antiAfk },
            keyBind: {
                list: JSON.parse(readFromLS('twBinds') || '[]'),
                listener(e){
                    if(e.target == pt.chat.fta) return;
                    let key = e.code.includes('Key') ? e.code.replace('Key', '').toLowerCase() : e.code;
                    this.list.forEach(bind=>{
                        if(bind.key == key && bind.alt == e.altKey && bind.ctrl == e.ctrlKey){
                            switch(bind.action.type){
                                case 'js': w.eval(bind.action.value); break;
                                case 'chat': pt.chat.ftaSend(bind.action.value); break;
                                case 'action': pt.action.invoke(bind.action.value); break;
                                case 'key': pt.sendKey(bind.action.value); break;
                            }
                        }
                    });
                },
                set(cfg, action){
                    let ob = this.list.find(e=>e.key==cfg.key&&e.alt==cfg.alt&&e.ctrl==cfg.ctrl);
                    if(ob) ob.action = action;
                    else { cfg.action = action; this.list.push(cfg); }
                    saveToLS('twBinds', JSON.stringify(this.list));
                },
                delete(cfg){
                    let idx = this.list.findIndex(e=>e.key==cfg.key&&e.alt==cfg.alt&&e.ctrl==cfg.ctrl);
                    this.list.splice(idx, 1);
                    saveToLS('twBinds', JSON.stringify(this.list));
                },
                configFromString(str){
                    let cfg = { alt: false, ctrl: false, key: '' };
                    str.split('+').forEach(e=>{
                        if(e == 'alt') cfg.alt = true;
                        else if(e == 'ctrl') cfg.ctrl = true;
                        else cfg.key = e;
                    });
                    return cfg;
                }
            },
            gameLoadedListeners: [],
            stl: saveToLS
        }

        if(localStorage.ptToWindow) w.pt = pt;

        function getFormattedDateTime(dd, td, md){
            let d = new Date();
            let arr = [
                (d.getDate()).toString(), (d.getMonth()+1).toString(), d.getFullYear().toString(),
                d.getHours().toString(), d.getMinutes().toString(), d.getSeconds().toString()
            ];
            arr.forEach((e,i,o)=>{ o[i] = (e.length>1?e:'0'+e); });
            let date = arr.slice(0, 3), time = arr.slice(3);
            return `${date.join(dd)}${md}${time.join(td)}`;
        }
        function getFormattedDate(){
            let d = new Date();
            let arr = [(d.getDate()).toString(), (d.getMonth()+1).toString(), d.getFullYear().toString()];
            arr.forEach((e,i,o)=>{ o[i] = (e.length>1?e:'0'+e); });
            return `${arr.join('.')}`;
        }
        function getFormattedTime(){
            let d = new Date();
            let arr = [d.getHours().toString(), d.getMinutes().toString()];
            arr.forEach((e,i,o)=>{ o[i] = (e.length>1?e:'0'+e); });
            return `${arr.join(':')}`;
        }
        function rgbToHex(array, hash){
            let str = hash?'#':'';
            for(let i = 0; i < 3; i++){
                if(array[i] < 16) str += '0';
                str += array[i].toString(16);
            }
            return str;
        }

        let aaIid = 0, lastActionTimeout = 0;
        function antiAfk(){
            if(aaIid){
                clearInterval(aaIid);
                qs('#canvas').removeEventListener('click', aaHandler);
                w.removeEventListener('click', aaHandler);
                w.removeEventListener('keydown', aaHandler);
                return;
            }
            qs('#canvas').addEventListener('click', aaHandler);
            w.addEventListener('click', aaHandler);
            w.addEventListener('keydown', aaHandler);
            aaIid = setInterval(()=>{
                lastActionTimeout++;
                if(lastActionTimeout >= 60){
                    setTimeout(()=>{
                        switch(Math.floor(Math.random() * 6)){
                            case 0: pt.action.invoke('turn head'); pt.action.invoke('turn head'); break;
                            case 1: pt.chat.sendMessage('/blink'); break;
                            case 3: pt.chat.sendMessage('/e'); break;
                            case 4: pt.action.invoke('boop'); break;
                            case 5: pt.chat.sendMessage('/yawn'); break;
                        }
                    }, Math.floor(Math.random() * 60000));
                }
            }, 10000);
        }
        function aaHandler(){ lastActionTimeout = 0; }

        function box(obj){
            if(typeof obj == 'string') obj = {text: obj, title: ' '};
            let mh = ce('div');
            merge(mh.style, { position: 'fixed', left:0, top:0, width:'100%', height:'100%', zIndex:999999, overflow:'hidden', overflowY:'auto', display:'flex', justifyContent:'center', alignItems:'center', cursor:'default', userSelect:'none' });
            let wrapper = ce('div'); wrapper.style.display='block'; wrapper.style.fontSize='120%';
            let header = ce('div'); header.innerText = obj.header??obj.title??'';
            merge(header.style, { width:'100%', padding:'0.7em', borderBottom:'solid 2px white' });
            let closeBtn = ce('span'); closeBtn.innerText = '\u2573';
            merge(closeBtn.style, { paddingLeft:'0.5em', cursor:'pointer', float:'right' });
            closeBtn.addEventListener('click', ()=>{
                (obj.noOverlay?wrapper:mh).parentNode.removeChild((obj.noOverlay?wrapper:mh));
                if(obj.onclose) obj.onclose();
            });
            let abox = ce('div');
            merge(abox.style, { background:'#212121', color:'white', border:'solid 2px white', borderRadius:'3px', width: obj.fixedSize?((obj.width??600)+'px'):'', height: obj.fixedSize?((obj.height??400)+'px'):'' });
            if(obj.noOverlay) merge(abox.style, { position:'absolute', left:'50%', top:'50%', transform:'translate(-50%, -50%)' });
            let text = ce('div'); text.style.padding='0.7em';
            if(obj.text) text.innerHTML = obj.text; else if(obj.elem) text.appendChild(obj.elem);
            else throw new Error('Необходимо задать свойство text или elem объекта.');
            header.appendChild(closeBtn); abox.appendChild(header); abox.appendChild(text); wrapper.appendChild(abox);
            if(obj.noOverlay) document.body.appendChild(wrapper);
            else { mh.appendChild(wrapper); document.body.appendChild(mh); }
            return {
                input: obj,
                box: (obj.noOverlay?wrapper:mh),
                close: (f)=>{ (obj.noOverlay?wrapper:mh).parentNode.removeChild((obj.noOverlay?wrapper:mh)); if(obj.onclose && !f) obj.onclose(); },
                hide: ()=>{ (obj.noOverlay?wrapper:mh).oldDisplay = (obj.noOverlay?wrapper:mh).style.display; (obj.noOverlay?wrapper:mh).style.display = 'none'; },
                show: ()=>{ (obj.noOverlay?wrapper:mh).style.display = (obj.noOverlay?wrapper:mh).oldDisplay; }
            };
        }

        function tweakerUI(){
            let d = ce('div'), cont = ce('div'), abox;
            cont.style.maxHeight = '20em'; cont.style.overflow = 'auto';
            for(let i in twOptions){
                let e = twOptions[i];
                let el = ce('div');
                merge(el.style, {padding: '5px', margin: '5px', borderRadius: '5px', background: '#171717', cursor: 'pointer'});
                el.innerText = e.name;
                el.addEventListener('click', ()=>{
                    let elem = ce('div'), des = ce('div'), inp = ce('input'), btn = ce('button'), bx;
                    des.innerText = e.description??'';
                    inp.type = e.type=='bool'?'checkbox':e.type;
                    if(e.type == 'bool') inp.checked = e.value;
                    else inp.value = e.value;
                    inp.style.display = 'block'; inp.style.margin = '1em auto';
                    btn.innerText = 'OK'; btn.className = 'btn btn-default'; btn.style.display = 'block'; btn.style.padding = '0.3em 2em'; btn.style.margin = '0 auto';
                    btn.addEventListener('click', ()=>{
                        twOptions[i].value = e.type=='bool'?inp.checked:inp.value;
                        bx.close();
                    });
                    elem.appendChild(des); elem.appendChild(inp); elem.appendChild(btn);
                    bx = box({ header: e.name, elem: elem });
                });
                cont.appendChild(el);
            }
            d.appendChild(cont);
            let btn = ce('button');
            btn.className = 'btn btn-default'; btn.style.display = 'block'; btn.style.padding = '0.3em 2em'; btn.style.margin = '1em auto'; btn.innerText = 'Сохранить';
            btn.addEventListener('click', ()=>{ saveToLS('twOptions', JSON.stringify(twOptions)); setTimeout(()=>location.reload(), 200); });
            d.appendChild(btn);
            abox = box({header: 'Настройки PTTW', elem: d});
        }

        // ===== НАСТРОЙКИ =====
        const SPAM_PHRASES = [
            "⛓️Соберёмся в ряд, будем сильны, Наши солдаты — в победе сильны!⛓️",
            "Восточный ветер, в бой зовёт, Империя Катана — враг нас не ждёт!",
            "⚡импᴇрия ᴋᴀᴛᴀнᴀ ʙᴄᴛрᴇᴛиᴛ бойцᴀ! чᴛо будᴇᴛ ᴄрᴀжᴀᴛьᴄя зᴀ нᴀᴄ до ᴋонцᴀ!⚡",
            "⛓️🕯Славные воины, крепка наша стена, Империя Катана — вечная война!🕯⛓️",
            "⛓️Клинки звенят, враги в бегство, Империя Катана — наше место!⛓️[12+]",
            "⚔️нᴇ ᴄᴛой ʙ ᴄᴛоронᴇ, ʙᴇдь ʙрᴇмя нᴀᴄᴛᴀло ʙᴄᴛупᴀй жᴇ ᴋ нᴀм и нᴀчни ʙᴄё ᴄ нᴀчᴀлᴀ!⚔️",
            "Собрался народ, вставай братва, Империя Катана — это игра!",
            "Восток , мы в строю, Силы природы — с нами в бою![тг]"
        ];
        const MIN_DELAY = 3000, MAX_DELAY = 5000;

        const DEFAULT_REPLY = "Для вступления или поиска информации напишите в тг @xGekata_EoK от Кью";
        const SCHEDULE_REPLY = "Расписание: [𒆜ʙᴩᴇʍя ᴄбоᴩоʙ ʙ 𝟐𝟎:𝟎𝟎/𝟐𝟎:𝟏𝟎 ᴨо ʍᴄᴋ𒆜]";
        const FRACTIONS_REPLY = "Фракций четыре, и их можно будет посмотреть в инфо канале";
        const TRIGGERS = [
            { words: ["расписание"], reply: SCHEDULE_REPLY },
            { words: ["сколько фракций", "фракции", "фракций"], reply: FRACTIONS_REPLY }
        ];

        let spamBotRunning = false, spamPaused = false, isSending = false, lastWhisperId = null, autoReplyInterval = null;

        function log(msg) {
            pt.chat.addMessage(`[LOG] ${msg}`, 'system');
        }

        function switchToPublicChat() {
            // Выход из ЛС командой /clearwhisperchat
            pt.chat.sendMessage('/clearwhisperchat');
            log('Вышли из ЛС командой /clearwhisperchat');
        }

        async function sendWhisperViaDoubleClick(author, message) {
            if (!author || !message) return;
            spamPaused = true;
            isSending = true;
            log(`Начинаю отправку ЛС для ${author}`);

            const lines = qsa('.chat-line-whisper, .chat-line-private');
            let targetLine = null;
            for (let i = lines.length - 1; i >= 0; i--) {
                const nameEl = qs('.chat-line-name-content', lines[i]);
                if (nameEl && nameEl.innerText === author) {
                    targetLine = lines[i];
                    break;
                }
            }
            if (!targetLine) {
                log(`❌ Не найдена строка чата от ${author}`);
                spamPaused = false; isSending = false;
                return;
            }

            const nameEl = qs('.chat-line-name-content', targetLine);
            nameEl.click();
            await new Promise(r => setTimeout(r, 150));
            nameEl.click();
            log('Двойной клик выполнен');

            await new Promise(r => setTimeout(r, 400));
            const inp = qs('.chat-textarea');
            if (inp) {
                inp.value = message;
                inp.dispatchEvent(new InputEvent('input'));
                await new Promise(r => setTimeout(r, 200));
                qs('[aria-label="Send message"]').click();
                log('Сообщение отправлено');
            } else {
                log('❌ Поле ввода не найдено');
            }

            await new Promise(r => setTimeout(r, 500));
            switchToPublicChat();

            await new Promise(r => setTimeout(r, 1000));
            spamPaused = false;
            isSending = false;
            log('Отправка завершена');
        }

        function spamLoop() {
            if (!spamBotRunning) return;
            if (isSending || spamPaused) {
                setTimeout(spamLoop, 500);
                return;
            }
            switchToPublicChat();
            const phrase = SPAM_PHRASES[Math.floor(Math.random() * SPAM_PHRASES.length)];
            pt.chat.sendMessage(phrase);
            setTimeout(spamLoop, Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY);
        }

        function startSpamBot() {
            if (spamBotRunning) return;
            spamBotRunning = true;
            spamPaused = false;
            isSending = false;
            log('Спам-бот и автоответчик запущены');
            spamLoop();
            if (autoReplyInterval) clearInterval(autoReplyInterval);
            autoReplyInterval = setInterval(checkForWhispers, 2000);
        }

        function stopSpamBot() {
            spamBotRunning = false;
            if (autoReplyInterval) { clearInterval(autoReplyInterval); autoReplyInterval = null; }
            log('Спам-бот остановлен');
        }

        function checkForWhispers() {
            if (!spamBotRunning || isSending) return;

            const recentMessages = pt.chat.getMessages(0, 5);
            if (!recentMessages.length) return;

            for (const msg of recentMessages) {
                if (msg.type !== 'whisper') continue;
                // Игнорируем системные сообщения и команды
                if (msg.author === 'system' || msg.author === 'meta') continue;
                if (msg.text.startsWith('/w') || msg.text.trim() === '') continue;

                const msgId = `${msg.author}:${msg.text}`;
                if (lastWhisperId === msgId) continue;
                lastWhisperId = msgId;

                log(`Получено ЛС от ${msg.author}: "${msg.text}"`);

                const lowerText = msg.text.toLowerCase();
                let triggeredReply = null;
                for (const trigger of TRIGGERS) {
                    for (const word of trigger.words) {
                        if (lowerText.includes(word)) {
                            triggeredReply = trigger.reply;
                            break;
                        }
                    }
                    if (triggeredReply) break;
                }

                if (triggeredReply) {
                    log('Найден триггер');
                    sendWhisperViaDoubleClick(msg.author, triggeredReply);
                    setTimeout(() => sendWhisperViaDoubleClick(msg.author, DEFAULT_REPLY), 1000);
                } else {
                    log('Отправляю дефолтный ответ');
                    sendWhisperViaDoubleClick(msg.author, DEFAULT_REPLY);
                }
                break;
            }
        }

        // ===== ИНИЦИАЛИЗАЦИЯ =====
        let q = [];
        location.search.slice(1).split('&').forEach(e=>{
            let arr = e.split('=');
            q[arr[0]] = decodeURIComponent(arr[1]);
        });

        twOptions = readFromLS('twOptions')?JSON.parse(readFromLS('twOptions')):{};
        if(q.tw_reset_options || !twOptions.hide_support_btn){
            twOptions.hide_support_btn = { name: 'Скрыть кнопку поддержки', type: 'bool', value: false };
        }
        if(q.tw_reset_options || !twOptions.hide_rules){
            twOptions.hide_rules = { name: 'Скрыть правила', description: 'Может исчезнуть кнопка начала игры', type: 'bool', value: false };
        }
        if(q.tw_reset_options || !twOptions.color_picker){
            twOptions.color_picker = { name: 'Выбор цвета с карты', type: 'bool', value: true };
        }
        if(q.tw_reset_options || !twOptions.allow_html_in_chat){
            twOptions.allow_html_in_chat = { name: 'Разрешить HTML в чате', type: 'bool', value: false };
        }
        if(q.tw_reset_options || !twOptions.chat_color){
            twOptions.chat_color = { name: 'Цвет сообщений в чате', type: 'color', value: '#000000' };
        }
        if(q.tw_reset_options || !twOptions.do_not_highlight_supporter_messages){
            twOptions.do_not_highlight_supporter_messages = { name: 'Не выделять цветом сообщения саппортеров', type: 'bool', value: false };
        }
        if(q.tw_reset_options || !twOptions.disable_typing_animation){
            twOptions.disable_typing_animation = { name: 'Отключить анимацию печатания', type: 'bool', value: false };
        }
        if(q.tw_reset_options || !twOptions.anti_afk){
            twOptions.anti_afk = { name: 'Анти-АФК бот', type: 'bool', value: false };
        }
        if(q.tw_reset_options || !twOptions.brightness){
            twOptions.brightness = { name: 'Яркость', description: 'Яркость в процентах', type: 'number', value: '100' };
        }
        if(q.tw_reset_options || !twOptions.move_chat_input_box){
            twOptions.move_chat_input_box = { name: 'Передвинуть окно ввода в чат выше', type: 'bool', value: false };
        }
        if(q.tw_reset_options || !twOptions.pass_keys_in_chat){
            twOptions.pass_keys_in_chat = { name: 'Движение с открытым чатом', type: 'bool', value: false };
        }
        if(q.tw_reset_options || !twOptions.translate_messages){
            twOptions.translate_messages = { name: 'Переводить сообщения', type: 'bool', value: true };
        }
        if(q.tw_reset_options || !twOptions.stats_color){
            twOptions.stats_color = { name: 'Цвет статистики', type: 'color', value: '#000000' };
        }
        saveToLS('twOptions', JSON.stringify(twOptions));

        if(!readFromLS('twScripts') || q.tw_reset_scripts){
            saveToLS('twScripts', '[]');
        }
        twScripts = JSON.parse(readFromLS('twScripts'));

        if(q.tw_add_script){
            if(confirm('Добавить этот скрипт?\n\n'+q.tw_add_script)) {
                location.replace('/');
            }
        }

        let psml = false, pgl = false;

        setTimeout(function csml(){
            if(!psml && qs('play-box')) startMenuLoaded();
            psml = qs('play-box');
            setTimeout(csml, 200);
        }, 200);

        setTimeout(function cgl(){
            if(!pgl && document.body.className.includes('playing')) gameLoaded();
            pgl = document.body.className.includes('playing');
            setTimeout(cgl, 200);
        }, 200);

        function startMenuLoaded(){
            if(onstartmenuloaded) onstartmenuloaded();

            if(readFromLS('disableWsHook') == 'false'){
                wshook(({socket,data})=>{
                    if(w.twDebug?.logInRequests) console.log(data);
                    if(!socket._send){
                        console.log('injecting hook to websocket object...');
                        ws = socket;
                        socket._send = socket.send;
                        socket.send = msg=>{
                            if(w.twDebug?.logOutRequests && !(msg instanceof ArrayBuffer) && !(msg.length == 3 && msg[0]==0 && msg[1]==64 && msg[2]==0)) console.log(msg);
                            if(pt.wshook.send.length > 0) pt.wshook.send.forEach(f=>f(data));
                            socket._send(msg);
                        }
                    }
                    if(pt.wshook.receive.length > 0) pt.wshook.receive.forEach(f=>f(data));
                });
            }else{
                console.log('wshook disabled');
            }

            if(twOptions.hide_support_btn.value){
                let iid = setInterval(()=>{
                    let supportBtn = qs('support-button');
                    try{ supportBtn.parentNode.removeChild(supportBtn); }catch(e){}
                }, 200);
            }

            if(twOptions.hide_rules.value){
                let playNotice = document.querySelector('play-notice');
                playNotice.parentNode.removeChild(playNotice);

                let playabox = document.querySelector('play-box');
                for(let i = 0; i < playabox.children.length; i++){
                    let e = playabox.children.item(i);
                    if(e.nodeName != 'BUTTON') playabox.removeChild(e);
                }
            }

            if(q.tw_autoplay !== undefined){
                qs('button.btn.btn-lg.btn-success.text-ellipsis.flex-grow-1').click();
            }
        }

        function gameLoaded(){
            pt.gameLoadedListeners.forEach(f=>f());
            if(ongameloaded) ongameloaded();

            let ta = qs('.chat-textarea'), cb = qs('.chat-box');

            if(pt.chat.fta){
                ta.onfocus = ()=>pt.chat.fta.focus();
            }else{
                let fta = ta.cloneNode(true);
                pt.chat.fta = fta;
                merge(ta.style, { position: 'absolute', left: '-9999px', top: '-9999px' });
                ta.parentNode.appendChild(fta);

                if(twOptions.move_chat_input_box.value){
                    cb.style.position = 'absolute';
                    cb.style.top = '-6em';
                }

                let settingTA = false;

                ta.onfocus = ()=>fta.focus();

                function ftaSend(val){
                    val = val.replaceAll('\r', '').replaceAll('\n', '');
                    let arr = val.split(' ');
                    arr[0] = arr[0].replace('/', '');

                    if(val[0] == '/' && pt.chat.commands[arr[0]]){
                        pt.chat.commands[arr[0]](arr.slice(1));
                        pt.chat.sendMessage('');
                    }else{
                        pt.chat.hook.send.forEach(hook=>{
                            val = hook(val);
                        });
                        pt.chat.sendMessage(val);
                    }
                    fta.value = '';
                }

                pt.chat.ftaSend = ftaSend;

                fta.addEventListener('input', ()=>{
                    if(fta.value.includes('\n')){
                        ftaSend(fta.value);
                    }
                    if(!twOptions.disable_typing_animation.value){
                        settingTA = true;
                        ta.value = fta.value;
                        settingTA = false;
                        ta.dispatchEvent(new InputEvent('input'));
                    }
                });

                let sendBtn = fta.parentNode.parentNode.querySelectorAll('button')[1];
                sendBtn.onclick = e=>{
                    e.stopImmediatePropagation();
                    ftaSend(fta.value);
                    return false;
                }

                fta.addEventListener('keydown', e=>{
                    if(e.key == 'Escape') pt.chat.sendMessage('');

                    if(twOptions.pass_keys_in_chat.value){
                        if(Object.values(pt.keyCodes).includes(e.keyCode)){
                            e.preventDefault();
                            dispatchEvent(new KeyboardEvent('keydown', { keyCode: e.keyCode }));
                            return false;
                        }
                    }
                });

                fta.addEventListener('keyup', e=>{
                    if(twOptions.pass_keys_in_chat.value){
                        if(Object.values(pt.keyCodes).includes(e.keyCode)){
                            e.preventDefault();
                            dispatchEvent(new KeyboardEvent('keyup', { keyCode: e.keyCode }));
                            return false;
                        }
                    }
                });

                w.addEventListener('keyup', e=>{
                    if(e.keyCode == 191 && fta.value == ''){
                        fta.focus();
                        fta.value = '/';
                    }

                    pt.keyBind.listener(e);
                });
            }

            let ruRegex = /^[а-яёА-ЯЁ0-9\-\.\?\!\)\(\,\:\/\-\*\@\#\$\%\^\&\_\=\[\]\;\"\'\<\>\{\}\~\`\\\+ ]+$/;

            let logEl = qs('.chat-log-scroll-inner');
            new MutationObserver(nodes=>{
                if(nodes.filter(n=>n.addedNodes.length > 0).length == 1){
                    let node = nodes.find(n=>n.addedNodes.length > 0).addedNodes[0];
                    if(!pt.chat.disableReceive && !node.className.includes('meta-line')){
                        pt.chat.hook.receive.forEach(hook=>hook(pt.chat.getMessageByElement(node)));
                    }
                }

                nodes.forEach(nd=>{
                    if(nd.addedNodes?.length > 0){
                        nd.addedNodes.forEach(node=>{
                            let msg = qs('.chat-line-message', node);
                            if(!msg || node.className.includes('meta-line')) return;

                            if(twOptions.translate_messages.value){
                                let text = msg.innerText;

                                if(!qs('a', msg) && !node.className.includes('system') && text.trim().length > 0 && !ruRegex.test(text)){
                                    let trEl = document.createElement('a');
                                    trEl.href = 'javascript:void(0)';
                                    trEl.innerText = 'Перевести';
                                    trEl.addEventListener('click', async e=>{
                                        e.preventDefault();
                                        let translated = await (await fetch('https://ryzhpolsos.ru/pttw/api/translate.php?text='+encodeURIComponent(text))).text();
                                        msg.innerText = translated;
                                        return false;
                                    });

                                    msg.append(' ', trEl);
                                }
                            }
                        });
                    }
                });
            }).observe(logEl, { childList: true });

            pt.chat.getMessages().forEach(msg=>{
                if(!['system', 'meta-line'].includes(msg.type)){
                    if(twOptions.translate_messages.value){
                        if(!qs('.chat-line-message a', msg.elem) && msg.text.trim().length > 0 && !ruRegex.test(msg.text)){
                            let trEl = document.createElement('a');
                            trEl.href = 'javascript:void(0)';
                            trEl.innerText = 'Перевести';
                            trEl.addEventListener('click', async e=>{
                                e.preventDefault();
                                msg.text = await (await fetch('https://ryzhpolsos.ru/pttw/api/translate.php?text='+encodeURIComponent(msg.text))).text();
                                pt.chat.editMessage(msg);
                                return false;
                            });

                            qs('.chat-line-message', msg.elem).append(' ', trEl);
                        }
                    }
                }
            });

            pt.chat.registerCommand('options', tweakerUI);

            if(twOptions.do_not_highlight_supporter_messages.value){
                if(!qs('#no-sup-style')){
                    let st = ce('style');
                    st.id = 'no-sup-style';

                    let sttxt = '';
                    for(let i = 0; i < 10; i++){
                        sttxt += `.chat-line-supporter-${i} { color: inherit; }\n`;
                    }

                    st.appendChild(document.createTextNode(sttxt));
                    document.head.appendChild(st);
                }
            }

            if(twOptions.color_picker.value){
                window.addEventListener('mouseup', e=>{
                    if(e.altKey) alert(rgbToHex(pt.graphics.readPixel(e.clientX, e.clientY)));
                });
                window.addEventListener('mousemove', e=>{
                    if(e.altKey) e.target.style.cursor = 'crosshair';
                    else e.target.style.cursor = null;
                });
            }

            if(twOptions.allow_html_in_chat.value){
                setInterval(()=>{
                    qsa('.chat-line-message').forEach(e=>{
                        if(e.innerText.includes('<') && e.innerText.includes('>')){
                            e.innerHTML = e.innerText;
                        }
                    });
                }, 200);
            }

            if(twOptions.chat_color.value != '#000000'){
                if(qs('#tw-chat-color')) return;

                let st = document.createElement('style');
                st.id = 'tw-chat-color';
                st.appendChild(document.createTextNode(`div.chat-line{color: ${twOptions.chat_color.value};}`));
                document.body.appendChild(st);
            }

            if(twOptions.anti_afk.value){
                antiAfk();
            }

            if(+twOptions.brightness.value != 100){
                qs('#canvas').style.filter = `brightness(${+twOptions.brightness.value / 100})`;
            }

            if(twOptions.stats_color.value != '#000000'){
                qs('#stats').style.color = twOptions.stats_color.value;
            }

            setInterval(()=>{
                if(qs('.settings-height')){
                    try{
                        if(!qs('#pttw-options-btn')){
                            function createButton(text, onclick, id){
                                let btn = ce('a');
                                if(id) btn.id = id;
                                btn.className = 'dropdown-item mb-1';
                                btn.onclick = e=>{
                                    e.preventDefault();
                                    onclick();
                                    return false;
                                }

                                let set = qs('.settings-height'), sb = qs('a[title="Open game settings"]');
                                btn.appendChild(qs('fa-icon', sb).cloneNode(true));
                                btn.append(text);
                                set.insertBefore(btn, sb);
                            }

                            createButton('Настройки PTTW', tweakerUI, 'pttw-options-btn');

                            pt.menuButton.list.forEach(btn=>{
                                createButton(btn.text, btn.func);
                            });
                        }
                    }catch(e){}
                }

                if(qs('.chat-log-tabs')){
                    if(!qs('#pttw-chat-spam-btn')){
                        let tabs = qs('.chat-log-tabs');
                        let el = ce('button');
                        merge(el.style, {
                            marginLeft: '0.3em'
                        });
                        el.id = 'pttw-chat-spam-btn';
                        el.className = 'btn btn-default';
                        el.innerText = 'Спам-бот';
                        el.addEventListener('click', function() {
                            if (spamBotRunning) {
                                stopSpamBot();
                                this.innerText = 'Спам-бот';
                            } else {
                                startSpamBot();
                                this.innerText = 'Стоп спам';
                            }
                        });
                        tabs.appendChild(el);
                    }
                }
            }, 20);
        }
    }catch(e){
        if(confirm('Произошла критическая ошибка при инициализации мода: \n' + e + '\n\nОтправить отчёт о проблеме? Будет передан только указанный выше текст ошибки и некоторая диагностическая информация, например, версия браузера.')){
            fetch('https://ryzhpolsos.ru/pttw/api/sendErrorReport.php', {
                method: 'POST',
                body: JSON.stringify({
                    error: e.toString(),
                    userAgent: navigator.userAgent,
                    userAgentData: navigator.userAgentData
                })
            });
        }
    }
})();