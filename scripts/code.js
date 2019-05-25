//
//  code.js
//  GravityScore and 1lann
//



var code = {};


code.getAll = function() {
	return code.prebios + "\n"+
	"execFunc(function() local rtn, err = loadstring([=====[" + 
	   code.bios
	+" ]=====], \"bios.lua\") if rtn then rtn() else console.log(err) end end)";
}


{
	var getfile = function(file){
		var xhttp = new XMLHttpRequest();
		xhttp.open("GET", file, false);
		xhttp.send();
		return xhttp.responseText;
	}
	code.prebios = getfile("lua/pre-bios.lua");
	code.bios = getfile(config.bios);
}