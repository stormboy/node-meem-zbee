var meem = require('meem');
var zbee = require("zbee");
var EventEmitter = require("events").EventEmitter;
var util = require('util');
var ZBeeBus = require("./bus");
var ZBeeNode = require("./node");
var ZBeeDevice = require("./device");

var TRACE = true;
var DETAIL = false;

/**
 * A ZBee discoverer Meem
 */
var ZBeeDiscoverer = module.exports = function ZBeeDiscoverer(def) {
	meem.Meem.call(this, def, {}, {});
	this.isSubsystem = true;
	
	this.coordinator = null;
	
	// TODO get from config properties
	var config = {
		port: "/dev/cu.usbserial-A4013FE3",
		baud: 9600
	};
	
	this.init(config);
};

util.inherits(ZBeeDiscoverer, meem.Meem);


ZBeeDiscoverer.prototype.init = function(config) {
	var self = this;
	
	// create new XBee HA coordinator
	var coordinator = self.coordinator = new zbee.Coordinator(config);
	self.zbeeBus = new ZBeeBus(coordinator);

	// handle ZB coordinator initialisation
	coordinator.on("init", function() {
		if (TRACE) {
			console.log("--- received init from coordinator");
		}
		coordinator.getStoredNodes(function(err, nodes) {
			for (var i=0; i<nodes.length; i++) {
				var node = nodes[i];
				//console.log("got stored node: " + utils.inspect(node));
				self.zbeeBus.emit('node', node);
			}
		});
		
		coordinator.getStoredDevices(function(err, devices) {
			for (var i=0; i<devices.length; i++) {
				var device = devices[i];
				//console.log("got stored device: " + utils.inspect(device));
				self.zbeeBus.emit('device', device);
			}
		});
	});

	// handle node discovery
	coordinator.on("node", function(node) {		// create ZBee Node Meem
		// TODO check if Node already exists.  If so, update it's status
		var desc = node.toDesc();
		if (TRACE) {
			console.log("node: " + util.inspect(desc));
		}
		var meemDef = {
			id: "zbee-" + desc.address64,
			type: "net.sugarcoding.zbee.ZBeeNode",
			persistent: false,						// make lights transient
			subsystemBus: self.zbeeBus,				// TODO better way of passing deviceBus to device meems
			content: {
				address: desc.address64,
				address16: desc.address16,
			},
			//state: desc.state,
		};
		self.emit("createMeem", meemDef, function(err, meem) {
			if (TRACE && DETAIL) {
				if (err) {
					console.log("ZBeeDiscoverer: error creating ZBeeNode meem: " + err);
				}
				else {
					console.log("ZBeeDiscoverer: created ZBeeNode meem: " + meem);
				}
			}
		});
		
		self.zbeeBus.emit('node', desc);
		self.zbeeBus.emit('lifecycle', { address64: node.remote64.hex, state: "alive" });
	});

	// handle devices/application-object discovery
	coordinator.on("device", function(device) {
		if (TRACE) {
			console.log("got device: " + util.inspect(device));
		}
		if (device) {
			if (device.node) {
				// not a spec, convert
				device = device.toSpec();
			}
			self.zbeeBus.emit('device', device);
			
			var meemDef = {
				id: "zbee-" + device.id,
				type: "net.sugarcoding.zbee.ZBeeDevice",
				name: device.deviceName,
				status: device.status,
				address64: device.address64,
				address16: device.address16,
				endpoint: device.endpoint,
				profileId: device.profileId,
				deviceId: device.profileId,
				deviceVersion: device.deviceVersion,
				inputClusters: device.inputClusters,
//				   [ { id: 0, name: 'Basic' },
//				     { id: 3, name: 'Identify' },
//				     { id: 4, name: 'Groups' },
//				     { id: 5, name: 'Scenes' },
//				     { id: 6, name: 'On/Off' },
//				     { id: 21, name: undefined },
//				     { id: 1794, name: 'Meter' } ],
				outputClusters: device.outputClusters,
				  //updated: Sun Jun 29 2014 17:30:55 GMT+1000 (EST)
			};
			self.emit("createMeem", meemDef, function(err, meem) {
				if (TRACE && DETAIL) {
					if (err) {
						console.log("ZBeeDiscoverer: error creating ZBeeNode meem: " + err);
					}
					else {
						console.log("ZBeeDiscoverer: created ZBeeNode meem: " + meem);
					}
				}
			});
		}
		else {
			console.log("why no device/application object??");
		}
	});

	coordinator.zbee.on("lifecycle", function(address64, state) {
		self.zbeeBus.emit('lifecycle', {
			address64 : address64,
			state : state,
		});
	});

	/**
	 * cluster message
	 */
	coordinator.on("explicit", function(message) {
		if (TRACE) {
			console.log("explicit message: " + util.inspect(message));
		}
		self.zbeeBus.emit("explicit", message);
	});

	/**
	 * Report on cluster attributes
	 */
	coordinator.on("attributeReport", function(message) {
		self.zbeeBus.emit("attributeReport", message);
	});
};


