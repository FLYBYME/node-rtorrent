/***
 * peer mapper.
 */
module.exports.peers = function(data, indexs, hash, serverName, callBack) {
	var keys = Object.keys(indexs)
	var length = keys.length
	if(Array.isArray(data)) {
		data.forLoop(function(d, done) {
			var peer = {};
			for(var i = 0, j = keys.length; i < j; i++) {
				var name = keys[i]
				peer[name] = d[indexs[name]];
			};
			peer.hash = hash;
			peer.server = serverName;
			done(peer)
		}, callBack);
	} else {
		callBack(true)
	}
};
module.exports.rtorrentTorrents = function(data, indexs, serverName, callBack) {
	var keys = Object.keys(indexs);
	var length = keys.length;
	if(Array.isArray(data)) {
		data.forLoop(function(d, done) {
			var torrent = {};
			for(var i = 0, j = keys.length; i < j; i++) {
				var name = keys[i];
				torrent[name] = d[indexs[name]];
			};
			torrent.server = serverName;
			done(torrent);
		}, callBack);
	} else {
		callBack(true);
	}
};
/**
 *
 */
module.exports.fileMapper = function(data, indexs, hash, serverName, callBack) {
	var keys = Object.keys(indexs);
	var length = keys.length;
	if(Array.isArray(data)) {
		data.forLoop(function(d, done) {
			var torrent = {};
			for(var i = 0, j = keys.length; i < j; i++) {
				var name = keys[i];
				torrent[name] = d[indexs[name]];
			};
			torrent.hash = hash;
			torrent.server = serverName;
			done(torrent);
		}, callBack);
	} else {
		callBack(true);
	}
};
/**
 *
 */
Array.prototype.forLoop = function(worker, callBack) {
	var self = this;

	var returnData = [];

	var loop = function(i) {

		if(i === self.length) {
			return callBack(null, returnData);
		}

		process.nextTick(function() {
			worker.call(self, self[i], function(d) {
				returnData.push(d);
				loop(++i);
			});
		});
	};
	loop(0);

};
