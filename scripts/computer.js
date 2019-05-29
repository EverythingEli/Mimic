
//
//  computer.js
//  GravityScore and 1lann
//



//
//    Setup
//


var Computer = function(id, advanced) {
	id = id || 0;
	advanced = advanced || false;

	this.id = id;
	this.advanced = advanced;
	this.label = null;

	this.L = C.lua_open();
	
	this.image = null
	
	this.width = config.width;
	this.height = config.height;

	this.reset();
	this.setupFS();
	this.setupPalette();
	this.installAPIs();
}


Computer.prototype.reset = function() {
	this.eventStack = [];
	this.lastTimerID = 0;

	this.startClock = null;
	this.coroutineClock = null;

	this.thread = null;
	this.alive = false;
	this.hasErrored = false;

	this.cursor = {};
	this.cursor.x = 1;
	this.cursor.y = 1;
	this.cursor.blink = false;

	this.colors = {};
	this.colors.background = "0";
	this.colors.foreground = "f";
	
	this.palette = {};
	this.paletteCache = {};
	
	if (this.websockets) {
		for (var id in this.websockets) {
			i=this.websockets[id];
			if (i.open) {
				try {
					i.socket.close();
				} catch (e) {}
			}
		}
	}
	this.websockets = [];

	this.shouldShutdown = false;
	this.shouldReboot = false;
}



//
//    APIs
//


Computer.prototype.installStartupScript = function(contents) {
	if (typeof(contents) == "string") {
		C.lua_pushstring(this.L, contents);
		C.lua_setglobal(this.L, "startupScript");
	}
}


Computer.prototype.setupFS = function() {
	var rootPath = fsHelper.getCCPath("/", this.id);
	if (!filesystem.isDir(rootPath)) {
		filesystem.makeDir(rootPath);
		if (config.romtweaksenabled) filesystem.copy("/rom", rootPath+"rom");
	}
}


Computer.prototype.installAPIs = function() {
	var apis = {
		"bit32": bit32API,
		"fs": fsAPI,
		"http": httpAPI,
		"os": osAPI,
		"peripheral": peripheralAPI,
		"rs": redstoneAPI,
		"redstone": redstoneAPI,
		"term": termAPI,
	};

	Lua5_1.Runtime.functionPointers = [];
	for (var i = 1; i <= 512; i++) {
		Lua5_1.Runtime.functionPointers.push(null);
	}

	C.luaL_openlibs(this.L);

	for (var api in apis) {
		if (typeof(apis[api]) == "function") {
			C.lua_pushcfunction(this.L, Lua5_1.Runtime.addFunction(apis[api]));
			C.lua_setfield(this.L, 1, api)
		} else {
			C.lua_newtable(this.L);
			for (var key in apis[api]) {
				C.lua_pushcfunction(this.L, Lua5_1.Runtime.addFunction(apis[api][key]));
				C.lua_setfield(this.L, 1, key)
			}
			C.lua_setglobal(this.L, api);
		}
	}
}

Computer.prototype.setupPalette = function() {
	this.palette[Math.pow(2, 0)] = 0xF0F0F0;
	this.palette[Math.pow(2, 1)] = 0xF2B233;
	this.palette[Math.pow(2, 2)] = 0xE58FD8;
	this.palette[Math.pow(2, 3)] = 0x99B2F2;
	this.palette[Math.pow(2, 4)] = 0xDEDE6C;
	this.palette[Math.pow(2, 5)] = 0x7FCC19;
	this.palette[Math.pow(2, 6)] = 0xF2B2CC;
	this.palette[Math.pow(2, 7)] = 0x4C4C4C;
	this.palette[Math.pow(2, 8)] = 0x999999;
	this.palette[Math.pow(2, 9)] = 0x4C99B2;
	this.palette[Math.pow(2, 10)]= 0xB266E5;
	this.palette[Math.pow(2, 11)]= 0x3366CC;
	this.palette[Math.pow(2, 12)]= 0x7F664C;
	this.palette[Math.pow(2, 13)]= 0x57A64E;
	this.palette[Math.pow(2, 14)]= 0xCC4C4C;
	this.palette[Math.pow(2, 15)]= 0x111111;
	
	for (var i in this.palette) {
		this.paletteCache[i] = render.getFont();
	}
}



//
//    Lua Thread
//


Computer.prototype.launch = function() {
	var executableCode = code.getAll();
	if (core.startupScript) {
		filesystem.write("computers/"+this.id+"/startup", core.startupScript)
	}

	this.thread = C.lua_newthread(this.L);
	C.luaL_loadbuffer(this.thread, executableCode, executableCode.length, "mimic.native");

	this.alive = true;
	this.startClock = Date.now();
	this.coroutineClock = Date.now();

	var result = C.lua_resume(this.thread, 0);

	if (result != C.LUA_YIELD && result != 0) {
		var errorCode = C.lua_tostring(this.thread, -1);
		var trace = C.lua_tostring(this.thread, -3);

		console.log("Intialization Error: ", errorCode);
		console.log("Trace: ", trace);
		console.log("Thread closed");
		this.thread.alive = false;

		render.bsod(
			"FATAL : BIOS ERROR",
			["Error: " + errorCode, "Check the console for more details"]);
		this.hasErrored = true;
	}
}