_facets = function() {
		// send nodes to client
		coordinator.getStoredNodes(function(err, nodes) {
			for (var i=0; i<nodes.length; i++) {
				var node = nodes[i];
				socket.emit('node', node);
			}
		});
		// send devices to client
		coordinator.getStoredDevices(function(err, devices) {
			for (var i=0; i<devices.length; i++) {
				var device = devices[i];
				socket.emit('device', device);
			}
		});

		// listen for commands from the client
		socket.on('command', function (cmd, data) {
			console.log('received command: ', cmd, ', data: ', data);
			
			switch (cmd) {
			
			case "discover":
				// Discover Zigbee nodes and Zigbee devices on the network.
				// Not yet implemented properly
				coordinator.discover();
				break;
				
			case "discoverNodeEndpoints":
				// make a Zigbee devices notify itself
				coordinator.discoverNodeEndpoints(data.address64);
				break;
				
			case "identify":
				// make a Zigbee devices notify itself
				coordinator.identifyDevice(data.address64, data.endpoint);
				break;
				
			case "configReporting":
				// configure reporting of attributes to the local node
				coordinator.configReporting(data.address64, data);
				break;
				
			case "addBinding":
				// add binding between clusters on different ZigBee devices.
				coordinator.addBinding(data);
				break;
				
			case "discoverAttributes":
				// Find attributes on a particular cluster
				coordinator.discoverAttributes(data.address64, data.endpoint, data.clusterId, data.start, data.max);
				break;

			case "configure":
				// Configure the XBee for HA
				coordinator.configure();
				break;
			case "save":
				// Write XBee settings to flash
				coordinator.save();
				break;
			case "reset":
				// Reset XBee settings to factory default
				coordinator.reset();
				break;
				
			case "join":
				// Allow new nodes to join the network.
				coordinator.allowJoin();
				break;
			case "leave":
				// Make the Zbee leave the network
				coordinator.leave();
				break;
				
			case "association":
				// Check the network association state on the local Node.
				coordinator.checkAssociation();
				break;
				
			case "test":
				coordinator.test();
				break;
				
			case "queryAddresses":
				coordinator.queryAddresses();
				break;
			}
		});
		
		// node setup
		socket.on('node', function (nodeAddress, cmd, data) {
			console.log('received node command: ' + nodeAddress + " : " + cmd + ' : ', data);
			switch (cmd) {

			case "report":				// configure reporting for attribute (node,endpoint,cluster,attributeId)
				coordinator.configReporting();
				
				// get cluster
				var node = coordinator.getNode(nodeAddress);
				if (node) {
					console.log("got node, now getting cluster");
					//node.devices[endpoint];
					node.getDevice(endpoint);
				}
				break;

			case "unreport":
				break;
				
			case "bind":
				var binding = data;
				coordinator.addBinding(binding);
				//node.zdo.requestBind(binding);

				break;
				
			case "unbind":
				break;
			}
		});

		// node|endpoint|cluster : method, 
		socket.on('facet', function (nodeAddress, facet, method, args) {
			console.log('received facet message: ', nodeAddress + ': ' + data);
			
			switch (cmd) {
			
			case "value":
				break;
			}
		});
		
		// listen for AT command from client
		socket.on('at', function (command) {
			console.log('I received a an AT command: ', command);
			coordinator.at(command);
		});

		// handle client disconnection
		socket.on('disconnect', function () {
			sio.sockets.emit('client socket disconnected');
		});
};


