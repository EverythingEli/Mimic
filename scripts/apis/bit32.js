
//
//  bit.js
//  GravityScore and 1lann
//



var bit32API = {};

bit32API.bnot = function(L) {
	var num = C.luaL_checknumber(L, 1);
	var result = ~num;
	C.lua_pushnumber(L, result);

	return 1;
}

bit32API.band = function(L) {
	var first = C.luaL_checknumber(L, 1);
	var second = C.luaL_checknumber(L, 2);
	var result = first & second;
	C.lua_pushnumber(L, result);

	return 1;
}

bit32API.bor = function(L) {
	var first = C.luaL_checknumber(L, 1);
	var second = C.luaL_checknumber(L, 2);
	var result = first | second;
	C.lua_pushnumber(L, result);

	return 1;
}


bit32API.bxor = function(L) {
	var first = C.luaL_checknumber(L, 1);
	var second = C.luaL_checknumber(L, 2);
	var result = ~(first & second) & ~(~first & ~second);
	C.lua_pushnumber(L, result);

	return 1;
}

bit32API.arshift = function() {
	var first = C.luaL_checknumber(L, 1);
	var amount = C.luaL_checknumber(L, 2);
	var result = first >> amount;
	C.lua_pushnumber(L, result);

	return 1;
}

bit32API.lshift = function(L) {
	var first = C.luaL_checknumber(L, 1);
	var amount = C.luaL_checknumber(L, 2);
	var result = first << amount;
	C.lua_pushnumber(L, result);

	return 1;
}

bit32API.rshift = function(L) {
	var first = C.luaL_checknumber(L, 1);
	var amount = C.luaL_checknumber(L, 2);
	var result = first >>> amount;
	C.lua_pushnumber(L, result);

	return 1;
}

bit32API.btest = function(L) {
	var m = C.luaL_checknumber(L, 1);
	var n = C.luaL_checknumber(L, 2);
	var result = (m&n)!=0;
	C.lua_pushnumber(L, result);

	return 1;
}