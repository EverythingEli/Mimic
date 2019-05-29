//  
//  Mimic
//  render.js
//  Made by 1lann and GravityScore
//  



var canvas = document.getElementById("canvas");
var overlayCanvas = document.getElementById("overlay-canvas");

var context = canvas.getContext("2d");
var overlayContext = overlayCanvas.getContext("2d");

var render = {};
var font;

var CharacterLength;
var CharacterHeight;



//
//    Setup
//


render.setup = function(callback) {
	font = new Image();
	font.src = globals.paths.font;
	font.onload = function() {
		CharacterLength = 6;
		CharacterHeight = 9;
		callback();
	}
}

render.updateContextSettings = function() {
	context.imageSmoothingEnabled = false;
	context.webkitImageSmoothingEnabled = false;
	context.mozImageSmoothingEnabled = false;
	overlayContext.imageSmoothingEnabled = false;
	overlayContext.webkitImageSmoothingEnabled = false;
	overlayContext.mozImageSmoothingEnabled = false;
}



//
//    External Functions
//


render.getFont = function() {
	return font;
}



//
//    Individual Cells
//


render.characterBackground = function(x, y, color, ctx) {
	if (typeof(ctx) == "undefined") {
		ctx = context;
	}

	var computer = core.getActiveComputer();
	if (x >= 1 && y >= 1 && x <= computer.width && y <= computer.height) {
		var cellWidth = config.cellWidth * config.terminalScale;
		var cellHeight = config.cellHeight * config.terminalScale;
		var cellX = ((x - 1) * cellWidth + config.borderWidth);
		var cellY = ((y - 1) * cellHeight + config.borderHeight);

		if(x == 1){
			cellX = 0
			cellWidth = config.cellWidth + config.borderWidth;
		}
		else if(x == computer.width){
			cellWidth = config.cellWidth + config.borderWidth;
		}
		
		if(y == 1){
			cellY = 0
			cellHeight = config.cellHeight + config.borderHeight;
		}
		else if(y == computer.height){
			cellHeight = config.cellHeight + config.borderHeight;
		}

		ctx.beginPath();
		ctx.rect(cellX, cellY, cellWidth, cellHeight);
		ctx.fillStyle = globals.colors[color];
		ctx.fill();
	}
}


render.characterText = function(x, y, text, color, ctx) {
	if (typeof(ctx) == "undefined") {
		ctx = context;
	}

	var computer = core.getActiveComputer();
	if (x >= 1 && y >= 1 && x <= computer.width && y <= computer.height) {
		var m_font = computer.paletteCache[Math.pow(2,(parseInt(color, 16)-1))]// || font;
		
		var loc = text.charCodeAt(0);
		var imgX = 1+(loc % config.font.columns)*(CharacterLength+2);
		var imgY = 1+(Math.floor(loc / config.font.columns))*(CharacterHeight+2);

		var cellWidth = config.cellWidth * config.terminalScale;
		var cellHeight = config.cellHeight * config.terminalScale;
		var textX = (x - 1) * cellWidth + config.borderWidth;
		var textY = (y - 1) * cellHeight + config.borderHeight + 1;

		ctx.drawImage(m_font, imgX, imgY, CharacterLength, CharacterHeight, textX, textY,
			config.cellWidth, config.cellHeight);
	}
}


render.character = function(x, y, text, foreground, background, ctx) {
	if (typeof(ctx) == "undefined") {
		ctx = context;
	}

	var computer = core.getActiveComputer();
	if (x >= 1 && y >= 1 && x <= computer.width && y <= computer.height) {
		if (typeof(background) != "undefined") {
			render.characterBackground(x, y, background, ctx);
		}

		if (typeof(foreground) != "undefined") {
			render.characterText(x, y, text, foreground, ctx);
		}
	}
}



//
//    Multiple Cells
//


render.border = function(color) {
	color = color || "0";

	context.fillStyle = globals.colors[color];

	context.beginPath();
	context.rect(0, 0, config.borderWidth, canvas.height);
	context.fill();

	context.beginPath();
	context.rect(canvas.width - config.borderWidth, 0, config.borderWidth, canvas.height);
	context.fill();

	context.beginPath();
	context.rect(0, 0, canvas.width, config.borderHeight);
	context.fill();

	context.beginPath();
	context.rect(0, canvas.height - config.borderHeight, canvas.width, config.borderHeight);
	context.fill();
}


render.clearLine = function(y, foreground, background) {
	background = background || "0";
	foreground = foreground || "f";

	var computer = core.getActiveComputer();
	render.text(1, y, " ".repeat(computer.width), foreground, background);

	render.border();
}


render.clear = function(foreground, background) {
	background = background || "0";
	foreground = foreground || "f";

	var computer = core.getActiveComputer();
	for (var i = 1; i <= computer.height; i++) {
		render.clearLine(i, foreground, background);
	}

	render.border();
}


render.text = function(x, y, text, foreground, background, ctx) {
	var computer = core.getActiveComputer();
	for (var i = 0; i < text.length; i++) {
		render.character(x + i, y, text.charAt(i), foreground, background, ctx);
	}
}


render.centredText = function(y, text, foreground, background, ctx) {
	var computer = core.getActiveComputer();
	var x = Math.floor(computer.width / 2 - text.length / 2);
	render.text(x, y, text, foreground, background, ctx);
}



//
//    Cursor
//


render.cursorBlink = function() {
	var computer = core.getActiveComputer();

	if (!computer) return;
	if (computer.cursor.blink && core.cursorFlash) {
		overlayContext.clearRect(0, 0, canvas.width, canvas.height);

		var x = computer.cursor.x;
		var y = computer.cursor.y;
		var color = computer.colors.foreground;

		render.text(x, y, "_", color, undefined, overlayContext);
	} else {
		overlayContext.clearRect(0, 0, canvas.width, canvas.height);
	}
}



//
//    Blue Screen of Death
//


render.bsod = function(title, lines) {
	render.clear("f", "4");

	var computer = core.getActiveComputer();
	computer.cursor.blink = false;
	render.cursorBlink();

	render.clearLine(5, "f", "f");
	render.centredText(5, title, "4", "f");

	for (var i in lines) {
		var line = lines[i];
		render.centredText(9 + parseInt(i), line, "f", "4");
	}

	render.centredText(10 + lines.length, "Press enter to reboot the computer...", "f", "4");
}