ZBeeDiscoverer.prototype.discover = function() {
	var self = this;
	var handleBridges = function(bridges) {
		self._handleBridges(bridges);
	};
	var handleError = function(err) {
		console.log("ZBeeDiscoverer: locate error: " + err);
		console.error(err);
	};

/*
	lx.on('gateway', function(gw) {
		if (TRACE) {
			console.log('New gateway found: ' + gw.ipAddress.ip + " : " + gw.ipAddress.port + " " + gw.lifxAddress.toString("hex"));
		}
		//gw.findBulbs();
		// TODO create gateway meem
	});
	
	lx.on('bulb', function(b) {
		var id = b.lifxAddress.toString("hex");
		if (TRACE) {
			console.log('New bulb found: ' + b.name + " " + id);
		}
		
		// create LIFX Bulb Meem
		// TODO check if light already exists.  If so, update it's status
		var meemDef = {
			id: "lifx-" + id,
			type: "net.sugarcoding.lifx.LifxBulb",
			persistent: false,						// make lights transient
			subsystemBus: self.zbeeBus,				// TODO better way of passing deviceBus to device meems
			content: {
				id: id,			// light id
				name: b.name,
				address: b.lifxAddress
			},
			//state: desc.state,
		};
		self.emit("createMeem", meemDef, function(err, meem) {
			if (TRACE && DETAIL) {
				if (err) {
					console.log("ZBeeDiscoverer: error creating LifxBulb meem: " + err);
				}
				else {
					console.log("ZBeeDiscoverer: created LifxBulb meem: " + meem);
				}
			}
		});

	});
		
	
	lx.on('packet', function(p) {
		// Show informational packets
		switch (p.packetTypeShortName) {
		
			case 'powerState':
			case 'wifiInfo':
			case 'wifiFirmwareState':
			case 'wifiState':
			case 'accessPoint':
			case 'bulbLabel':
			//case 'lightStatus':
			case 'timeState':
			case 'resetSwitchState':
			case 'meshInfo':
			case 'meshFirmware':
			case 'versionState':
			case 'infoState':
			case 'mcuRailVoltage':
				//console.log(p.packetTypeName + " - " + p.preamble.bulbAddress.toString('hex') + " - " + util.inspect(p.payload));
				break;
				
			case 'tags':
				if (TRACE && DETAIL) {
					console.log(p.packetTypeName + " - " + p.preamble.bulbAddress.toString('hex') + " - " + util.inspect(p.payload));
				}
				var message = packet.getTagLabels(p.payload);
				lx.sendToAll(message);
				break;
				
			case 'tagLabels':
				if (TRACE && DETAIL) {
					console.log(p.packetTypeName + " - " + p.preamble.bulbAddress.toString('hex') + " - " + util.inspect(p.payload));
				}
				// create Lifx Group Meems
				var id = p.payload.tags.toString('hex');
				var meemDef = {
					id: "lifx-group-" + id,
					type: "net.sugarcoding.lifx.LifxGroup",
					persistent: false,						// make lights transient
					subsystemBus: self.zbeeBus,				// TODO better way of passing deviceBus to device meems
					content: {
						id: id,			// group id
						address: p.payload.tags,	// group address
						name: p.payload.label,
					},
					//state: desc.state,
				};
				self.emit("createMeem", meemDef, function(err, meem) {
					if (err) {
						if (TRACE && DETAIL) {
							console.log("ZBeeDiscoverer: error creating LifxBulb meem: " + err);
						}
						return;
					}
					if (TRACE && DETAIL) {
						console.log("ZBeeDiscoverer: created LifxBulb meem: " + meem);
					}
				});
				
				break;

			default:
				break;
		}
	});
	*/
	
};










