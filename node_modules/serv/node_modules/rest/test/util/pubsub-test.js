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

(function (buster, define) {
	'use strict';

	var assert, refute;

	assert = buster.assert;
	refute = buster.refute;

	define('rest/util/pubsub-test', function (require) {

		var pubsub = require('rest/util/pubsub');

		buster.testCase('rest/util/pubsub', {
			'should pass arguments to subscribed listener': function () {
				var callback = this.spy(function (value) {
					assert.equals('result', value);
				});
				pubsub.subscribe('topic', callback);
				pubsub.publish('topic', 'result');
				assert.called(callback);
			},
			'should ignore publish with no listeners': function () {
				pubsub.publish('topic', 'result');
				assert(true);
			},
			'should unsubscribe listener after publish': function () {
				var callback = this.spy(function (value) {
					assert.equals('result', value);
				});
				pubsub.subscribe('topic', callback);
				pubsub.publish('topic', 'result');
				pubsub.publish('topic', 'result2');
				assert.calledOnce(callback);
			},
			'should only call most recent listener': function () {
				var callback1, callback2;
				callback1 = this.spy();
				callback2 = this.spy(function (value) {
					assert.equals('result', value);
				});
				pubsub.subscribe('topic', callback1);
				pubsub.subscribe('topic', callback2);
				pubsub.publish('topic', 'result');
				assert.calledOnce(callback2);
				refute.called(callback1);
			}
		});

	});

}(
	this.buster || require('buster'),
	typeof define === 'function' && define.amd ? define : function (id, factory) {
		var packageName = id.split(/[\/\-]/)[0], pathToRoot = id.replace(/[^\/]+/g, '..');
		pathToRoot = pathToRoot.length > 2 ? pathToRoot.substr(3) : pathToRoot;
		factory(function (moduleId) {
			return require(moduleId.indexOf(packageName) === 0 ? pathToRoot + moduleId.substr(packageName.length) : moduleId);
		});
	}
	// Boilerplate for AMD and Node
));
