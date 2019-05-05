
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
	var d = url.substring(0, ios+2);
	if (!(d=="ws://"||d=="wss://")) return [false, "URL malformed"];
	
	//Found this online
	try {
		new URL(url);
		return [true];
	} catch (e) {
		return [false, "URL malformed"];  
	}
}

var httpAPI = {};

httpAPI.request = function(L) {
	var computer = core.getActiveComputer();
	var url = C.luaL_checkstring(L, 1);
	var postData = (C.lua_type(L, 2) != -1 && C.lua_type(L, 2) != C.LUA_TNIL)?C.luaL_checkstring(L, 2):null;
	
	console.log(postData)
	
	var ud = httpHelper.checkURL(url);
	if (!ud[0]) {
		C.lua_pushboolean(L, false);
		C.lua_pushstring(L, ud[1]);
		
		return 2;
	}

	var cr
	cr = function() {
		var tocanceled = false;
		setTimeout(function() {
			if (tocanceled) return;
			tocanceled = true;
			computer.eventStack.push([
				"http_bios", url, 0
			]);
		}, 3000);
		
		var r = new XMLHttpRequest();
		r.onload = function() {
			if (tocanceled) return;
			tocanceled = true;
			
			if (r.status == 0) {
				setTimeout(cr, 1000);
				return;
			}
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
		};
		
		var mode = !postData?"GET":"POST"
		console.log(mode)
		r.open(mode, config.corsproxy.replace("%s", url).replace("%m", mode), true);
		if (mode == "POST") r.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		if (config.withCorsAnywhereSupport) {
			r.setRequestHeader("x-requested-with", "XMLHttpRequest");
		}
		r.send(postData);
	}
	
	cr();
	
	C.lua_pushboolean(L, true);

	return 1;
}

httpAPI.websocket = function(L) {
	var computer = core.getActiveComputer();
	var url = C.luaL_checkstring(L, 1);
	
	var ud = httpHelper.checkURL(url);
	if (!ud[0]) {
		C.lua_pushboolean(L, false);
		C.lua_pushstring(L, ud[1]);
		
		return 2;
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
