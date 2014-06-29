var EventEmitter = require("events").EventEmitter;
var util = require('util');

var TRACE = true;
var DETAIL = false;


/**
 * A bus for communicating between a Lifx Meem and Lifx Bulb Meems.
 * 
 * @param {Object} hue  The hue api object.
 */
var ZBeeBus =  module.exports = function(coordinator) {
	EventEmitter.call(this);
	
	//this.zbee = zbee;
	this.coordinator = coordinator;
	
	this.devices = {};
	this.nodes = {};
	
	var self = this;
	
	// handle events from coordinator
	coordinator.on('xxxxxx', function(b) {
        //console.log('Bulb state: ' + util.inspect(b));
//		b.bulb.name;
//		var id = b.bulb.lifxAddress.toString("hex");
//        self._handleStatus(id, b);
	});
		
	this.start();
};
util.inherits(ZBeeBus, EventEmitter);


/**
 * Send facet message
 */
ZBeeBus.prototype.sendMessage = function(nodeAddress, facet, method, args) {
	// node|endpoint|cluster : method, 
	var data = null;
	console.log('received facet message: ', nodeAddress + ': ' + data);
	
	switch (cmd) {
		case "value":
			break;
	}
};


/**
 * 
 */
ZBeeBus.prototype.sendAT = function(command) {
	console.log('I received a an AT command: ', command);
	this.coordinator.at(command);
};


ZBeeBus.prototype.start = function() {
	var self = this;
	this._poller = setInterval(function() {
		if (TRACE && DETAIL) {
			console.log("ZBeeBus: polling for status");
		}
		//self.lx.requestStatus();		// request status of all bulb on the network
	}, 30000);
};

ZBeeBus.prototype.stop = function(id, callback) {
	if (this._poller) {
		clearInterval(this._poller);
	}
};
