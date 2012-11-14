/*global setTimeout escape*/
var WebSocketMultiplex = (function(){

	var newId = (function () {
		var count = 0;
		return function () {
			return count++;
		};
	}());


    // ****

    var DumbEventTarget = function() {
        this._listeners = {};
    };
    DumbEventTarget.prototype._ensure = function(type) {
        if(!(type in this._listeners)) this._listeners[type] = [];
    };
    DumbEventTarget.prototype.addEventListener = function(type, listener) {
        this._ensure(type);
        this._listeners[type].push(listener);
    };
    DumbEventTarget.prototype.emit = function(type) {
        this._ensure(type);
        var args = Array.prototype.slice.call(arguments, 1);
        if(this['on' + type]) this['on' + type].apply(this, args);
        for(var i=0; i < this._listeners[type].length; i++) {
            this._listeners[type][i].apply(this, args);
        }
    };


    // ****

    var WebSocketMultiplex = function(ws) {
        var that = this;
        this.ws = ws;
        this.channels = {};
        this.ws.addEventListener('message', function(e) {
			//uns and msg should use channel id not channel name to identify their target
            var t = e.data.split(',');
            var type = t.shift(), topic = t.shift(), id = t.shift(),  payload = t.join();
            if(!(id in that.channels)) {
                return;
            }
            var sub = that.channels[id];

            switch(type) {
            case 'uns':
                delete that.channels[id];
                sub.emit('close', {});
                break;
            case 'msg':
                sub.emit('message', {data: payload});
                break;
            }
        });
    };
    WebSocketMultiplex.prototype.channel = function(raw_name) {
		var id = newId();
		var ch = new Channel(this.ws, escape(raw_name), id, this.channels);
        this.channels[id] = ch;
        return ch;
    };

    var Channel = function(ws, name, id, channels) {
        DumbEventTarget.call(this);
        var that = this;
        this.ws = ws;
        this.name = name;
        this.id = id;
        this.channels = channels;
        var onopen = function() {
            that.ws.send('sub,' + that.name+','+that.id);
            that.emit('open');
        };
        if(ws.readyState > 0) {
            setTimeout(onopen, 0);
        } else {
            this.ws.addEventListener('open', onopen);
        }
    };
    Channel.prototype = new DumbEventTarget();

    Channel.prototype.send = function(data) {
        this.ws.send('msg,' + this.name + ',' +this.id + ',' + data);
    };
    Channel.prototype.close = function() {
        var that = this;
        this.ws.send('uns,' + this.name + ',' + this.id);
        delete this.channels[this.id];
        setTimeout(function(){that.emit('close', {});},0);
    };

    return WebSocketMultiplex;
})();
