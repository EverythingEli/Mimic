//
//  core.js
//  GravityScore and 1lann
//


var lua5_1 = lua5_1||{};

var core = {};
var C;



//
//    Utilities
//


String.prototype.repeat = function(num) {
	return new Array(num + 1).join(this);
}


core.serializeTable = function(table) {
	var construct = "{";

	for (var i in table) {
		var name = table[i].replace("\"", "\\\"");
		var index = (parseInt(i) + 1).toString;

		construct += "[" + index + "]=\"" + name + "\",";
	}

	construct = construct + "}";

	return construct;
}



//
//    Computers
//


core.createComputer = function(id, advanced) {
	core.computers[id] = new Computer(id, advanced);
	return core.computers[id];
}

core.activeComputer = 0;
core.getActiveComputer = function() {
	if (core.computers && core.computers[core.activeComputer]) {
		return core.computers[core.activeComputer];
	} else {
		return undefined;
	}
}
core.setActiveComputer = function(id) {
	var oldComputer = core.computers[core.activeComputer] || core.computers[0];
	if(oldComputer) {
		oldComputer.image = context.getImageData(0, 0, canvas.width, canvas.height);
	}
	
	//Prevent weird cursor thing by clearing overlay
	//Better than the fillRect function, as user does not see black screen
	overlayContext.putImageData(new ImageData(overlayCanvas.width, overlayCanvas.height), 0, 0);
	
	core.activeComputer = id;
	var computer = core.computers[core.activeComputer]
	if (computer && computer.image) {
		context.putImageData(computer.image, 0, 0);
	}
	if (!computer) {
		computer = core.createComputer(id, true);
		computer.launch();
	}
	return computer;
}



//
//    Startup Script
//


core.fetchStartupScriptURL = function() {
	var paste = $.url().param("pastebin");
	var file = $.url().param("url");

	var url;

	if (typeof(paste) != "undefined") {
		url = "http://pastebin.com/raw.php?i=" + paste;
	} else if (typeof(file) != "undefined") {
		url = file;
	}

	return url;
}


core.loadStartupScript = function(callback) {
	var url = core.fetchStartupScriptURL();

	if (url && url.length > 0) {
		httpHelper.request(url, function(response) {
			if (response.status == "200") {
				core.startupScript = response.responseText;
			} else {
				console.log("Failed to load startup script");
				console.log("Server responded with status code " + response.status);
				alert("Failed to fetch statup script!");
			}

			callback();
		});
	} else {
		callback();
	}
}



//
//    Main
//


core.setupCursorFlash = function() {
	core.cursorFlash = false;
	setInterval(function() {
		core.cursorFlash = !core.cursorFlash;
		render.cursorBlink();
	}, 500);
}


core.afterSetup = function() {
	core.computers = [];
	
	ui.onLoad();

	core.setupCursorFlash();

	core.createComputer(0, true);
	ui.afterLoad();

	core.computers[0].launch();
	
	sidebar.update();
}

core.run = function() {
	// Load:
	//  1. Filesystem
	//  2. Startup script
	//  3. Rendering
	//  4. Cursor flash
	//  5. Computer

	XMLHttpRequest.responseType = "text";
	filesystem.setup(function() {
		core.loadStartupScript(function() {
			render.setup(core.afterSetup);
		});
	});
}