--Settings API(Refer to http://www.computercraft.info/wiki/Settings_(API))
--Old implementation of mine. Not garanteed (spelling?) to work
local tSettings = {}
settings = {}
settings.set = function(name, value)
  tSettings[name] = value
end
settings.get = function(name, default)
  local returnValue
  if tSettings[name] then
    returnValue = tSettings[name]
  else
    returnValue = default
  end
  return returnValue
end
settings.unset = function(name)
  tSettings[name] = nil
end
settings.clear = function(name)
  tSettings = {}
end
settings.getNames = function()
  local t = {}
  for i, f in pairs(tSettings) do
    table.insert(t, i)
  end
  return t
end
settings.load = function(path)
  local loaded = false
  if fs.exists(path) and not fs.isDir(path) then
    local f = assert (fs.open (path, "r"))
    local s = f:readAll()
    f:close ()
    tSettings = textunserialize(s)
    loaded = true
  end
  return loaded
end
settings.save = function(path)
  local saved = false
  if not fs.isDir(path) and not fs.isReadOnly(path) then
    local f = io.open (path, "w")
    f.write(textserialize(tSettings))
    f:close ()
  end
  return saved
end



console = {}
console.log = print

--bit32 = {}

local debugLib = debug
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

	debugLib.sethook(co, function()
		if os.clock() >= coroutineClock + 3.5 then
			console.log("Lua: Too long without yielding")
			error("Too long without yielding", 2)
		end
	end, "", 10000)

	local results = {coroutine.resume(co)}

	debugLib.sethook(co)
	while coroutine.status(co) ~= "dead" do
		local events = {coroutine.yield()}

		coroutineClock = os.clock()
		debugLib.sethook(co, function()
			if os.clock() >= coroutineClock + 3.5 then
				console.log("Lua: Too long without yielding")
				error("Too long without yielding", 2)
			end
		end, "", 10000)

		results = {coroutine.resume(co, unpack(events))}
		debugLib.sethook(co)
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


local fsWrite = fs.write
fs.write = nil

local fsAppend = fs.append
fs.append = nil

local fsRead = fs.read
fs.read = nil

function fs.open(path, mode)
	local containingFolder = path:sub(1, path:len() - fs.getName(path):len())
	if fs.isDir(path) or not fs.isDir(containingFolder) or path:find("%s") then
		return nil
	end

	if mode == "w" then
		if fs.isReadOnly(path) then
			return nil
		end

		local f = {}
		f = {
			["_buffer"] = "",
			["write"] = function(str)
				f._buffer = f._buffer .. tostring(str)
			end,
			["writeLine"] = function(str)
				f._buffer = f._buffer .. tostring(str) .. "\\n"
			end,
			["flush"] = function()
				fsWrite(path, f._buffer)
			end,
			["close"] = function()
				fsWrite(path, f._buffer)
				f.write = nil
				f.flush = nil
			end,
		}

		return f
	elseif mode == "r" then
		if not fs.exists(path) or fs.isDir(path) then
			return nil
		end

		local contents = fsRead(path)
		if not contents then
			return
		end

		local f = {}
		f = {
			["_cursor"] = 1,
			["_contents"] = contents,
			["readAll"] = function()
				local contents = f._contents:sub(f._cursor)
				f._cursor = f._contents:len()
				return contents
			end,
			["readLine"] = function()
				if f._cursor >= f._contents:len() then
					return nil
				end

				local nextLine = f._contents:find("\\n", f._cursor, true)
				if not nextLine then
					nextLine = f._contents:len()
				else
					nextLine = nextLine - 1
				end

				local line = f._contents:sub(f._cursor, nextLine)
				f._cursor = nextLine + 2
				return line
			end,
			["close"] = function() end,
		}

		return f
	elseif mode == "a" then
		if fs.isReadOnly(path) then
			return nil
		end

		local f = {}
		f = {
			["_buffer"] = "",
			["write"] = function(str)
				f._buffer = f._buffer .. tostring(str)
			end,
			["writeLine"] = function(str)
				f._buffer = f._buffer .. tostring(str) .. "\\n"
			end,
			["flush"] = function()
				fsAppend(path, f._buffer)
			end,
			["close"] = function()
				fsAppend(path, f._buffer)
				f.write = nil
				f.flush = nil
			end,
		}

		return f
	else
		error("mode not supported")
	end
end


local listAllFiles = fs.listAll
fs.listAll = nil

function fs.find(path)
	path = path:gsub("^/+", "")
	path = path:gsub("/+", "/")
	path = path:gsub("*", "[^/]-")
	path = "^" .. path .. "$"

	local allFiles = listAllFiles()
	local matches = {}

	for _, file in pairs(allFiles) do
		file = file:gsub("^/+", "")
		file = file:gsub("/+$", "")
		file = file:gsub("/+", "/")

		if file:find(path) then
			table.insert(matches, file)
		end
	end

	return matches
end


function fs.getDir(path)
	path = path:gsub("^/+", "")
	path = path:gsub("/+$", "")
	path = path:gsub("/+", "/")

	local name = fs.getName(path)
	return path:sub(1, -name:len() - 2)
end


local nativeYield = coroutine.yield

function coroutine.yield(filter, ...)
	while true do
		local response = {nativeYield(filter, ...)}
		if response[1] == "http_bios_wrapper_success" then
			local responseText = response[3]
			local responseData = {
				["readAll"] = function()
					return responseText
				end,
				["close"] = function()
				end,
				["getResponseCode"] = function()
					return "200"
				end
			}

			return "http_success",response[2],responseData
		elseif response[1] == filter or not filter then
			return unpack(response)
		end
	end
end

