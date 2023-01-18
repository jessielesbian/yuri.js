'use strict';

const connect = require("yuri-connector");
(async function () {
	const connection = connect("ws://localhost:12345");
	while (true) {
		//initial read
		const read = (await connection.execute(["counter"], {}, {}))["counter"];

		let val = parseInt(read);
		if (isNaN(val)) {
			val = 0;
		}

		//compare-and-swap
		if (read == (await connection.execute(["counter"], { counter: read }, { counter: (val + 1).toString() }))["counter"]) {

			//won CAS, leave the loop
			console.log(val);
			break;
		}
	}


	connection.close();
})();