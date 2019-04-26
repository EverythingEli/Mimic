
//
//  filesystem.js
//  GravityScore and 1lann
//



var fs;

var filesystem = {};
var computerFilesystem = {};



//
//    Setup
//


filesystem.setup = function(callback) {
	BrowserFS.install(window);

	var request = new XMLHttpRequest();
	request.open("GET", globals.paths.rom, true);
	request.responseType = "arraybuffer";

	request.onload = function(evt) {
		if (!request.response) {
			console.log("Failed to load ComputerCraft rom!");
			console.log("Error: ", evt);
			alert("Failed to download rom files!")
			return;
		}

		var buffer = new Buffer(request.response);
		var mfs = new BrowserFS.FileSystem.MountableFileSystem();
		mfs.mount("/computers", new BrowserFS.FileSystem.LocalStorage());
		mfs.mount("/rom", new BrowserFS.FileSystem.ZipFS(buffer));

		BrowserFS.initialize(mfs);
		fs = require("fs");

		callback();
	}

	request.send(null);
}



//
//    Basic Utilities
//


filesystem.clean = function(path) {
	path = path.replace("\\", "/");
	var bp = [];
	for (var i=0; i<path.length;i++) {
		var part = "";
		while ((i<path.length)&&(path.substring(i, i+1)!="/")) {
			part = part+path.substring(i, i+1);
			i++;
		}
		if (part == "..") {
			if (bp.length>0) {
				delete bp[bp.length-1];
			}
		} else if (part == (".").repeat(part.length)) {
			
		} else if (part != "/") {
			bp[bp.length] = part;
		}
	}
	
	var npath = "/";
	for (var key in bp) {
		npath=npath+bp[key]+"/";
	}
	
	return npath;
}




//
//    Raw Filesystem
//

//  These functions do not resolve the path to a particular computer
//  They operate on absolute file paths starting from the actual root
//  No concept of "read only files" is present


filesystem.list = function(path) {
	path = filesystem.clean(path);

	var files;
	try {
		files = fs.readdirSync(path);
	} catch (e) {
		if (e.code == "ENOENT") {
			files = [];
		} else {
			throw e;
		}
	}

	return files;
}

filesystem.isDir = function(path) {
	path = filesystem.clean(path);

	var is = false;
	try {
		var stat = fs.statSync(path);
		is = stat.isDirectory();
	} catch (e) {
		is = false;
		if (e.code != "ENOENT") {
			throw e;
		}
	}

	return is;
}

filesystem.exists = function(path) {
	path = filesystem.clean(path);
	return fs.existsSync(path);
}

filesystem.getName = function(path) {
	path = filesystem.clean(path);
	return path.substring(path.lastIndexOf("/") + 1);
}



//
//Modifications
//


filesystem.read = function(path) {
	path = filesystem.clean(path);

	try {
		var contents = null;
		if (!filesystem.isDir(path)) {
			contents = fs.readFileSync(path).toString();
		}
	} catch (e) {
		if (e.code == "ENOENT") {
			return null;
		} else {
			throw e;
		}
	}

	return contents;
}

filesystem.write = function(path, contents) {
	path = filesystem.clean(path);

	if (!filesystem.isDir(path)) {
		var folder = filesystem.clean(path+"..");
		if (!filesystem.exists(folder)) {
			filesystem.makeDir(folder);
		}

		fs.writeFileSync(path, contents);
	}
}

filesystem.append = function(path, contents) {
	path = filesystem.clean(path);

	if (!filesystem.isDir(path)) {
		var folder = filesystem.clean(path+"..");
		if (!filesystem.exists(folder)) {
			filesystem.makeDir(folder);
		}

		fs.appendFileSync(path, contents);
	}
}

filesystem.makeDir = function(path, mode, position) {
	path = filesystem.clean(path);
	mode = mode || 0777;
	position = position || 0;

	var parts = path.split("/");

	if (position >= parts.length) {
		return true;
	}

	var directory = parts.slice(0, position + 1).join("/") || "/";
	try {
		fs.statSync(directory);
		filesystem.makeDir(path, mode, position + 1);
	} catch (e) {
		try {
			fs.mkdirSync(directory, mode);
			filesystem.makeDir(path, mode, position + 1);
		} catch (e) {
			if (e.code != "EEXIST") {
				throw e;
			}

			filesystem.makeDir(path, mode, position + 1);
		}
	}
}

filesystem.delete = function(path) {
	path = filesystem.clean(path);

	var success = false;

	if (path != "/") {
		if (filesystem.isDir(path)) {
			var fileList = filesystem.list(path);

			for (var i in fileList) {
				filesystem.delete(path+"/"+fileList[i]);
			}

			fs.rmdirSync(path);
		} else if (filesystem.exists(path)) {
			fs.unlinkSync(path);
		}

		success = true;
	}
	
	sidebar.update();

	return success;
}



//
//Modifications
//


filesystem.copy = function(from, to) {
	from = filesystem.clean(from);
	to = filesystem.clean(to);

	if (!filesystem.exists(from)) {
		return false;
	}

	var success = false;

	if (filesystem.isDir(to)) {
		var locallyResolved = fsHelper.getCCPath("/" + filesystem.getName(from));
		if (to == from && filesystem.exists(locallyResolved)) {

		} else if (filesystem.isDir(from)) {
			if (filesystem.exists(to + "/" + filesystem.getName(from))) {

			} else if (to == "/" && filesystem.exists("/" + filesystem.getName(from))) {

			} else {
				var fileList = filesystem.listRecursively(from, true);
				for (var i in fileList) {
					if (!filesystem.isDir(fileList[i])) {
						var fileName = filesystem.getName(from) + "/" + fileList[i].substring(from.length);
						filesystem.write(to + "/" + fileName, filesystem.read(fileList[i]));
					}
				}

				success = true;
			}
		} else if (!filesystem.exists(to + "/" + filesystem.getName(from))) {
			filesystem.write(to + "/" + filesystem.getName(from), filesystem.read(from));
			success = true;
		}
	} else if (!filesystem.exists(to)) {
		if (filesystem.isDir(from)) {
			var fileList = filesystem.listRecursively(from, true);

			for (var i in fileList) {
				if (!filesystem.isDir(fileList[i])) {
					var fileName = fileList[i].substring(from.length);
					filesystem.write(to + "/" + fileName, filesystem.read(fileList[i]));
				}
			}
		} else {
			filesystem.write(to, filesystem.read(from));
		}

		success = true;
	}
	
	sidebar.update();

	return success;
}


filesystem.move = function(from, to) {
	var success = false;

	if (filesystem.copy(from, to)) {
		if (filesystem.delete(from)) {
			sidebar.update();
			success = true;
		} else {
			filesystem.delete(to);
		}
	}

	return success;
}