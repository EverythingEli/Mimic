//
//  term.js
//  GravityScore and 1lann
//



var termHelpers = {};
var termAPI = {};



//
//    Writing
//


termHelpers.luaValueToString = function(L, a) {
	a=a||1
	
	var type = C.lua_type(L, a);
	var str;

	if (type == C.LUA_TSTRING) {
		str = C.lua_tostring(L, a);
	} else if (type == C.LUA_TBOOLEAN) {
		if (C.lua_toboolean(L, a)) {
			str = "true";
		} else {
			str = "false";
		}
	} else if (type == C.LUA_TNUMBER) {
		str = C.lua_tonumber(L, a) + "";
	} else {
		str = "";
	}

	str = str.replace("\n", " ");
	return str;
}
termHelpers.write = function(str) {
	var computer = core.getActiveComputer();
	
	var x = computer.cursor.x;
	var y = computer.cursor.y;
	var fg = computer.colors.foreground;
	var bg = computer.colors.background;

	render.text(x, y, str, fg, bg);

	computer.cursor.x += str.length;
	render.cursorBlink();
}
termHelpers.setTextColorRaw = function(hex) {
	hex = 15-hex
	
	var computer = core.getActiveComputer();
	computer.colors.foreground = hex.toString(16);
}
termHelpers.setTextColor = function(color) {
	termHelpers.setTextColorRaw((Math.log(color) / Math.log(2)));
	//termHelpers.setTextColorRaw(15 - (Math.log(color) / Math.log(2)));
}
termHelpers.setBackgroundColorRaw = function(hex) {
	hex = 15-hex
	
	var computer = core.getActiveComputer();
	computer.colors.background = hex.toString(16);
}
termHelpers.setBackgroundColor = function(str) {
	termHelpers.setBackgroundColorRaw(Math.log(color) / Math.log(2)));
	//termHelpers.setBackgroundColorRaw(15 - (Math.log(color) / Math.log(2)));
}


termAPI.write = function(L) {
	var str = termHelpers.luaValueToString(L);
	termHelpers.write(str)

	return 0;
}

termAPI.blit = function(L) {
	var computer = core.getActiveComputer();
	var str = termHelpers.luaValueToString(L, 1);
	var fgstr = termHelpers.luaValueToString(L, 2).toUpperCase();
	var bgstr = termHelpers.luaValueToString(L, 3).toUpperCase();

	var x = computer.cursor.x;
	var y = computer.cursor.y;

	for (var i=0; i<str.length; i++) {
		termHelpers.setTextColorRaw(parseInt(fgstr.substring(i, i+1), 16))
		termHelpers.setBackgroundColorRaw(parseInt(bgstr.substring(i, i+1), 16))
		termHelpers.write(str.substring(i, i+1));
	}

	computer.cursor.x += str.length;
	//render.cursorBlink();

	return 0;
}


termAPI.clear = function(L) {
	var computer = core.getActiveComputer();
	render.clear(computer.colors.foreground, computer.colors.background);

	return 0;
}


termAPI.clearLine = function(L) {
	var computer = core.getActiveComputer();
	var fg = computer.colors.foreground;
	var bg = computer.colors.background;
	render.text(1, computer.cursor.y, " ".repeat(computer.width), fg, bg);

	return 0;
}



//
//    Cursor
//


termAPI.setCursorPos = function(L) {
	var computer = core.getActiveComputer();
	var x = C.luaL_checkint(L, 1);
	var y = C.luaL_checkint(L, 2);

	computer.cursor.x = x;
	computer.cursor.y = y;
	if (core.cursorFlash) {
		render.cursorBlink();
	}

	return 0;
}


termAPI.getCursorPos = function(L) {
	var computer = core.getActiveComputer();
	C.lua_pushnumber(L, computer.cursor.x);
	C.lua_pushnumber(L, computer.cursor.y);
	return 2;
}


termAPI.setCursorBlink = function(L) {
	var computer = core.getActiveComputer();

	if (C.lua_isboolean(L, 1)){
		computer.cursor.blink = C.lua_toboolean(L, 1);
		if (!computer.cursor.blink) {
			overlayContext.clearRect(0, 0, overlayContext.width, overlayContext.height);
		}
	} else {
		C.lua_pushstring(L, "Expected boolean");
		C.lua_error(L);
	}

	return 0;
}



//
//    Colors
//


termAPI.setTextColor = function(L) {
	termHelpers.setTextColor(C.luaL_checkint(L, 1));

	return 0;
}

termAPI.getTextColor = function(L) {
	var computer = core.getActiveComputer();
	C.lua_pushnumber(L, computer.colors.foreground);
	
	return 1;
}


termAPI.setBackgroundColor = function(L) {
	termHelpers.setBackgroundColor(C.luaL_checkint(L, 1));

	return 0;
}

termAPI.getBackgroundColor = function(L) {
	var computer = core.getActiveComputer();
	C.lua_pushnumber(L, computer.colors.background);
	
	return 1;
}

termAPI.setPaletteColor = function(L) {
	return 0;
}

termAPI.getPaletteColor = function(L) {
	var computer = core.getActiveComputer();
	C.lua_pushnumber(L, 0);
	
	return 1;
}


termAPI.isColor = function(L) {
	var computer = core.getActiveComputer();
	C.lua_pushboolean(L, computer.advanced ? 1 : 0);

	return 1;
}


termAPI.isColour = termAPI.isColor;
termAPI.setTextColour = termAPI.setTextColor;
termAPI.setBackgroundColour = termAPI.setBackgroundColor;
termAPI.getTextColour = termAPI.setTextColor;
termAPI.getBackgroundColour = termAPI.setBackgroundColor;
termAPI.setPaletteColour = termAPI.setPaletteColor;
termAPI.getPaletteColour = termAPI.getPaletteColor;


//
//    Information
//


termAPI.getSize = function(L) {
	var computer = core.getActiveComputer();
	C.lua_pushnumber(L, computer.width);
	C.lua_pushnumber(L, computer.height);

	return 2;
}



//
//    Scrolling
//


termAPI.scroll = function(L) {
	var computer = core.getActiveComputer();
	var amount = C.luaL_checkint(L, 1);

	var imageData = context.getImageData(
		config.borderWidth,
		config.borderHeight,
		canvas.width - config.borderWidth * 2,
		canvas.height - config.borderHeight * 2
	);

	var offset = config.cellHeight * -amount + config.borderHeight;
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.putImageData(imageData, config.borderWidth, offset);

	var fg = computer.colors.foreground;
	var bg = computer.colors.background;

	if (amount < 0) {
		for (var i = amount; i < 0; i++) {
			render.clearLine(-i, fg, bg);
		}
	} else {
		for (var i = 0; i < amount; i++) {
			render.clearLine(computer.height - i, fg, bg);
		}
	}

	render.border();

	return 0;
}
