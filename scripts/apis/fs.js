//
//  fs.js
//  GravityScore and 1lann
//


//  Purpose:
//  - Parse arguments from Lua runtime
//  - Format return values for the Lua runtime


//
//FS Helper
//


var fsHelper = {}

fsHelper.getCCPath = function(path, computerID) {
	if (computerID == undefined) {computerID = core.getActiveComputer().id};
	var rpath = filesystem.clean(path);
	if (!(rpath.substring(0,5)=="/rom/")) {
		rpath = "/computers/"+computerID+"/"+rpath;
	}
	
	return filesystem.clean(rpath);
}

fsHelper.getDisplayPath = function(path) {
	path = filesystem.clean(path);
	if (path.substring(path.length-1, path.length) && path != "/") path = path.substring(0, path.length-1);
	return path;
}

fsHelper.listFiles = function(path) {
	path = filesystem.clean(path)
	var files = filesystem.list(fsHelper.getCCPath(path));
	if (path == "/") {
		files.push("rom");
	}
	
	return files;
}

fsHelper.combine = function(path, extension) {
	var dir = filesystem.clean(path+"/"+extension);
	if (dir=="/") dir = "";
	
	return dir.substring(1, dir.length-1);
}

fsHelper.isDir = function(path) {
	return filesystem.isDir(fsHelper.getCCPath(path));
}

fsHelper.exists = function(path) {
	return filesystem.exists(fsHelper.getCCPath(path));
}

fsHelper.getName = function(path) {
	path = fsHelper.getDisplayPath(path);
	var name = path.substring(path.lastIndexOf("/") + 1);
	return name;
}

fsHelper.getDir = function(path) {
	var dir = filesystem.clean(filesystem.clean(path)+"..");
	if (dir=="/") dir = "";
	
	return dir.substring(1, dir.length-1);
}

/*
//This code did not work due to conflicts with existing runtime functions
//Eh, Lua, you can do better
fsHelper.fwrappers = []
fsHelper.fwrappers["r"] = function(file) {
	var content = filesystem.read(file);
	var cursor = 0;
	var wrapper = {}
	wrapper.readLine = function(L){
		var str = content.substring(cursor, content.length);
		var end = str.indexOf("\n");
		if (end==-1) {end=str.length;}
		cursor += end;
		str = str.substring(str, end);
		if (str.substring(str.length-1, str.length) == "\n") {
			str = str.substring(0, str.length-1)
		}
		if (L) {
			C.lua_pushstring(L, str);
			
			return 1;
		} else {
			return str;
		}
	}
	wrapper.readAll = function(L){
		var str = content.substring(cursor, content.length);
		cursor = content.length;
		if (L) {
			C.lua_pushstring(L, str);
			
			return 1;
		} else {
			return str;
		}
	}
	wrapper.close = function(L){}
	return wrapper
}

fsHelper.open = function(file, mode) { //TODO: lock files
	if (!fsHelper.exists(file)||fsHelper.isDir(file)) {
		var name = fs.clean(file);
		if (name.substring(0, 5)=="/rom/") {
			name = name.substring(4, name.length);
		}
		return [null, name+": No such file"];
	}
	if (!fsHelper.fwrappers[mode]) {
		console.log("Unsupported Mode: "+mode);
		throw "Unsupported mode";
	}
	console.log(fsHelper.getCCPath(file));
	return wrapper = fsHelper.fwrappers[mode](fsHelper.getCCPath(file));
} */

fsHelper.fsdo = function(m, f, d) {
	f = fsHelper.getCCPath(f);
	if (m == "r") {
		return filesystem.read(f);
	} else if (m == "w") {
		filesystem.write(f, "");
	} else if (m == "a") {
		filesystem.append(f, d);
	}
	sidebar.update();
	return "";
}

fsHelper.isReadOnly = function(path) {
	path = filesystem.clean(path);
	return path.substring(0, 5)=="/rom/";
}

fsHelper.makeDir = function(path) {
	path = filesystem.clean(path);
	var success = true;
	if (!fsHelper.isReadOnly(path)) {
		filesystem.makeDir(fsHelper.getCCPath(path));
	} else {
		success = false;
	}

	sidebar.update();
	return success;
}

fsHelper.delete = function(path) {
	if (filesystem.clean(path)=="/") return false;
	path = fsHelper.getCCPath(path);
	return filesystem.delete(path);
}

fsHelper.copy = function(from, to) {
	var oF = fsHelper.getDisplayPath(from);
	var oT = fsHelper.getDisplayPath(to);
	
	from = fsHelper.getCCPath(from);
	to = fsHelper.getCCPath(to);
	
	if (fsHelper.isReadOnly(oT)) return oT+": Access denied";
	if (!fsHelper.exists(oF)) return oF+": No such file";
	if (filesystem.copy(from, to)) return true;
	return oT+": File exists";
}

