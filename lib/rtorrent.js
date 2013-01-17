/***
 *
 *
 */

var fs = require('fs');
var path = require('path');
var events = require('events');
var util = require('util');
var xmlrpc = require('xmlrpc');

/**
 *
 */
var mapper = require('./mapper')

var fileMapper = mapper.fileMapper;
var peerMapper = mapper.peers;
var rtorrentTorrents = mapper.rtorrentTorrents;
/**
 *
 */

var rTorrent = module.exports = function(options, clients) {
	var self = this;
	events.EventEmitter.call(this)
	this.port = options.port || 80;
	this.host = options.host || '127.0.0.1';
	this.path = options.path || '/RPC1';
	this.user = options.user || null;
	this.pass = options.pass || null;
	options = {
		host : this.host,
		port : this.port,
		path : this.path
	};

	if(this.user && this.pass) {
		options.basic_auth = {
			user : this.user,
			pass : this.pass
		}
	}

	this.xmlrpc = xmlrpc.createClient(options);
	//
	this.torrents = {};
	this._peers = {};
	this.timmer = 0;
};
// So will act like an event emitter
util.inherits(rTorrent, events.EventEmitter);
/***
 * rTorrent.start
 *
 */
rTorrent.prototype.startPoll = function(time) {
	this.stopPoll()
	var self = this;

	self.details(function(err, torrents) {
		self.timer = setInterval(function() {
			self.details(function(err, torrents) {

				self.emit('torrents', torrents)
			})
		}, time)
		self.emit('torrents', torrents)
	})
}
/***
 * rTorrent.start
 *
 */
rTorrent.prototype.stopPoll = function() {
	clearInterval(this.timmer)
	this.timmer = 0
}
/***
 * rTorrent.start
 *
 */
rTorrent.prototype.start = function(hash, callBack) {
	var self = this;
	this.xmlrpc.methodCall('d.open', [hash], function(err, data) {
		if(err)
			return callBack(err);
		self.xmlrpc.methodCall('d.start', [hash], function(err, data) {
			if(err)
				return callBack(err);

			return callBack(null)
		})
	})
};
/***
 * rTorrent.stop
 *
 */
rTorrent.prototype.stop = function(hash, callBack) {
	var self = this;
	this.xmlrpc.methodCall('d.stop', [hash], function(err, data) {
		if(err)
			return callBack(err);
		self.xmlrpc.methodCall('d.close', [hash], function(err, data) {
			if(err)
				return callBack(err);

			return callBack(null)
		})
	})
};
/***
 * rTorrent.remove
 *
 */
rTorrent.prototype.remove = function(hash, callBack) {
	this.xmlrpc.methodCall('d.erase', [hash], function(err, data) {
		if(err)
			return callBack(err);
		return callBack(null)
	})
};
/***
 * rTorrent.upload
 *
 */
rTorrent.prototype.upload = function(filePath, callBack) {
	this.xmlrpc.methodCall('load', [filePath, 'd.open=', 'd.start='], function(err, val) {
		if(err)
			return callBack(err);
		callBack(null);
	})
};
rTorrent.prototype.getFreeDiskSpace = function(callBack) {
	var self = this;
	this.xmlrpc.methodCall('d.multicall', ['default', 'd.free_diskspace='], function(err, data) {
		if (err) return callBack(err, {}, data);
		var uniques = {};
		for ( var i = 0 ; i < data.length ; i++ ) {
			uniques[data[i]] = data[i][0];
		}
		callBack(err, uniques, data);
	});
};
/***
 * rTorrent.details
 *
 */
rTorrent.prototype.details = function(callBack) {
	var self = this;
	this.xmlrpc.methodCall('d.multicall', ['default'].concat(fields.torrents), function(err, data) {
		if(err)
			return callBack(err);
		rtorrentTorrents([].concat(data), {
			hash : 0,
			status : 1,
			name : 2,
			size : 3,
			upRate : 6,
			downRate : 7,
			path : 9,
			created : 10,
			active : 11,
			peerCount : 8,
			totalUp : 4,
			totalDown : 13,
			complete: 12,
			directory: 14
		}, self.host + ':' + self.port + self.path, function(err, torrents) {

			callBack(err, torrents, data)
		})
	})
};
rTorrent.prototype.getPath = function(hash, callBack) {
	var self = this;
	this.xmlrpc.methodCall('d.get_directory', [hash], function(err, data) {
		return callBack(err, data)
	});
};
rTorrent.prototype.setPath = function(hash, directory, callBack) {
	var self = this;
	this.xmlrpc.methodCall('d.set_directory', [hash, directory], function(err, data) {
		return callBack(err, data)
	});
};
rTorrent.prototype.getBase = function(callBack) {
	var self = this;
	this.xmlrpc.methodCall('get_directory', [], function(err, data) {
		return callBack(err, data)
	});
};
rTorrent.prototype.methodHelp = function(method) {
	var self = this;
	this.xmlrpc.methodCall('system.methodHelp', [method], function(err, data) {
		console.log(err);
		console.log(data);
	});
};
rTorrent.prototype.full = function(callBack) {
	var self = this;

	this.details(function(err, torrents) {
		torrents.forLoop(function(torrent, done) {
			if(torrent.peerCount > 0) {
				self.peers(torrent.hash, function(err, peers) {
					torrent.peers = peers;
					self.files(torrent.hash, function(err, files) {
						torrent.files = files;

						self.tracker(torrent.hash, function(err, trackers) {
							torrent.trackers = trackers;

							done(torrent)
						})
					})
				})
			} else {
				torrent.peers = [];
				self.files(torrent.hash, function(err, files) {
					torrent.files = files;

					self.tracker(torrent.hash, function(err, trackers) {
						torrent.trackers = trackers;

						done(torrent)
					})
				})
			}
		}, callBack)
	})
};
/***
 * rTorrent.peers
 *
 */

