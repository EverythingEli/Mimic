
//
//  http.js
//  GravityScore and 1lann
//


var httpHelper = {}

httpHelper.checkURL = function(url) {
	//Handwrote this
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

var httpAPI = {};

httpAPI.request = function(L) {
	var computer = core.getActiveComputer();
	var url = C.luaL_checkstring(L, 1);
	var postData = (C.lua_type(L, 1) != -1 && C.lua_type(L, 1) != C.LUA_TNIL)?C.luaL_checkstring(L, 1):null;
	
	var ud = httpHelper.checkURL(url);
	if (!ud[0]) {
		C.lua_pushboolean(L, false);
		C.lua_pushstring(L, ud[1]);
		
		return 2;
	}
	
	r = new XMLHttpRequest();
	r.addEventListener("load", function() { //Assumes success
		computer.eventStack.push([
			"http_bios", url, r.status, null, r.responseText
		]);
	});
	r.open(!postData?"GET":"POST", config.proxy.replace("%s", url), true);
	r.setRequestHeader("x-requested-with", document.location);
	r.send(postData);
	
	C.lua_pushboolean(L, true);

	return 1;
}

httpAPI.websocket = function() {
	
}

httpAPI.checkURL = function(L) {
	var computer = core.getActiveComputer();
	var url = C.luaL_checkstring(L, 1);
	
	var ud = httpHelper.checkURL(url);
	if (!ud[0]) {
		C.lua_pushboolean(L, false);
		C.lua_pushstring(L, ud[1]);
		
		return 2;
	}
	
	r = new XMLHttpRequest();
	r.addEventListener("load", function() {
		computer.eventStack.push([
			"http_check", url, (r.status >= 200 && r.status < 400)
		]);
	});
	r.open("GET", config.proxy.replace("%s", url), true);
	r.setRequestHeader("x-requested-with", document.location);
	r.send();
	
	C.lua_pushboolean(L, true);
	C.lua_pushnil(L);

	return 2;
}