fsHelper.move = function(from, to) {
	var oF = fsHelper.getDisplayPath(from);
	var oT = fsHelper.getDisplayPath(to);
	
	from = fsHelper.getCCPath(from);
	to = fsHelper.getCCPath(to);
	
	if (fsHelper.isReadOnly(oT)) return oT+": Access denied";
	if (!fsHelper.exists(oF)) return oF+": No such file";
	if (filesystem.move(from, to)) return true;
	return oT+": File exists";
}



//
//FS API
//


var fsAPI = {};


fsAPI.list = function(L) {
	var path = C.luaL_checkstring(L, 1);
	var files = fsHelper.listFiles(path);

	if (files) {
		C.lua_newtable(L);
		for (var i in files) {
			C.lua_pushnumber(L, parseInt(i) + 1);
			C.lua_pushstring(L, files[i].toString());
			C.lua_rawset(L, -3);
		}

		return 1;
	} else {
		return 0;
	}
}

fsAPI.combine = function(L) {
	var path = C.luaL_checkstring(L, 1);
	var extension = C.luaL_checkstring(L, 2);
	C.lua_pushstring(L, fsHelper.combine(path, extension));

	return 1;
}

fsAPI.isDir = function(L) {
	var path = C.luaL_checkstring(L, 1);
	C.lua_pushboolean(L, fsHelper.isDir(path) ? 1 : 0);

	return 1;
}

fsAPI.exists = function(L) {
	var path = C.luaL_checkstring(L, 1);
	C.lua_pushboolean(L, fsHelper.exists(path) ? 1 : 0);

	return 1;
}

fsAPI.getName = function(L) {
	var path = C.luaL_checkstring(L, 1);
	var result = fsHelper.getName(path);
	C.lua_pushstring(L, result);

	return 1;
}

/*fsAPI.open = function(L) {
	var path = C.luaL_checkstring(L, 1);
	var mode = C.luaL_checkstring(L, 2);
	
	var handle = fsHelper.open(path, mode);
	C.lua_newtable(L);
	for (var key in handle) {
		C.lua_pushstring(L, key);
		C.lua_pushcfunction(L, Lua5_1.Runtime.addFunction(handle[key]));
		C.lua_rawset(L, -3);
	}
	
	return 1;
}*/

fsAPI.fsdo = function(L) {
	var m = C.luaL_checkstring(L, 1);
	var f = C.luaL_checkstring(L, 2);
	var d = C.luaL_checkstring(L, 3);
	C.lua_pushstring(L, fsHelper.fsdo(m, f, d));
	
	return 1;
}

fsAPI.getDir = function(L) {
	var path = C.luaL_checkstring(L, 1);
	C.lua_pushstring(L, fsHelper.getDir(path));
	
	return 1;
}

fsAPI.isReadOnly = function(L) {
	var path = C.luaL_checkstring(L, 1);
	C.lua_pushboolean(L, fsHelper.isReadOnly(path) ? 1 : 0);

	return 1;
}

fsAPI.makeDir = function(L) {
	var path = fsHelper.getDisplayPath(C.luaL_checkstring(L, 1));
	if (!fsHelper.makeDir(path)) {
		C.lua_pushstring(L, path+": Access Denied");
		C.lua_error(L);
	}

	return 0;
}

fsAPI.delete = function(L) {
	var path = fsHelper.getDisplayPath(C.luaL_checkstring(L, 1));
	if (!fsHelper.delete(path)) {
		C.lua_pushstring(L, path+": Access Denied");
		C.lua_error(L);
	}

	return 0;
}

fsAPI.move = function(L) {
	var from = C.luaL_checkstring(L, 1);
	var to = C.luaL_checkstring(L, 2);
	var r = fsHelper.move(from, to);
	
	if (r!=true) {
		C.lua_pushstring(L, r);
		C.lua_error(L);
	}

	return 0;
}


fsAPI.copy = function(L) {
	var from = C.luaL_checkstring(L, 1);
	var to = C.luaL_checkstring(L, 2);
	var r = fsHelper.copy(from, to);
	
	if (r!=true) {
		C.lua_pushstring(L, r);
		C.lua_error(L);
	}
	return 0;
}




fsAPI.getSize = function(L) {
	C.lua_pushnumber(L, config.maxStorageSize);

	return 1;
}


fsAPI.getDrive = function(L) {
	return 0;
}


fsAPI.getFreeSpace = function(L) {
	C.lua_pushnumber(L, config.maxStorageSize);
	
	return 1;
}