rTorrent.prototype.peers = function(hash, callBack) {
	var self = this;
	this.xmlrpc.methodCall('p.multicall', [hash, ''].concat(fields.peers), function(err, data) {
		if(err)
			return callBack(err);
		peerMapper([].concat(data), {
			ip : 0,
			clientVersion : 1,
			completedPercent : 2,
			cleintId : 5,
			upRate : 7,
			downRate : 3,
			port : 6,
			totalUp : 8,
			totalDown : 4
		}, hash, self.host + ':' + self.port + self.path, function(err, peers) {
			self.emit('peers', hash, peers)
			callBack(err, peers, data)
		})
	})
};
/***
 *
 * rTorrent.files
 *
 */

rTorrent.prototype.files = function(hash, callBack) {
	var self = this;
	this.xmlrpc.methodCall('f.multicall', [hash, ''].concat(fields.files), function(err, data) {

		fileMapper([].concat(data), {
			completedChunks : 0,
			frozenPath : 1,
			isCreated : 2,
			isOpen : 3,
			lastTouched : 4,
			path : 8,
			priority : 11
		}, hash, self.host + ':' + self.port + self.path, function(err, peers) {
			callBack(err, peers, data)
		})
	})
};
/***
 *
 */

rTorrent.prototype.tracker = function(hash, callBack) {
	var self = this;
	this.xmlrpc.methodCall('t.multicall', [hash, ''].concat(fields.tracker), function(err, data) {

		fileMapper([].concat(data), {
			group : 0,
			id : 1,
			minInterval : 2,
			normalInterval : 3,
			scrapeComplete : 4,
			scrapeDownloaded : 5,
			scrapeTimeLast : 6,
			trackerType : 7,
			url : 8,
			enabled : 9,
			isOpen : 10,
			scrapeIncomplete : 11
		}, hash, self.host + ':' + self.port + self.path, function(err, peers) {
			callBack(err, peers, data)
		})
	})
};
/***
 * rtorrent feilds
 */
var fields = {
	peers : ['p.get_address=', 'p.get_client_version=', 'p.get_completed_percent=', 'p.get_down_rate=', 'p.get_down_total=', 'p.get_id=', 'p.get_port=', 'p.get_up_rate=', 'p.get_up_total='],
	tracker : ["t.get_group=", "t.get_id=", "t.get_min_interval=", "t.get_normal_interval=", "t.get_scrape_complete=", "t.get_scrape_downloaded=", "t.get_scrape_time_last=", "t.get_type=", "t.get_url=", "t.is_enabled=", "t.is_open=", "t.get_scrape_incomplete="],
	system : ["get_bind", "get_check_hash", "get_dht_port", "get_directory", "get_download_rate", "get_hash_interval", "get_hash_max_tries", "get_hash_read_ahead", "get_http_cacert", "get_http_capath", "get_http_proxy", "get_ip", "get_max_downloads_div", "get_max_downloads_global", "get_max_file_size", "get_max_memory_usage", "get_max_open_files", "get_max_open_http", "get_max_peers", "get_max_peers_seed", "get_max_uploads", "get_max_uploads_global", "get_min_peers_seed", "get_min_peers", "get_peer_exchange", "get_port_open", "get_upload_rate", "get_port_random", "get_port_range", "get_preload_min_size", "get_preload_required_rate", "get_preload_type", "get_proxy_address", "get_receive_buffer_size", "get_safe_sync", "get_scgi_dont_route", "get_send_buffer_size", "get_session", "get_session_lock", "get_session_on_completion", "get_split_file_size", "get_split_suffix", "get_timeout_safe_sync", "get_timeout_sync", "get_tracker_numwant", "get_use_udp_trackers", "get_max_uploads_div", "get_max_open_sockets"],
	torrents : ["d.get_hash=", "d.get_state=", "d.get_name=", "d.get_size_bytes=", "d.get_up_total=", "d.get_ratio=", "d.get_up_rate=", "d.get_down_rate=", "d.get_peers_accounted=", "d.get_base_path=", "d.get_creation_date=", 'd.is_active=', "d.complete=", "d.get_down_total=", "d.get_directory="],
	files : ["f.get_completed_chunks=", "f.get_frozen_path=", "f.is_created=", "f.is_open=", "f.get_last_touched=", "f.get_match_depth_next=", "f.get_match_depth_prev=", "f.get_offset=", "f.get_path=", "f.get_path_components=", "f.get_path_depth=", "f.get_priority=", "f.get_range_first=", "f.get_range_second=", "f.get_size_bytes=", "f.get_size_chunks="]
};
