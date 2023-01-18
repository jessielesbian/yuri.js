'use strict';

//npm install yuri-connector first
const connect = require("yuri-connector");
const optimisticallyExecute = require("intelliex");
(async function () {
	const connection = connect("ws://localhost:12345");
	console.log(await optimisticallyExecute(connection, async function (read, write) {
		//initial read
		let val = parseInt(await read("counter"));
		if (isNaN(val)) {
			val = 0;
		}

		write("counter", (val + 1).toString());
		return val;
	}, "ctr"));

	connection.close();
})();