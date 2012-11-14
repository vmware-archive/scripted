/*global require setTimeout console SockJS WebSocketMultiplex */

(function () {

	var MULTIPLEX = true;
	var multiplexer = null;
	
	function getMultiplexer() {
		if (!multiplexer) {
			var sockjs = new SockJS('/multiplexer');
			multiplexer = new WebSocketMultiplex(sockjs);
		}
		return multiplexer;
	}

	function createSocket(name) {
		if (MULTIPLEX) {
			return getMultiplexer().channel(name);			
		} else {
			return new SockJS('/'+name);
		}
	}
	
	function talkToTheSocket(myName, interval) {
		var sock = createSocket('echo');

		function log(msg) {
			console.log('['+myName+'] '+msg);
		}

		function send(msg) {
			log('>> '+msg);
			sock.send(msg);
		}
	
		function conversation(i) {
			if (i < 10) {
				send(myName + " says "+i);
				setTimeout(function () {
					conversation(i+1);
				}, interval);
			} else {
				sock.close();
				setTimeout(function () {
					send(myName + 'talking to closed connection, should be dropped');
				}, interval);			
			}
		}
		
		sock.onopen = function () {
			log(' initiates a conversation');
			conversation(0);
		};
		sock.onmessage = function (e) {
			log('<< ' + e.data);
		};
		sock.onclose = function () {
			log(' is leaving');
		};
	
	}
	
	//Ann and Bob are talking to the same service at the same time
	talkToTheSocket('Bob', 2000); 
	talkToTheSocket('Ann', 1500);

}());