Computer.prototype.pushEventStackToThread = function() {
	for (var i in this.eventStack[0]) {
		var argument = this.eventStack[0][i];

		if (typeof(argument) == "string") {
			C.lua_pushstring(this.thread, argument);
		} else if (typeof(argument) == "number") {
			C.lua_pushnumber(this.thread, argument);
		} else if (typeof(argument) == "boolean") {
			C.lua_pushboolean(this.thread, argument ? 1 : 0);
		} else if (typeof(argument) == "object") {
			C.lua_pushstring(this.thread, core.serializeTable(argument));
		} else if (argument) {
			C.lua_pushstring(this.thread, argument.toString());
		}
	}
}


Computer.prototype.handleResumeResult = function(result, threadLoopID) {
	if (result == C.LUA_YIELD) {
		if (this.shouldShutdown) {
			this.shutdown();
		} else if (this.shouldReboot) {
			this.reboot();
		}
	} else if (result == 0) {
		clearInterval(threadLoopID);
		this.alive = false;
	} else {
		clearInterval(threadLoopID);
		this.alive = false;

		if (!this.hasErrored) {
			render.bsod("FATAL : THREAD CRASH",
				["The Lua thread has crashed!",
				"Check the console for more details"]);
			this.hasErrored = true;
		}

		console.log("Error: ", C.lua_tostring(this.thread, -1));
	}
}


Computer.prototype.pushEventStack = function(threadLoopID) {
	var stackRuns = 0;

	for (var i = 1; i <= this.eventStack.length; i++) {
		stackRuns++;
		if (stackRuns > 256 || !this.alive) {
			return;
		}

		if (this.eventStack.length == 0) {
			clearInterval(threadLoopID);
			continue;
		}

		var argumentCount = this.eventStack[0].length;
		this.pushEventStackToThread();

		this.eventStack.splice(0, 1);
		this.coroutineClock = Date.now();

		var result;
		try {
			result = C.lua_resume(this.thread, argumentCount);
		} catch (e) {
			clearInterval(threadLoopID);
			this.alive = false;

			if (!this.hasErrored) {
				console.log("Javascript error", e);
				render.bsod("FATAL : JAVASCRIPT ERROR",
					["A fatal Javascript error has occured.",
					"Check the console for more details."]);
				this.hasErrored = true;
				return;
			}
		}

		this.handleResumeResult(result, threadLoopID);
	}
}


Computer.prototype.resume = function() {
	var _this = this;
	var threadLoopID = setInterval(function() {
		_this.pushEventStack.call(_this, threadLoopID);
	}, 10);
}



//
//    Termination
//


Computer.prototype.shutdown = function() {
	render.clear();

	this.cursor.blink = false;
	render.cursorBlink();

	this.coroutineClock = Date.now();
	if (this.L) {
		C.lua_close(this.L);
		this.L = null;
	}

	this.reset();
}


Computer.prototype.reboot = function() {
	this.shutdown();

	render.clear();
	this.reset();
	this.coroutineClock = Date.now();
	this.L = C.lua_open();

	this.installAPIs();
	this.launch();
}


Computer.prototype.turnOn = function() {
	if (!this.alive || !this.L) {
		if (this.L) {
			C.lua_close(this.L);
		}

		render.clear();
		this.reset();
		this.coroutineClock = Date.now();
		this.L = C.lua_open();

		this.installAPIs();
		this.launch();
	}
}


Computer.prototype.terminate = function() {
	if (this.alive && (this.L != null)) {
		this.eventStack.unshift(["terminate"]);
		this.resume();
	}
}



//
//    Display Properties
//


Computer.prototype.getActualSize = function() {
	var actualWidth = config.cellWidth * config.terminalScale;
	var actualHeight = config.cellHeight * config.terminalScale;
	var width = this.width * actualWidth + 2 * config.borderWidth;
	var height = this.height * actualHeight + 2 * config.borderHeight;

	return {"width": width, "height": height};
}


Computer.prototype.getLocation = function() {
	var minX = 300;
	var minY = 0;

	if (ui.isFullscreen) {
		minX = 0;
	}

	var size = this.getActualSize();
	var x = (window.innerWidth - minX) / 2 - size.width / 2 + minX;
	var y = (window.innerHeight - minY) / 2 - size.height / 2 + minY;

	x = Math.max(x, minX);
	y = Math.max(y, minY);

	return {"x": x, "y": y};
}
