
//
//  http.js
//  GravityScore and 1lann
//



var httpAPI = {};


httpAPI.request = function(L) {
	var computer = core.getActiveComputer();
	var url = C.luaL_checkstring(L, 1);

	if (!navigator.onLine) {
		setTimeout(function() {
			console.log("Not online!")
			computer.eventStack.push(["http_failure", url]);
			computer.resume();
		}, 10);

		return 0;
	}
	
	setTimeout(function() {
		console.log("Not online!")
		computer.eventStack.push(["http_failure", url]);
		computer.resume();
	}, 10);
		
	//Dumb HTTP
	

	return 0;
}
