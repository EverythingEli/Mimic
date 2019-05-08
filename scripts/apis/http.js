
//
//  http.js
//  GravityScore and 1lann
//


var httpHelper = {}

httpHelper.checkURL = function(url) {
	//Handwrote this
	if (!navigator.onLine) {
		return [false, "Unknown host"];
	}
	
	var ios = url.indexOf(":");
	if (!ios) return [false, "URL malformed"];
	var d = url.substring(0, ios);
	if (!(d=="http"||d=="https")) return [false, "URL malformed"];
	if (url.substring(ios+1, ios+3)!="//") return [false, "Domain not permitted"];
	
	//Found this online
	try {
		new URL(url);
		return [true];
	} catch (e) {
		return [false, "URL malformed"];  
	}
}

httpHelper.checkWSURL = function(url) {
	//Handwrote this
	var ios = url.indexOf(":");
	if (!ios) return [false, "URL malformed"];
	var d = url.substring(0, ios+3);
	if (!(d=="ws://"||d=="wss://")) return [false, "URL malformed"];
	
	//Found this online
	try {
		new URL(url);
		return [true];
	} catch (e) {
		return [false, "URL malformed"];  
	}
}

httpHelper.request = function(url, callback, postData) {
	var tocanceled = false;
	setTimeout(function() {
		if (tocanceled) return;
		tocanceled = true;
		computer.eventStack.push([
			"http_bios", url, 0
		]);
	}, 3000);
	
	var r = new XMLHttpRequest();
	r.onload = function(){
		if (tocanceled) return;
		tocanceled = true;
		
		if (r.status == 0) {
			setTimeout(function(){httpHelper.request(url, mode, callback)}, 1000);
			return;
		}
		
		callback(r);
	};
	
	var mode = !postData?"GET":"POST"
	r.open(mode, config.corsproxy.replace("%s", url).replace("%m", mode), true);
	if (mode == "POST") r.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	if (config.withCorsAnywhereSupport) {
		r.setRequestHeader("x-requested-with", "XMLHttpRequest");
	}
	r.send(postData);
}

//HTTP API
var httpAPI = {};

httpAPI.request = function(L) {
	var computer = core.getActiveComputer();
	var url = C.luaL_checkstring(L, 1);
	var postData = (C.lua_type(L, 2) != -1 && C.lua_type(L, 2) != C.LUA_TNIL)?C.luaL_checkstring(L, 2):null;
	
	var ud = httpHelper.checkURL(url);
	//TODO: Header support
	if (!ud[0]) {
		C.lua_pushboolean(L, false);
		C.lua_pushstring(L, ud[1]);
		
		return 2;
	}

	httpHelper.request(url, function(r) {
		var event = [
			"http_bios", url, r.status, r.responseText
		];

		//From https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/getAllResponseHeaders
		var headers = r.getAllResponseHeaders()
		if (headers) {
			headers.trim().split(/[\r\n]+/).forEach(function(line) {
				var parts = line.split(': ');
				event.push(parts.shift()); //Header
				event.push(parts.join(': ')); //Value
			});
		}
		//End From
		computer.eventStack.push(event);
	}, postData);
	
	C.lua_pushboolean(L, true);

	return 1;
}

httpAPI.websocket = function(L) {
	var computer = core.getActiveComputer();
	var url = C.luaL_checkstring(L, 1);
	
	var ud = httpHelper.checkWSURL(url);
	if (!ud[0]) {
		C.lua_pushboolean(L, false);
		C.lua_pushstring(L, ud[1]);
		
		return 2;
	}
	
	var websockets = computer.websockets;
	
	var ws = new WebSocket(url);
	//Sadly, header support will not be possible here
	var closeDisabled = false;
	ws.onerror = function(event){
		var err = "Invalid handshake response: Unknown";
		computer.eventStack.push(["websocket_failure", url, err]);
		closeDisabled = true;
	}
	ws.onopen = function(){
		computer.eventStack.push(["websocket_bios", url, websockets.length]);
		var l = websockets.length;
		websockets[l] = {open:true, socket:ws, id:l};
		websockets[ws] = websockets[l];
	}
	ws.onmessage = function(event){
		computer.eventStack.push(["websocket_message", url, event.data]);
	}
	ws.onclose = function(event){
		if (!websockets[ws]) return;
		websockets[ws].open = false;
		if (!closeDisabled) {
			computer.eventStack.push(["websocket_close", url]);
		}
	}
	
	C.lua_pushboolean(L, true);
	
	return 1;
}
httpAPI.wsdo = function(L) {
	var computer = core.getActiveComputer();
	var websockets = computer.websockets;
	
	var id = C.luaL_checknumber(L, 1);
	var m = C.luaL_checkstring(L, 2);
	
	var mwso = websockets[id];
	var mws = websockets[id].socket;
	
	if (m == "cc") {
		C.lua_pushboolean(L, mwso.open);
		
		return 1;
	}
	if (m == "send") {
		var d = C.luaL_checkstring(L, 3);
		mws.send(d);
		
		return 0;
	}
	if (m == "close") {
		mws.close();
		
		return 0;
	}
}

httpAPI.checkURL = function(L) {
	var computer = core.getActiveComputer();
	var url = C.luaL_checkstring(L, 1);
	
	var tocanceled = false;
	setTimeout(function() {
		if (tocanceled) return;
		tocanceled = true;
		computer.eventStack.push([
			"http_check", url, false, "Unknown host"
		]);
	}, 3000);
	
	var ud = httpHelper.checkURL(url);
	if (!ud[0]) {
		C.lua_pushboolean(L, false);
		C.lua_pushstring(L, ud[1]);
		
		return 2;
	}
		
	r = new XMLHttpRequest();
	r.addEventListener("load", function() {
		if (tocanceled) return;
		tocanceled = true;
		
		var good = r.status >= 200 && r.status < 400;
		var event = [
			"http_check", url, good
		];
		if (!good) event.push("Invalid URL")
		computer.eventStack.push(event);
	});
	r.open("GET", config.corsproxy.replace("%s", url), true);
	if (config.withCorsAnywhereSupport) {
		r.setRequestHeader("x-requested-with", "XMLHttpRequest");
	}
	r.send();
	
	C.lua_pushboolean(L, true);
	C.lua_pushnil(L);

	return 2;
}
