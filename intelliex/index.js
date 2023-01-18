'use strict';

{
	const splitstr2 = function (str) {
		if (str) {
			const split = str.indexOf('_');
			if (split > 0) {
				return str.substring(split + 1);
			} else {
				return null;
			}
		}
		return null;
	};
	const optimisticFaultStr = "LesbianDB-OptimisticFault-" + require("crypto").randomBytes(32).toString('hex');
	const bigone = BigInt(1);
	module.exports = async function (connection, func, counter_key) {
		const reads = {};
		while (true) {
			const tmpread2 = await connection.execute([counter_key], {}, {})[counter_key];
			const bigctr = BigInt(tmpread2 ?? 0);
			const condidions = {};
			const writes2 = {};
			condidions[counter_key] = tmpread2;
			writes2[counter_key] = (bigctr + bigone).toString();
			if (tmpread2 !== await connection.execute([counter_key], condidions, writes2)[counter_key]) {
				continue;
			}
			const writes = { };
			let ret;
			try {
				ret = await func(async function (key) {
					if (key in writes) {
						return writes[key];
					}
					if (key in reads) {
						return splitstr2(reads[key]);
					}
					const x = (await connection.execute([key], {}, {}))[key];
					if (key in writes) {
						return writes[key];
					}
					if (key in reads) {
						return splitstr2(reads[key]);
					}
					reads[key] = x;
					if (!x) {
						return null;
					}
					const split = x.indexOf('_');
					let ind;
					if (split > 0) {
						ind = x.substring(0, split);
					} else {
						ind = split;
					}
					if (BigInt(ind) > bigctr) {
						throw optimisticFaultStr;
					}

					return split > 0 ? x.substring(split + 1) : null;
				}, function (key, value) {
					writes[key] = value;
				});
			} catch (e) {
				if (e === optimisticFaultStr) {
					reads = await connection.execute(Object.keys(reads), {}, {});
					continue;
				}
				throw e;
			}
			if (Object.keys(writes).length == 0) {
				return ret;
			}
			const writes3 = {};
			const prefix = tmpread2 ? tmpread2 : "0";
			const extendedPrefix = tmpread2 ? (prefix + "_") : "0_";
			for (const [key, value] of Object.entries(writes)) {
				writes3[key] = value ? (extendedPrefix + value) : prefix;
			}
			const reads1 = await connection.execute(Object.keys(reads), reads, writes3);
			for (const [key, value] of Object.entries(reads1)) {
				if (reads[key] !== value) {
					reads = reads1;
					continue;
				}
			}
			return ret;
		}
	};
}