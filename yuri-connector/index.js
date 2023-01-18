'use strict';
{
	const createSemaphore = function () {
		const queue = [];
		let count = 0;
		return {
			enter: function () {
				return new Promise(function (callback) {
					if (count == 0) {
						queue.push(callback);
					} else {
						--count;
						callback();
					}
				});
			}, exit: function () {
				if (queue.length == 0) {
					++count;
				} else {
					queue.pop()();
				}
			}
		}
	};
	const crypto = require("crypto");
	const loop = async function (url, semaphore, queue, exit) {
		while (true) {
			const wsclient = new WebSocket(url, "LesbianDB-v2.1");
			if (await new Promise(function (resolve) {
				wsclient.onerror = function () {
					wsclient.onerror = undefined;
					resolve(true);
				};
				wsclient.onopen = function () {
					wsclient.onerror = undefined;
					resolve(false);
				};

			})) {
				continue;
			}
			const dict = {};
			wsclient.onmessage = function (msg) {
				const response = JSON.parse(msg.data);
				const id = response.id;
				dict[id].resolve(response.result);
				delete dict[id];
			};
			(async function () {
				while (true) {
					await semaphore.enter();
					const packet = queue.pop();
					const id = crypto.randomBytes(32).toString('hex');
					dict[id] = { resolve: packet.resolve, reject: packet.reject }
					wsclient.send(JSON.stringify({ id: id, reads: packet.reads, conditions: packet.conditions, writes: packet.writes }));
				}
			})();
			const loopExitMode = await new Promise(function (resolve) {
				wsclient.onerror = function (err) {
					resolve(false);
					for (const value of Object.values(dict)) {
						value.reject(err);
					}
				};
				exit.then(function () {
					wsclient.onerror = undefined;
					resolve(true);
				});
			});
			wsclient.close();
			if (loopExitMode) {
				break;
			}
			
		}

	}
	const WebSocket = require("ws");
	module.exports = function (url) {
		const semaphore = createSemaphore();
		const queue = [];
		const returns = {
			execute: function (reads, conditions, writes) {
				const promise = new Promise(function (resolve, reject) {
					queue.push({ resolve: resolve, reject: reject, reads: reads, conditions: conditions, writes: writes });
				});
				semaphore.exit();
				return promise;
			}
		};
		const exit = new Promise(function (resolve) {
			returns.close = resolve;
		});
		loop(url, semaphore, queue, exit);
		return returns;
		
		
	}

}