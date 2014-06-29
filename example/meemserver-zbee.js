/**
 * Example MeemServer that includes a single ZBeeDiscoverer Meem for finding ZBee devices.
 */

var meem = require("meem");
var config = require("./config");
var meemZbee = require("../");

config.namespaces = {
	"org.meemplex.core" : meem.meems.core,
	"org.meemplex.demo" : meem.meems.demo,
	"net.sugarcoding.zbee": meemZbee,
	//"net.sugarcoding.hue": require("meem-hue"),
	//"net.sugarcoding.upnp": require("meem-upnp"),
	//"net.sugarcoding.nest": require("meem-nest"),
	//"net.sugarcoding.avr": require("meem-avr"),
	//"net.sugarcoding.zbee": require("meem-zbee"),
	//"net.sugarcoding.datalog": require("meem-datalog"),
	//"net.sugarcoding.raven": require("meem-raven"),
};

var meemServer = new meem.MeemServer(config);
//meemserver.addNamespace("net.sugarcoding.zbee", zbee);

meemServer.start();

// handler for Meem when created or discovered
var handleDiscovererMeem = function(discoveryMeem) {
	discoveryMeem.on("discovered", function(gateways) {
		console.log("--- got gateways: " + JSON.stringify(gateways));
	});
	discoveryMeem.discover();
};

// Meem definition
var meemId = "MyZbeeDiscoverer";
var meemDef = {
	id: meemId,
	type: "net.sugarcoding.zbee.ZBeeDiscoverer",
	content: {
		port: config.gateway.port,
		baud: config.gateway.baud,
	}
};

// try to locate meem by ID. If does not exist, create it.
meemServer.locateMeem(meemId, function(err, meem) {
	if (meem) {
		handleDiscovererMeem(meem);
	}
	else {
		meemServer.addMeem(meemDef, function(err, discoveryMeem) {
			if (err) {
				console.log("--- ZBeeDiscoverer: problem while creating ZBee discoverer meem: " + err);
				//return;
			}
			if (!discoveryMeem) {
				console.log("--- ZBeeDiscoverer: no discoverer meem created");
				return;
			}
			console.log("--- ZBeeDiscoverer: created");
			handleDiscovererMeem(discoveryMeem);
		});
	}
});
