/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *   Kris De Volder
 ******************************************************************************/

function QueueMap(limit) {
	this._size = 0;
	this._contents = {};
}
QueueMap.prototype.put = function (key, value) {
	var isNew = !this._contents.hasOwnProperty(key);
	if (isNew) {
		this.size++;
	} else {
		delete this._contents[key];
	}
	this._contents[key]=value;
};
QueueMap.prototype.toString = function () {
	return JSON.stringify(this._contents, null, '  ');
};

var qm = new QueueMap();
qm.put('a', 'Hello');
qm.put('b', 'World');

console.log(""+qm);

qm.put('a', 'Goobye');

console.log(""+qm);
