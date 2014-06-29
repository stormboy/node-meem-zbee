module.exports = {
	mqtt: {
		host: "192.168.0.23",
		port: 1883
	},
	meemstore: {
		//path: (__dirname+'/data/'),
		path: ('./meemstore/'),
	},
	gateway: {
		port: "/dev/cu.usbserial-A4013FE3",
		baud: 9600
	}
};
