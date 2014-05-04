


(function () {
	"use strict";



	// Instances
	var youtube_api = null;



	// Module for performing actions as soon as possible
	var ASAP = (function () {

		// Variables
		var state = 0;
		var callbacks_asap = [];
		var callbacks_ready = [];
		var callbacks_check = [];
		var callback_check_interval = null;
		var callback_check_interval_time = 20;
		var on_document_readystatechange_interval = null;



		// Events
		var on_document_readystatechange = function () {
			// State check
			if (document.readyState == "interactive") {
				if (state == 0) {
					// Mostly loaded
					state = 1;

					// Callbacks
					var c = callbacks_asap;
					callbacks_asap = null;
					trigger_callbacks(c);
				}
			}
			else if (document.readyState == "complete") {
				// Loaded
				state = 2;

				// Callbacks
				var c;
				if (callbacks_asap !== null) {
					c = callbacks_asap;
					callbacks_asap = null;
					trigger_callbacks(c);
				}

				c = callbacks_ready;
				callbacks_ready = null;
				trigger_callbacks(c);

				// Complete
				clear_events();
			}
		};
		var on_document_load = function () {
			// Loaded
			state = 2;

			// Callbacks
			var c;
			if (callbacks_asap !== null) {
				c = callbacks_asap;
				callbacks_asap = null;
				trigger_callbacks(c);
			}

			c = callbacks_ready;
			callbacks_ready = null;
			trigger_callbacks(c);

			// Complete
			clear_events();
		};
		var on_callbacks_check = function () {
			// Test all
			for (var i = 0; i < callbacks_check.length; ++i) {
				if (callback_test.call(null, callbacks_check[i])) {
					// Remove
					callbacks_check.splice(i, 1);
					--i;
				}
			}

			// Stop timer?
			if (callbacks_check.length == 0) {
				clearInterval(callback_check_interval);
				callback_check_interval = null;
			}
		};
		var on_callback_timeout = function (data) {
			// Remove
			for (var i = 0; i < callbacks_check.length; ++i) {
				if (callbacks_check[i] === data) {
					// Update
					data.timeout_timer = null;

					// Callback
					if (data.timeout_callback) data.timeout_callback.call(null);

					// Remove
					callbacks_check.splice(i, 1);
					return;
				}
			}
		};

		// Clear events
		var clear_events = function () {
			if (on_document_readystatechange_interval !== null) {
				// Remove timer
				clearInterval(on_document_readystatechange_interval);
				on_document_readystatechange_interval = null;

				// Remove events
				document.removeEventListener("readystatechange", on_document_readystatechange, false);
				document.removeEventListener("load", on_document_load, false);

				// Clear callbacks
				callbacks_asap = null;
				callbacks_ready = null;
			}
		};

		// Test callback
		var callback_test = function (data) {
			if (!data.condition || data.condition.call(null)) {
				// Call
				data.callback.call(null);

				// Stop timeout
				if (data.timeout_timer !== null) {
					clearTimeout(data.timeout_timer);
					data.timeout_timer = null;
				}

				// Okay
				return true;
			}

			// Not called
			return false;
		};
		var callback_wait = function (data) {
			// Add to list
			callbacks_check.push(data);
			if (callback_check_interval === null) {
				callback_check_interval = setInterval(on_callbacks_check, callback_check_interval_time);
			}

			// Timeout
			if (data.timeout > 0) {
				data.timeout_timer = setTimeout(on_callback_timeout.bind(null, data), data.timeout * 1000);
			}
		};

		// Trigger callback list
		var trigger_callbacks = function (callback_list) {
			for (var i = 0, j = callback_list.length; i < j; ++i) {
				// Test
				if (!callback_test.call(null, callback_list[i])) {
					// Queue
					callback_wait.call(null, callback_list[i]);
				}
			}
		};

		// Add callback
		var add_callback = function (callback, condition, timeout, timeout_callback, target) {
			var cb_data = {
				callback: callback,
				condition: condition || null,
				timeout: timeout || 0,
				timeout_callback: timeout_callback || null,
				timeout_timer: null
			};

			if (target === null) {
				// Test
				if (!callback_test.call(null, cb_data)) {
					// Queue
					callback_wait.call(null, cb_data);
				}
			}
			else {
				// Add
				target.push(cb_data);
			}
		};

		// Setup events
		on_document_readystatechange();
		if (state < 2) {
			document.addEventListener("readystatechange", on_document_readystatechange, false);
			document.addEventListener("load", on_document_load, false);
			on_document_readystatechange_interval = setInterval(on_document_readystatechange, 20);
		}



		// Return functions
		return {

			/**
				Call a function as soon as possible when the DOM is fully loaded
				(document.readyState == "interactive")

				@param callback
					The callback to be called
					The call format is:
						callback.call(null)
				@param condition
					An additional condition to test for.
					If this condition is falsy, a timeout interval is
					used to continuously test it until it is true (or timed out)
					The call format is:
						condition.call(null)
				@param timeout
					If specified, a maximum time limit is given for the condition to be met
					Must be greater than 0, units are seconds
				@param timeout_callback
					If specified, this is a callback which is called when the condition check
					has timed out
					The call format is:
						timeout_callback.call(null)
			*/
			asap: function (callback, condition, timeout, timeout_callback) {
				// Add to asap
				add_callback.call(null, callback, condition, timeout, timeout_callback, callbacks_asap);
			},
			/**
				Call a function as soon as possible when the DOM is fully loaded
				(document.readyState == "complete")

				@param callback
					The callback to be called
					The call format is:
						callback.call(null)
				@param condition
					An additional condition to test for.
					If this condition is falsy, a timeout interval is
					used to continuously test it until it is true (or timed out)
					The call format is:
						condition.call(null)
				@param timeout
					If specified, a maximum time limit is given for the condition to be met
					Must be greater than 0, units are seconds
				@param timeout_callback
					If specified, this is a callback which is called when the condition check
					has timed out
					The call format is:
						timeout_callback.call(null)
			*/
			ready: function (callback, condition, timeout, timeout_callback) {
				// Add to ready
				add_callback.call(null, callback, condition, timeout, timeout_callback, callbacks_ready);
			},

		};

	})();



	// Class to manage ajax interactions
	var Ajax = (function () {

		var Ajax = function (data) {
			// Create
			this.status = Ajax.UNSENT;
			this.status_code = 0;
			this.xhr = new XMLHttpRequest();

			// Open
			this.xhr.open(data.method || "GET", data.url, true);
			if (data.cred) this.xhr.withCredentials = true;


			// Return type
			if (data.return_type == "html") {
				this.xhr.responseType = "document";
			}
			else if (data.return_type == "json") {
				this.xhr.responseType = "json";
			}
			else {
				this.xhr.responseType = "text";
			}


			// Events
			if (data.on instanceof Object) {
				var on = data.on;

				// Normal response
				if (on.load) {
					this.xhr.addEventListener("load", ajax_on_load.bind(this, on.load), false);
				}
				// Error
				this.xhr.addEventListener("error", ajax_on_generic_status.bind(this, on.error || null, Ajax.ERRORED), false);
				// Abort
				this.xhr.addEventListener("abort", ajax_on_generic_status.bind(this, on.abort || null, Ajax.ABORTED), false);
				// Progress
				if (on.progress) {
					this.xhr.addEventListener("progress", ajax_on_progress.bind(this, on.progress), false);
				}
				// Start
				if (on.start) {
					this.xhr.addEventListener("loadstart", ajax_on_generic.bind(this, on.start), false);
				}
				// Failure
				if (on.failure) {
					this.xhr.addEventListener("loadend", ajax_on_generic_failure.bind(this, on.failure), false);
				}
				// Complete
				if (on.complete) {
					this.xhr.addEventListener("loadend", ajax_on_generic.bind(this, on.complete), false);
				}

				// Upload
				if (on.upload) {
					on = on.upload;

					// Load
					if (on.load) {
						this.xhr.upload.addEventListener("load", ajax_on_upload_load.bind(this, on.load), false);
					}
					// Error
					this.xhr.upload.addEventListener("error", ajax_on_generic_status.bind(this, on.error || null, Ajax.ERRORED), false);
					// Abort
					this.xhr.upload.addEventListener("abort", ajax_on_generic_status.bind(this, on.abort || null, Ajax.ABORTED), false);
					// Progress
					if (on.progress) {
						this.xhr.upload.addEventListener("progress", ajax_on_progress.bind(this, on.progress), false);
					}
					// Start
					if (on.start) {
						this.xhr.upload.addEventListener("loadstart", ajax_on_generic.bind(this, on.start), false);
					}
					// Failure
					if (on.failure) {
						this.xhr.upload.addEventListener("loadend", ajax_on_generic_failure.bind(this, on.failure), false);
					}
					// Complete
					if (on.complete) {
						this.xhr.upload.addEventListener("loadend", ajax_on_generic.bind(this, on.complete), false);
					}

				}
			}


			// Sending
			if ("send" in data) {
				// Don't send if false, and ignore data if true
				if (data.send !== false) {
					this.send(data.send === true ? null : data.send);
				}
			}
			else {
				// Send it
				this.send();
			}
		};



		Ajax.UNSENT = 0;
		Ajax.ACTIVE = 1;
		Ajax.ABORTED = 2;
		Ajax.ERRORED = 3;
		Ajax.DONE = 4;



		var ajax_on_load = function (on_load, event) {
			// Done
			this.status = Ajax.DONE;
			this.status_code = this.xhr.status;

			// Status code
			on_load.call(this, this.xhr.response, this.xhr.status, this.xhr.statusText);
		};
		var ajax_on_progress = function (on_progress, event) {
			// Callback
			on_progress.call(this, event.loaded, event.total);
		};
		var ajax_on_generic = function (on_generic, event) {
			// Callback
			on_generic.call(this);
		};
		var ajax_on_generic_status = function (on_generic, status, event) {
			// Callback
			this.status = status;
			if (on_generic) on_generic.call(this);
		};
		var ajax_on_generic_failure = function (on_generic, event) {
			// Callback
			if (this.status == Ajax.ABORTED || this.status == Ajax.ERRORED) on_generic.call(this);
		};
		var ajax_on_upload_load = function (on_success, event) {
			// Callback
			on_success.call(this);
		};



		Ajax.prototype = {
			constructor: Ajax,

			send: function (post_data) {
				// Send the request
				if (this.status == Ajax.UNSENT) {
					this.status = Ajax.ACTIVE;

					if (post_data != null) {
						this.xhr.send(post_data);
					}
					else {
						this.xhr.send();
					}
				}

				// Done
				return this;
			},
			abort: function () {
				// Abort
				this.xhr.abort();
			},
			get_response_header: function (header) {
				return this.xhr.getResponseHeader(header);
			},

		};



		return Ajax;

	})();

	// Generic API
	var GenericAPI = (function () {

		var GenericAPI = function () {
			this.waiting_counts = [];
			this.max_per_request = [];

			this.waiting = [];

			this.request_type = REQUEST_NONE;
			this.request_ajax = null;
			this.requesting = [];

			this.request_map = [];

			this.cache = [];

			this.request_data = [];
			this.retry_info = [];

			this.request_retry_count = 0;
			this.request_wait_timeout = 0.5;
			this.request_wait_timer = null;

			this.paused = false;

			this.on_run_request_timeout_bind = on_run_request_timeout.bind(this);
			this.on_request_load_bind = on_request_load.bind(this);
			this.on_request_failure_bind = on_request_failure.bind(this);
		};



		var REQUEST_NONE = -1;
		GenericAPI.RETRY = 1;
		GenericAPI.NEXT = 2;
		GenericAPI.STOP = 3;



		var run_request = function () {
			// Start request
			var ids = [],
				extras = [],
				r_data, type, max_count, i_max, i, request, url;

			// Setup requesting list
			if (this.requesting.length == 0) {
				// Move from waiting to requesting
				type = this.waiting[0].type;
				max_count = this.max_per_request[type];
				i_max = this.waiting.length;

				for (i = 0; i < i_max; ++i) {
					request = this.waiting[i];
					if (request.type == type) {
						// Add to requesting
						this.requesting.push(request);
						ids.push(request.id);
						extras.push(request.extra);
						request.waiting = false;

						// Remove from waiting
						this.waiting.splice(i, 1);

						// Continue or stop
						if (--max_count <= 0) break;
						--i;
						--i_max;
					}
				}

				// Count update
				this.waiting_counts[type] -= this.requesting.length;
				this.request_retry_count = 0;
			}
			else {
				// Request list is already setup
				type = this.requesting[0].type;
				++this.request_retry_count;

				// Create id list
				i_max = this.requesting.length;
				for (i = 0; i < i_max; ++i) {
					request = this.requesting[i];
					ids.push(request.id);
					extras.push(request.extra);
				}
			}

			// Convert
			r_data = this.request_data[type];
			url = r_data.url.replace(/\{(.+?)\}/g, modify_url.bind(this, {
				ID_LIST: ids.join(r_data.ssep),
				ID_COUNT: this.requesting.length,
				EXTRA: extras,
				SEP: r_data.ssep,
			}));

			// Start request
			this.request_type = type;
			this.request_ajax = new Ajax({
				url: url,
				method: r_data.method,
				return_type: r_data.type,
				on: {
					load: this.on_request_load_bind,
					failure: this.on_request_failure_bind,
				}
			});
		};
		var modify_url = function (data, group0, group1) {
			// Standard
			return data[group1];
		};

		var retry = function () {
			var type = this.requesting[0].type,
				r_info = this.retry_info[type],
				time;

			if (this.request_retry_count >= r_info.max || this.paused) {
				// Stop
				complete.call(this, false);
			}
			else {
				// Timeout
				time = Math.pow(r_info.exponent, this.request_retry_count) + r_info.addition * (this.request_retry_count + 1) + r_info.random * Math.random();
				this.request_wait_timer = setTimeout(this.on_run_request_timeout_bind, time * 1000);
			}
		};
		var complete = function (stop) {
			var time = 0.0,
				type, i, i_max, request, r_map, type;

			// Remove from request_map
			i_max = this.requesting.length;
			if (i_max > 0) {
				type = this.requesting[0].type;
				r_map = this.request_map[type];

				for (i = 0; i < i_max; ++i) {
					request = this.requesting[i];
					delete r_map[request.id];
				}

				// Timeout time for after
				time = this.request_data[type].after;

				// Clean
				this.requesting = [];
			}

			// Continue
			if (this.waiting.length > 0 && !stop) {
				if (this.request_wait_timer !== null) clearTimeout(this.request_wait_timer);

				if (time > 0) {
					// Delay
					this.request_wait_timer = setTimeout(this.on_run_request_timeout_bind, time * 1000);
				}
				else {
					// Run now
					this.request_wait_timer = null;
					run_request.call(this);
				}
			}
			else {
				// Clear
				this.request_type = REQUEST_NONE;
				this.request_ajax = null;
			}
		};

		var apply = function (results) {
			var type = this.requesting[0].type,
				i_max = this.requesting.length,
				cache = this.cache[type],
				id_changes = [],
				i, j, j_max, request, id, data;

			for (i = 0; i < i_max; ++i) {
				// Found or not
				request = this.requesting[i];
				id = request.id;
				if (id in results) {
					// Found
					cache[id] = results[id];
					delete results[id];
				}
				else {
					// Not found
					cache[id] = null;
				}
				id_changes.push(id);
			}

			// Extras
			for (id in results) {
				cache[id] = results[id];
				id_changes.push(id);
			}

			// Done
			return [[type, id_changes]];
		};
		var trigger_callbacks = function (changes) {
			var i, j, k, i_max, j_max, k_max, type, cache, id_list, r_map, id, request, callbacks;

			// Types
			i_max = changes.length;
			for (i = 0; i < i_max; ++i) {
				// Callbacks
				type = changes[i][0];
				id_list = changes[i][1];

				cache = this.cache[type];
				r_map = this.request_map[type];

				// Loop over ids
				j_max = id_list.length;
				for (j = 0; j < j_max; ++j) {
					id = id_list[j];
					if (id in r_map) {
						// Call callbacks
						request = r_map[id];
						callbacks = request.callbacks;

						k_max = callbacks.length;
						for (k = 0; k < k_max; ++k) {
							callbacks[k].call(this, cache[id]);
						}

						// Remove from waiting if necessary
						if (request.waiting) {
							k_max = this.waiting.length;
							for (k = 0; k < k_max; ++k) {
								if (this.waiting[k] === request) {
									// Removed
									this.waiting.splice(k, 1);
									delete r_map[id];
									break;
								}
							}
						}
					}
				}
			}
		};

		var on_run_request_timeout = function () {
			// Clear timer
			this.request_wait_timer = null;

			// Run request
			run_request.call(this);
		};
		var on_request_load = function (response, status, status_text) {
			if (status == 200) {
				// Parse, apply, then complete
				if (this.requesting.length > 0) {
					var type = this.requesting[0].type,
						r_data = this.request_data[type],
						results, changes;

					// Parse
					results = r_data.parser.call(this, response, this.requesting);

					// Apply
					changes = (r_data.apply ? r_data.apply : apply).call(this, results);

					// Trigger events
					trigger_callbacks.call(this, changes);
				}

				// Complete
				complete.call(this, false);
			}
			else {
				// Action selection
				var action = GenericAPI.RETRY;
				if (this.requesting.length > 0) {
					var r_data = this.request_data[this.requesting[0].type];

					if (r_data.on_fail) {
						action = r_data.on_fail.call(this, "status", status, status_text, this.request_retry_count, this.request_ajax);
					}
				}

				// Perform action
				if (action == GenericAPI.NEXT) {
					// Complete
					trigger_callbacks.call(this, apply.call(this, {}));
					complete.call(this, false);
				}
				else if (action == GenericAPI.STOP) {
					// Complete
					trigger_callbacks.call(this, apply.call(this, {}));
					complete.call(this, true);
					this.stop();
				}
				else { // if (action == GenericAPI.RETRY) {
					// Retry
					retry.call(this);
				}
			}
		};
		var on_request_failure = function () {
			// Action selection
			var action = GenericAPI.RETRY;
			if (this.requesting.length > 0) {
				var r_data = this.request_data[this.requesting[0].type];

				if (r_data.on_fail) {
					action = r_data.on_fail.call(this, "failure", 0, "", this.request_retry_count, this.request_ajax);
				}
			}

			// Perform action
			if (action == GenericAPI.NEXT) {
				// Complete
				trigger_callbacks.call(this, apply.call(this, {}));
				complete.call(this, false);
			}
			else if (action == GenericAPI.STOP) {
				// Complete and stop
				trigger_callbacks.call(this, apply.call(this, {}));
				complete.call(this, true);
				this.stop();
			}
			else { // if (action == GenericAPI.RETRY) {
				// Retry
				retry.call(this);
			}
		};



		GenericAPI.prototype = {
			constructor: GenericAPI,

			/**
				Adds a generic request type to be available for use.

				@param url
					The url which can have formatters applied to it.

					The available formatters are:
						{ID_LIST} : a list of ids, separated with simultaneous_separator
						{ID_COUNT} : the number of ids
				@param method
					The HTTP method to use (typically "GET")
				@param type
					The return type to get
					Available types are:
						"json"
				@param simultaneous_max
					The maximum number of simultaneous requests in a single Ajax call
				@param simultaneous_separator
					The separator string to separate ids
				@param timeout_after
					How long to wait (in seconds) after the request has been completed
				@param retry_max
					How many retries are allowed (0 = 1 attempt, no retrying)
				@param retry_addition
					The number of additional seconds added to the retry timer for each retry (in seconds)
				@param retry_exponent
					The exponential base of the retry timer (retry_exponent ^ retry_count) (in seconds)
				@param retry_random
					Random element to add to the retry timer (in seconds)
				@param parser
					The parsing function to use on the resulting data
					The function is called as:
						parser.call(this, ajax_result, request_list)
					The function should return an object in the following form:
						{
							<content_id>: {
								// any data
							},
							...
						}
						where <content_id> are the ids located in request_list[i].id
				@param apply
					An optional function which can be used to apply the data to the caches in a non-standard way
					The function is called as:
						apply.call(this, results)
					The function should return a list of changes in the following format:
						[
							[REQUEST_TYPE, [id_list]],
							...
						]
				@param on_fail
					An optional function which can be used to determine what to do upon a failure case
					The function is called as:
						on_fail.call(this, reason, status_code, status_text, retry_count, ajax_object)
					It should return one of:
						GenericAPI.RETRY : continue with the specified retry policy
						GenericAPI.NEXT : complete the request group (with nulls) and go to next
						GenericAPI.STOP : completely stop the request queue
				@return
					The id of the request type
			*/
			add_request_type: function (url, method, type, simultaneous_max, simultaneous_separator, timeout_after, retry_max, retry_addition, retry_exponent, retry_random, parser, apply, on_fail) {
				var id = this.waiting_counts.length;

				// Push data
				this.waiting_counts.push(0);
				this.max_per_request.push(simultaneous_max);

				this.request_map.push({});

				this.cache.push({});

				this.request_data.push({
					url: url,
					method: method,
					type: type,
					ssep: simultaneous_separator,
					parser: parser,
					apply: apply || null,
					on_fail: on_fail || null,
					after: timeout_after,
				});

				this.retry_info.push({
					max: retry_max,
					addition: retry_addition,
					exponent: retry_exponent,
					random: retry_random,
				});

				// Done
				return id;
			},

			/**
				Get a generic request result.

				@param type
					The type id returned from a add_request_type(...) call
				@param id
					The identifier of the resource
				@param callback
					The callback to return the data to
					The format is:
						callback.call(this, data);
			*/
			get_generic: function (type, id, callback) {
				if (id in this.cache[type]) {
					// Content is cached
					callback.call(this, this.cache[type][id]);
				}
				else if (id in this.request_map[type]) {
					// Add callback to existing request
					this.request_map[type][id].callbacks.push(callback);
				}
				else {
					// New request
					var request = {
						type: type,
						id: id,
						callbacks: [ callback ],
						waiting: true
					};
					this.waiting.push(request);
					this.request_map[type][id] = request;
					++this.waiting_counts[type];

					// Test execute
					if (this.request_type == REQUEST_NONE && !this.paused) {
						if (this.waiting_counts[type] >= this.max_per_request[type]) {
							// Execute now (limit reached)
							if (this.request_wait_timer !== null) {
								clearTimeout(this.request_wait_timer);
								this.request_wait_timer = null;
							}
							run_request.call(this);
						}
						else {
							// Delay timer
							if (this.request_wait_timer !== null) {
								clearTimeout(this.request_wait_timer);
							}
							this.request_wait_timer = setTimeout(this.on_run_request_timeout_bind, this.request_wait_timeout * 1000);
						}
					}
				}
			},

			/**
				Stops the execution of the request queue until resume()'d.
			*/
			stop: function () {
				// Pause
				this.paused = true;

				// Clear timer
				if (this.request_wait_timer !== null) {
					clearTimeout(this.request_wait_timer);
					this.request_wait_timer = null;
				}
			},

			/**
				Resumes the execution of the request queue.
			*/
			resume: function () {
				if (!this.paused) return;

				// Unpause
				this.paused = false;

				// Execute
				if (this.waiting.length > 0) {
					// Clear timer
					if (this.request_wait_timer !== null) {
						clearTimeout(this.request_wait_timer);
						this.request_wait_timer = null;
					}

					// Run now
					run_request.call(this);
				}
			},

		};



		return GenericAPI;

	})();

	// Youtube API
	var YoutubeAPI = (function () {

		var YoutubeAPI = function (custom_api_key) {
			this.api_key = custom_api_key;

			this.g_api = new GenericAPI();

			var on_fail_bind = on_fail.bind(this);

			this.REQUEST_VIDEO = this.g_api.add_request_type(
				"https://www.googleapis.com/youtube/v3/videos?key=" + this.api_key + "&part=snippet,contentDetails,status,statistics&maxResults={ID_COUNT}&id={ID_LIST}",
				"GET", "json",
				50, ",",
				0.25,
				0, 0, 2, 1.0,
				parse_video_data.bind(this), null, on_fail_bind
			);
		};



		var parse_url_for_timecode = function (search, hash) {
			var re = /(?:^|\&)t=(?:([0-9\.]+)h)?(?:([0-9\.]+)m)?([0-9\.]+)s?(?:&|$)/i,
				match, t;

			if ((match = re.exec(hash)) || (match = re.exec(search))) {
				// Add time
				t = 0;
				if (match[1]) t += parseFloat(match[1]) * 60 * 60;
				if (match[2]) t += parseFloat(match[2]) * 60;
				t += parseFloat(match[3]);
				return t;
			}

			// Not found
			return null;
		};

		var parse_timestamp = function (time_str) {
			var match = /([0-9]+)-([0-9]+)-([0-9]+)T([0-9]+):([0-9]+):([0-9]+)\.([0-9]+)Z/i.exec(time_str);
			if (!match) return 0;

			return (new Date(
				parseInt(match[1], 10), // year
				parseInt(match[2], 10) - 1, // month
				parseInt(match[3], 10), // day
				parseInt(match[4], 10), // hours
				parseInt(match[5], 10), // minutes
				parseInt(match[6], 10), // seconds
				parseInt(match[7], 10) // milliseconds
			)).getTime();
		};
		var parse_duration = function (time_str) {
			var match = /PT(?:([0-9]+)M)(?:([0-9]+)S)/i.exec(time_str);
			if (!match) return 0;

			var t = 0;
			if (match[1]) t += (parseInt(match[1], 10) || 0) * 60;
			if (match[2]) t += (parseInt(match[2], 10) || 0);
			return t;
		};

		var parse_video_data = function (json, request_list) {
			var results = {},
				empty = {},
				items = json.items,
				i, i_max, j, id, obj, item, thumb,
				snippet, content_details, status, statistics;

			if (items) {
				i_max = items.length;
				for (i = 0; i < i_max; ++i) {
					// Item vars
					item = items[i];
					id = item.id || "";
					snippet = item.snippet || empty;
					content_details = item.contentDetails || empty;
					status = item.status || empty;
					statistics = item.statistics || empty;

					// Create object
					obj = {
						id: id,
						title: snippet.title || "",
						description: snippet.description || "",
						category: parseInt(snippet.categoryId, 10) || 0,
						timestamp: parse_timestamp.call(this, snippet.publishedAt || ""),
						thumbnails: {},
						channel: {
							id: snippet.channelId || "",
							title: snippet.channelTitle || "",
						},
						video: {
							duration: parse_duration.call(this, content_details.duration || ""),
							dimension: content_details.dimension || "", // 2d / 3d
							definition: content_details.definition || "", // hd / sd
							captions: content_details.caption == "true",
						},
						info: {
							upload_status: status.uploadStatus || "", // uploaded / processed
							privacy: status.privacyStatus || "", // public / unlisted
							license: status.license || "", // youtube / creativeCommon
							licensed: content_details.licensedContent || false,
							embeddable: status.embeddable || false,
							live_content: snippet.liveBroadcastContent,
						},
						stats: {
							visible: status.publicStatsViewable || false,
							views: parseInt(statistics.viewCount || 0, 10) || 0,
							likes: parseInt(statistics.likeCount || 0, 10) || 0,
							dislikes: parseInt(statistics.dislikeCount || 0, 10) || 0,
							favorites: parseInt(statistics.favoriteCount || 0, 10) || 0,
							comments: parseInt(statistics.commentCount || 0, 10) || 0,
						},
					};

					// Add thumbnails
					for (thumb in snippet.thumbnails) {
						obj.thumbnails[thumb] = snippet.thumbnails[thumb].url;
					}
					// Add custom thumbnails
					for (j = 1; j <= 3; ++j) {
						obj.thumbnails[j] = "https://i1.ytimg.com/vi/" + id + "/" + j + ".jpg";
					}

					// Apply
					results[id] = obj;
				}
			}

			return results;
		};

		var on_fail = function (reason, status_code, status_text, retry_count, ajax_object) {
			if (reason == "status") {
				return GenericAPI.NEXT;
			}
			else { // if (reason == "failure") {
				return GenericAPI.RETRY;
			}
		};



		YoutubeAPI.prototype = {
			constructor: YoutubeAPI,

			get_video: function (video_id, callback) {
				// Generic get
				this.g_api.get_generic(this.REQUEST_VIDEO, video_id, callback);
			},

			get_url_info: function (url) {
				var match;

				if ((match = /^(?:https?\:)?(?:\/*)(?:[^\/]+\.)?youtube\.com\/(watch|playlist)(?:\?([^\#]*))?(?:\#(.*))?/i.exec(url))) {
					var page = match[1],
						search = match[2] || "",
						hash = match[3] || "",
						video_id,
						playlist_id;

					if (page == "watch") {
						// Video page
						if ((match = /(?:^|\&)v=([a-zA-Z0-9_-]{11})(?:&|$)/.exec(search))) {
							// Video id
							video_id = match[1];

							// Playlist
							if ((match = /(?:^|\&)list=([a-zA-Z0-9_-]{34})(?:&|$)/.exec(search))) {
								playlist_id = match[1];
							}
							else {
								playlist_id = null;
							}

							// Done
							return {
								type: "video",
								id: video_id,
								playlist: playlist_id,
								timecode: parse_url_for_timecode.call(this, search, hash),
							};
						}
					}
					else { // if (page == "playlist") {
						// Playlist page
						if ((match = /(?:^|\&)list=([a-zA-Z0-9_-]{34})(?:&|$)/.exec(search))) {
							playlist_id = match[1];

							return {
								type: "playlist",
								playlist: playlist_id,
							};
						}
					}
				}
				else if ((match = /^(?:https?\:)?(?:\/*)(?:[^\/]+\.)?(?:youtu|y2u)\.be\/([a-zA-Z0-9_-]{11})(?:\?([^\#]*))?(?:\#(.*))?/i.exec(url))) {
					var video_id = match[1],
						search = match[2] || "",
						hash = match[3] || "",
						playlist_id;

					// Playlist
					if ((match = /(?:^|\&)list=([a-zA-Z0-9_-]{34})(?:&|$)/.exec(search))) {
						playlist_id = match[1];
					}
					else {
						playlist_id = null;
					}

					// Done
					return {
						type: "video",
						id: video_id,
						playlist: playlist_id,
						timecode: parse_url_for_timecode.call(this, search, hash),
					};
				}
				else if ((match = /^(?:https?\:)?(?:\/*)(?:[^\/]+\.)?youtube\.com\/(?:channel\/([^\/\?\#]+)|user\/([^\/\?\#]+))/i.exec(url))) {
					if (match[1]) {
						return {
							type: "channel",
							channel: match[1],
						};
					}
					else { // if (match[2]) {
						return {
							type: "user",
							user: match[2],
						};
					}
				}

				return null;
			},

		};



		return YoutubeAPI;

	})();



	// Functions
	var check_count = 0;
	var hit_count = 0;
	var wait_count = 0;
	var matched_ids = {};
	var active = true;
	var add_result = function (data) {
		// Already matched
		if (data.id in matched_ids) return;
		matched_ids[data.id] = true;

		// Show
		var result, n1, n2, n3, n4, par;

		result = document.createElement("div");
		result.className = "result" + (data.info.privacy == "public" ? " public" : " unlisted");


		n1 = document.createElement("div");
		n1.className = "result_cell";
		n1.style.width = "0";
		result.appendChild(n1);

		n2 = document.createElement("div");
		n2.className = "result_image";
		n2.style.backgroundImage = 'url("' + data.thumbnails.maxres + '")';
		n1.appendChild(n2);


		n1 = document.createElement("div");
		n1.className = "result_cell";
		result.appendChild(n1);

		n2 = document.createElement("div");
		n2.className = "result_line";
		n1.appendChild(n2);

		n3 = document.createElement("a");
		n3.className = "result_link";
		n3.textContent = data.id + " - " + data.title;
		n3.setAttribute("href", "https://youtu.be/" + data.id);
		n2.appendChild(n3);

		n2 = document.createElement("div");
		n2.className = "result_line";
		n1.appendChild(n2);

		n3 = document.createElement("span");
		n3.textContent = (data.stats.visible ? data.stats.likes + " likes, " + data.stats.dislikes + " dislikes, " : "") + data.stats.comments + " comments" + (data.info.privacy == "public" ? "" : ", unlisted");
		n2.appendChild(n3);

		n2 = document.createElement("div");
		n2.className = "result_line";
		n1.appendChild(n2);

		n3 = document.createElement("span");
		n3.appendChild(document.createTextNode("Uploaded by "));
		n2.appendChild(n3);

		n4 = document.createElement("a");
		n4.className = "result_link";
		n4.textContent = data.channel.title;
		n4.setAttribute("href", "https://youtube.com/channel/" + data.channel.id);
		n3.appendChild(n4);


		par = document.getElementById("results_list");
		if (par) par.appendChild(result);
	};
	var update_counts = function (count_increase, hit_increase) {
		check_count += count_increase;
		hit_count += hit_increase;

		var n;
		if ((n = document.getElementById("count"))) {
			n.textContent = check_count;
		}
		if ((n = document.getElementById("hits"))) {
			n.textContent = hit_count + " hit" + (hit_count == 1 ? "" : "s");
		}
	};
	var random_id = function () {
		var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-",
			char_count = 11,
			id = "",
			i;

		for (i = 0; i < char_count; ++i) {
			id += chars[Math.floor(Math.random() * chars.length)];
		}

		return id;
	};

	var begin_request = function () {
		if (!active) return;

		var max_count = 50,
			i;

		for (i = 0; i < max_count; ++i) {
			youtube_api.get_video(random_id(), on_data_get);
		}

		wait_count = max_count;
	};

	var on_api_key_change = function (event) {
		var n;
		if ((n = document.getElementById("api_key_default"))) {
			n.checked = (this.value.length != 39);
		}
	};
	var on_api_key_use_default_click = function (event) {
		event.preventDefault();
		return false;
	};
	var on_begin_click = function (event) {
		// Change visibility
		var n, api_key;
		if ((n = document.querySelector(".setup"))) {
			n.className = "setup";
		}
		if ((n = document.querySelector(".results"))) {
			n.className = "results results_visible";
		}

		// Setup API
		api_key = "AIzaSyDkMtsBFv3iHwnCKG-pvI7k_txFuTcEoso";
		if ((n = document.getElementById("api_key")) && n.value.length == 39) {
			api_key = n.value;
		}
		youtube_api = new YoutubeAPI(api_key);

		// Begin
		begin_request();
	};
	var on_status_click = function (event) {
		active = !active;
		if (active) {
			this.textContent = "active";
			if (wait_count <= 0) begin_request();
		}
		else {
			this.textContent = "paused";
		}
	};

	var on_data_get = function (data) {
		if (data === null) {
			update_counts(1, 0);
		}
		else {
			update_counts(1, 1);
			add_result(data);
		}

		if (--wait_count <= 0) {
			begin_request();
		}
	};



	// Execute once page type is detected
	ASAP.asap(function (event) {
		// Setup nodes
		var n;
		if ((n = document.getElementById("begin"))) {
			n.addEventListener("click", on_begin_click, false);
		}
		if ((n = document.getElementById("api_key"))) {
			n.addEventListener("change", on_api_key_change, false);
			if (n.value.length == 39 && (n = document.getElementById("api_key_default"))) {
				n.checked = false;
			}
		}
		if ((n = document.getElementById("api_key_default"))) {
			n.addEventListener("click", on_api_key_use_default_click, false);
		}
		if ((n = document.getElementById("status"))) {
			n.addEventListener("click", on_status_click, false);
		}
	});

})();


