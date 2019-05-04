//
//  sidebar.js
//  1lann and GravityScore
//

//TODO: Show folders before files

var sidebar = {};



//
//    Populating Data
//


sidebar.createFolderElement = function(piece) {
	var element = $("<li></li>", {
		"folder": "true",
	});

	var glyphicon = $("<span></span>", {
		"class": "glyphicon glyphicon-chevron-down",
	});
	glyphicon.appendTo(element);

	var text = $("<p></p>", {
		"level": piece.level,
	});
	text.append(piece.name);
	text.appendTo(element);

	var list = $("<ul></ul>");
	sidebar.populate(piece.children, piece.level + 1, list);
	list.appendTo(element);

	element.click(function(event) {
		event.stopPropagation();
		sidebar.onFolderClick(element);
	});

	return element;
}


sidebar.createFileElement = function(piece) {
	var element = $("<li></li>");
	var text = $("<p></p>", {
		"level": piece.level,
	});

	if (piece.userData) {
		element.attr("user-data", piece.userData);
	}
	
	if (piece.script) {
		element.script = piece.script;
	}

	if (piece.computer) {
		element.addClass("computer");
		var glyphicon = $("<span></span>", {
			"class": "glyphicon glyphicon-chevron-right pull-right",
		});

		glyphicon.appendTo(element);
	}
	
	if (piece.button) {
		element.addClass("button");
		element.addClass(piece.decor);
		
		var glyphicon = $("<span></span>", {
			"class": "glyphicon "+(piece.class||"")+" pull-right",
		});

		glyphicon.appendTo(element);
	}

	text.append(piece.name);
	text.appendTo(element);

	element.click(function(event) {
		event.stopPropagation();
		if (piece.computer) {
			sidebar.onComputerClick(element);
		} else if (piece.button) {
			sidebar.onButtonClick(element);
		} else {
			sidebar.onFileClick(element);
		}
	});

	return element;
}

sidebar.populate = function(data, level, parent) {
	level = level || 0;
	parent = parent || $(".sidebar");

	for (var i in data) {
		var piece = data[i];
		data[i].level = level;

		var element;
		if (piece.folder) {
			element = sidebar.createFolderElement(piece);
		} else {
			element = sidebar.createFileElement(piece);
		}

		element.appendTo(parent);
		data[i].domElement = element;
	}
}


sidebar.updateLevels = function() {
	var levels = $(".sidebar li p");

	$.each(levels, function(index, value) {
		var level = parseInt($(value).attr("level"));

		$(value).css({
			"padding-left": 25 + level * 15,
		});
	});
}



//
//    Events
//


sidebar.onFolderClick = function(element) {
	var list = element.children("ul");
	var triangle = element.children("span");

	if (list.attr("hidden")) {
		list.css({"display": "block"});
		list.removeAttr("hidden");
		triangle.toggleClass("glyphicon-chevron-down");
		triangle.toggleClass("glyphicon-chevron-right");
	} else {
		list.css({"display": "none"});
		list.attr("hidden", "");
		triangle.toggleClass("glyphicon-chevron-down");
		triangle.toggleClass("glyphicon-chevron-right");
	}
}


sidebar.onFileClick = function(element) {
	if (element.attr("user-data")) {
		sidebar.select(element);

		var path = element.attr("user-data");
		ui.showEditor(path);
	} else {
		console.log("Failed to load file! Could not detect path!");
		alert("Failed to find clicked file!");
	}
}


sidebar.onComputerClick = function(element) {
	if (element.attr("user-data")) {
		sidebar.select(element);

		var id = parseInt(element.attr("user-data"));
		ui.showComputer(id);
	} else {
		console.log("Failed to load computer! Could not detect ID!");
		alert("Failed to find clicked computer!");
	}
}

sidebar.onButtonClick = function(element) {
	if (element.script) {element.script()}
}

//
//    Scripts
//

sidebar.createComputerButtonScript = function(){
	var id = core.computers.length
	ui.showComputer(id);
}

//
//    Selection
//


sidebar.select = function(element) {
	ui.saveOpenFile();

	if (sidebar.selected) {
		var text = sidebar.selected.children("p");
		text.removeClass("selected");
	}

	sidebar.selected = element;

	var text = sidebar.selected.children("p");
	text.addClass("selected");
}



//
//    Accessors
//


sidebar.typeOfSelected = function() {
	if (!sidebar.selected) {
		return "none";
	} else if (sidebar.selected.hasClass("computer")) {
		return "computer";
	} else if (sidebar.selected.hasClass("button")) {
		return "button";
	}else if (sidebar.selected.attr("folder") == "true") {
		return "folder";
	} else {
		return "file";
	}
}


sidebar.pathOfSelected = function(includeComputers) {
	if (sidebar.selected && sidebar.typeOfSelected() == "file") {
		var path = sidebar.selected.attr("user-data");
		return path;
	} else if (sidebar.selected && includeComputers) {
		//return sidebar.selected.attr("user-data");
		return core.activeComputer.toString();
	} else {
		return undefined;
	}
}



//
//    Updating
//


sidebar.dataFromFilesystem = function(dir, files) {
	var files = files||[];
	var folderContents = filesystem.list(dir);

	for (var i in folderContents) {
		var relativePath = folderContents[i];
		var fullPath = dir + "/" + relativePath;
		fullPath = fullPath.replace("//", "/");

		if (filesystem.isDir(fullPath)) {
			var children = sidebar.dataFromFilesystem(fullPath);
			files.push({
				"name": relativePath,
				"folder": true,
				"children": children
			});
		} else {
			files.push({
				"name": relativePath,
				"userData": fullPath,
			});
		}
	}

	return files;
}


sidebar.getData = function() {
	var files = [];
	var availableComputers = [];
	
	var folderContents = filesystem.list("/computers");
	for (var i in folderContents) {
		availableComputers[folderContents[i]] = true;
	}
	for (var i in core.computers) {
		availableComputers[i] = true;
	}
	for (var i in availableComputers) {
		var dir = "/computers/" + i;
		var computer = core.computers[parseInt(i)];
		
		files.push({
			"name": ((!computer&&"Computer "+i))||(computer.label||("Computer "+(computer.id||0))),
			"computer": true,
			"userData": i,
		});
		
		files = sidebar.dataFromFilesystem(dir, files);
	}
	
	files.push({
		"name": "New Computer",
		"button": true,
		"decor": "add-button",
		"class": "glyphicon-plus",
		"script": sidebar.createComputerButtonScript,
	});

	return files;
}


sidebar.update = function() {
	var currentSelection = sidebar.pathOfSelected();

	var data = sidebar.getData();
	$(".sidebar").empty();
	sidebar.populate(data);
	sidebar.updateLevels();

	if (currentSelection) {
		var newSelection = $("li[user-data='computer-" + currentSelection + "']");
		if (newSelection) {
			sidebar.select(newSelection);
		}
	} else {
		var selection = $("li[user-data='"+(sidebar.pathOfSelected(true)||0)+"'][class*='computer']");
		sidebar.select(selection);
	}
}
