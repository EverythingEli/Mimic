local console = {}
console.log = print

local debug = debug
local cgd = collectgarbage
collectgarbage = nil
require = nil
module = nil
package = nil
newproxy = nil


local coroutineClock = os.clock()
xpcall = function(_fn, _fnErrorHandler)
	assert(type(_fn) == "function",
		"bad argument #1 to xpcall (function expected, got " .. type(_fn) .. ")")

	local co = coroutine.create(_fn)
	
	local function hook()
        cgd()
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

local function wrapIS(content, byte)
	local function checkClosed()
		if not content then error("attempt to use a closed file") end
	end
	
	local cursor = 1
	local close = function()
		if not content then error("Java Exception Thrown: java.lang.NullPointerException", -1) end
		content = nil
	end
	local read = function(i)
	    i = i or 1
		checkClosed()
		if cursor > #content then return nil end
		cursor = cursor+i
		return content:sub(cursor-i, cursor-1)
	end
	local readAll = function()
		checkClosed()
		if cursor > #content then return nil end
		local v = content:sub(cursor, #content)
		cursor = #content+1
		return v
	end
	local readLine = function()
		checkClosed()
		if cursor > #content then return nil end
		local mcontent = content:sub(cursor, #content)
		local lpos = (mcontent:find("\n") or #mcontent+1)-1
		cursor=cursor+lpos+1
		return mcontent:sub(1, lpos)
	end
	if not byte then 
        return {
            close = close,
            read = read,
            readLine = readLine,
            readAll = readAll
        }
	end
	return {
	    close = close,
	    readLine = readLine,
	    readAll = readAll,
	    read = function(...)
            local n = ...
			local data = read(n or 1)
            if n then return data end
            return string.byte(data)
	    end,
	}
end

local fsdo = fs.fsdo;
fs.fsdo = nil;

function fs.open(path, mode)
	if fs.isDir(path) then
		return nil
	end
	
	local content = ""
	local function checkClosed()
		if not content then error("attempt to use a closed file") end
	end
	local function checkClosed2()
		if not content then error("Java Exception Thrown: java.lang.NullPointerException", -1) end
	end
	
	local function wrapOSb(path)
        local cursor = #content
		return {
			["write"] = function(b)
				checkClosed()
				if cursor<0 then cursor = 0 end
				if cursor>#content then
				    content = content..(" "):rep(cursor-#content) --Doesn't seem to work?
				end
				if type(b) == "string" then
					content = content:sub(cursor, cursor) .. b 
					   .. content:sub(cursor+1, #content)
					cursor = cursor+#b
				else
					content = content:sub(cursor, cursor) .. string.char(b)
					   .. content:sub(cursor+1, #content)
					cursor = cursor + 1
				end
			end,
			["seek"] = function(str, o)
				checkClosed()
				if str == "end" then
				    cursor = #content+o
				elseif str == "cur" then
				    cursor = cursor+o
				elseif str == "set" then
				    cursor = o
				else
				    error("bad argument #1 to 'seek' (invalid option '"..str.."'", 2)
				end
				
				return cursor
			end,
			["close"] = function()
				checkClosed2()
				fsdo("w", path, "")
				fsdo("a", path, content)	
				
				content = nil
			end,
		}
	end

	if mode == "r" or mode=="rb" then
		if not fs.exists(path) or fs.isDir(path) then return end

		local contents = fsdo("r", path, "")
		if not contents then return end

		return wrapIS(contents, mode=="rb")
	elseif mode == "w" or mode == "a" then
	    if fs.isReadOnly(path) then return end

		return {
			["write"] = function(str)
				checkClosed()
				content = content .. tostring(str)
			end,
			["writeLine"] = function(str)
				checkClosed()
				content = content .. tostring(str) .. "\n"
			end,
			["flush"] = function()
				checkClosed()
				if mode == "w" then fsdo("w", path, "") end
				fsdo("a", path, content)
				if mode == "a" then content = "" end
			end,
			["close"] = function()
				checkClosed2()
				if mode == "w" then fsdo("w", path, "") end
				fsdo("a", path, content)	
				
				content = nil
			end,
		}
	elseif mode == "wb" then
		if not fs.isReadOnly(path) then return wrapOSb(path) end
	elseif mode == "ab" then
        if fs.isReadOnly(path) then return end
	
		content = fsdo("r", path, "") or ""
		
		return wrapOSb(path)
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
			local handle = wrapIS(oldResponse[4])
			local headers = {}
			if #oldResponse>4 then
				for i=5, #oldResponse, 2 do
					local oname, nc, name = oldResponse[i], true, ""
					for i=1, #oname do
						local c = oname:sub(i,i)
						name = name..(nc and c:upper() or c)
						nc = false
						if c == "-" then
							nc = true
						end
					end
					headers[name] = oldResponse[i+1]
				end
			end
			oldResponse[4] = nil
			handle.getResponseCode = function()
				return oldResponse[3]
			end
			handle.getResponseHeaders = function()
				return headers
			end
			if response[3] >= 200 and response[3] < 400 then
				response = {"http_success", response[2], handle};
			else
				response = {"http_failure", response[2], "Unknown host", handle};
			end
		end
		if response[1] == filter or not filter then
			return unpack(response)
		end
	end
end
