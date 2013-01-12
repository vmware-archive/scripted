/*
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

(function (define) {
	'use strict';

	define(function (/* require */) {

		// A poor man's pub-sub.  A single listener is supported per topic.  When
		// the topic is published, the listener is unsubscribed.

		var topics = {};

		/**
		 * Publishes the message to the topic, invoking the listener.
		 *
		 * The listener is unsubscribed from the topic after receiving a message.
		 *
		 * @param {string} topic the topic to publish to
		 * @param {Object} message message to publish
		 */
		function publish(topic /* , message... */) {
			if (!topics[topic]) { return; }
			topics[topic].apply({}, Array.prototype.slice.call(arguments, 1));
			// auto cleanup
			delete topics[topic];
		}

		/**
		 * Register a callback function to receive notification of a message published to the topic.
		 *
		 * Any existing callback for the topic will be unsubscribed.
		 *
		 * @param {string} topic the topic to listen on
		 * @param {Function} callback the callback to receive the message published to the topic
		 */
		function subscribe(topic, callback) {
			topics[topic] = callback;
		}

		return {
			publish: publish,
			subscribe: subscribe
		};

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));
