var mobileKeyboardBox = $("#mobile-keyboard");

var buttons = {
    
}

var UIKey = function(label, code, id, char) {
    this.code = code;
    this.id = id;
    this.char = char;
    
    var btn = document.createElement("button");
    btn.id = "keyboard-key-"+label;
    btn.className = "keyboard-key btn btn-default";
    btn.innerHTML = label;
	btn.parent = this;
    if (code) buttons[code] = btn;
    
    btn.addEventListener("mousedown", this.onMouseDown);
    btn.addEventListener("mouseup", this.onMouseUp);
    
    this.button = btn;
    mobileKeyboardBox.add(btn).appendTo(mobileKeyboardBox);
}

UIKey.prototype.onMouseDown = function() {
    navigator.vibrate(100)
	var computer = core.getActiveComputer();
    if (this.parent.id) computer.eventStack.push(["key", this.parent.id, false]);
    if (this.parent.char) computer.eventStack.push(["char", this.parent.char]);
}
UIKey.prototype.onMouseUp = function() {
	var computer = core.getActiveComputer();
    if (this.parent.id) computer.eventStack.push(["key_up", this.parent.id]);
}

{
    var br = function(){
		mobileKeyboardBox.add("<br/>").appendTo(mobileKeyboardBox);
	}
	
	br();
	new UIKey("paste");
	$("#keyboard-key-paste").click(function() {
		var computer = core.getActiveComputer();
		navigator.permissions.query({name: 'clipboard-read'}).then(p => {
			if (p.state == "denied") {
			    $("#clipboard-permission-modal").modal("show")
			} else {
			    var r;
			    if (navigator.clipboard.readText) {
			        r = navigator.clipboard.readText();
			    } else {
			        r = navigator.clipboard.read();
			    }
				r.then(text => {
					computer.eventStack.push(["paste", text]);
					computer.resume();
				}).catch(err => {
				    $("#clipboard-permission-modal").modal("show");
				});
			}
		});
	});
    br();br();
	
    new UIKey("esc", 27, 1);
    for (var i = 1; i<=12; i++) new UIKey("F"+i, 111+i, 58+i);
	br();
    new UIKey("tab", 9, 15);
	br();
    new UIKey("ctrl", 17, 29);
	new UIKey("menu", 91, 219);
    new UIKey("alt", 18, 56);
    new UIKey("alt", 18, 184);
	new UIKey("menu", 92, 220);
    new UIKey("ctrl", 17, 157);
    new UIKey("<", 37, 203);
    new UIKey("^", 38, 200);
    new UIKey(">", 39, 205);
    new UIKey("v", 40, 208);
}