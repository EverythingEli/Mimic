console = {}
console.log = print

local debug = debug
collectgarbage = nil
require = nil
module = nil
package = nil
newproxy = nil
load = nil


xpcall = function(_fn, _fnErrorHandler)
	assert(type(_fn) == "function",
		"bad argument #1 to xpcall (function expected, got " .. type(_fn) .. ")")

	local co = coroutine.create(_fn)
	local coroutineClock = os.clock()
	
	function hook()
		if os.clock() >= coroutineClock + 3.5 then
			console.log("Lua: Too long without yielding")
			error("Too long without yielding", 2)
		end
	end

	debug.sethook(co, hook, "", 10000)

	local results = {coroutine.resume(co)}

	debug.sethook(co)
	while coroutine.status(co) ~= "dead" do
		local events = {coroutine.yield()}

		coroutineClock = os.clock()
		debug.sethook(co, hook, "", 10000)

		results = {coroutine.resume(co, unpack(events))}
		debug.sethook(co)
	end

	if results[1] == true then
		return true, unpack(results, 2)
	else
		console.log(results[2])
		return false, _fnErrorHandler(results[2])
	end
end
pcall = function(_fn, ...)
	assert(type(_fn) == "function",
		"bad argument #1 to pcall (function expected, got " .. type(_fn) .. ")")

	local args = {...}
	return xpcall(
		function()
			return _fn(unpack(args))
		end,
		function(_error)
			return _error
		end
	)
end

local function wrapOS(content)
	local function checkClosed()
		if not content then error("attempt to use a closed file") end
	end
	return {
		close = function()
			closed = true
		end,
		read = function()
			checkClosed()
			if content == "" then return nil end
			local v = content:sub(1, 1)
			content = content:sub(2)
			return v
		end,
		readAll = function()
			checkClosed()
			if content == "" then return nil end
			v = content
			content = ""
			return v
		end,
		readLine = function()
			checkClosed()
			if content == "" then return nil end
			local lpos = (content:find("\n") or #content+1)-1
			local v = content:sub(1, lpos)
			content = content:sub(lpos+2)
			return v
		end
	}
end

local fsdo = fs.fsdo;
fs.fsdo = nil;

function fs.open(path, mode)
	local containingFolder = path:sub(1, path:len() - fs.getName(path):len())
	if fs.isDir(path) or not fs.isDir(containingFolder) or path:find("%s") then
		return nil
	end

	if mode == "w" then
		if fs.isReadOnly(path) then
			return nil
		end

		local f, buffer = {}, ""
		f = {
			["write"] = function(str)
				buffer = buffer .. tostring(str)
			end,
			["writeLine"] = function(str)
				buffer = buffer .. tostring(str) .. "\\n"
			end,
			["flush"] = function()
				fsdo("w", path, "")
				fsdo("a", path, buffer)
			end,
			["close"] = function()
				fsdo("w", path, "")
				fsdo("a", path, buffer)
				f.write = nil
				f.flush = nil
			end,
		}

		return f
	elseif mode == "r" then
		if not fs.exists(path) or fs.isDir(path) then
			return nil
		end

		local contents = fsdo("r", path, "")
		if not contents then
			return
		end

		return wrapOS(contents)
	elseif mode == "a" then
		if fs.isReadOnly(path) then
			return nil
		end

		local f, buffer = {}, ""
		f = {
			["write"] = function(str)
				buffer = buffer .. tostring(str)
			end,
			["writeLine"] = function(str)
				buffer = buffer .. tostring(str) .. "\\n"
			end,
			["flush"] = function()
				fsdo("a", path, buffer)
				buffer = ""
			end,
			["close"] = function()
				fsdo("a", path, buffer)
				f.write = nil
				f.flush = nil
			end,
		}

		return f
	else
		error("mode not supported")
	end
end

function fs.find(path)
	path = path:gsub("^/+", "")
	path = path:gsub("/+", "/")
	path = path:gsub("*", "[^/]-")
	path = "^" .. path .. "$"

	local queue = {""}
	local matches = {}

	while queue[1] do
		file = queue[1]
		table.remove(queue, 1)
		if fs.isDir(file) then
			for k, v in pairs(fs.list(file)) do
				table.insert(queue, file.."/"..v)
			end
		end
		file = file:gsub("^/+", "")
		file = file:gsub("/+$", "")
		file = file:gsub("/+", "/")

		if file:find(path) then
			table.insert(matches, file)
		end
	end

	return matches
end

local nativeQueue = os.queueEvent
os.queueEvent = function(e, ...)
	local args = {...}
	if e == "http_bios" then
		table.insert(args, 1, false)
	end
	nativeQueue(e, unpack(args))
end

local nativeYield = coroutine.yield
function coroutine.yield(filter, ...)
	while true do
		local response = {nativeYield(filter, ...)}
		if response[1] == "http_bios" and not response[2] then
			table.remove(response, 2)
		elseif response[1] == "http_bios" then
			local oldResponse = response
			local handle = wrapOS(oldResponse[5])
			oldResponse[5] = nil
			handle.getResponseCode = function()
				return oldResponse[3]
			end
			handle.getResponseHeaders = function()
				return oldResponse[4]
			end
			if response[3] >= 200 and response[3] < 400 then
				response = {"http_success", response[2], handle};
			else
				response = {"http_failure", response[2], "MIMIC_FAILURE"};
			end
		end
		if response[1] == filter or not filter then
			return unpack(response)
		end
	end
end
