//
//  code.js
//  GravityScore and 1lann
//



var code = {};


code.getAll = function() {
	return code.prebios + "\n"+
	"loadstring([=====[" + 
	   code.bios
	+" ]=====], \"bios.lua\")()";
}


{
	var getfile = function(file){
		var xhttp = new XMLHttpRequest();
		xhttp.open("GET", file, false);
		xhttp.send();
		return xhttp.responseText;
	}
	code.prebios = getfile("lua/pre-bios.lua");
	code.bios = getfile("lua/bios.lua");
}