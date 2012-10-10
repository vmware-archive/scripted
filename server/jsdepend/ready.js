/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/
/*global console exports*/

//This module exports a 'Ready' constructor / type

//An instance of 'Ready' is an object that has a single 'ready' state which is either
//true or false. It starts out false and can be switched to true by calling the 'ready()' method.

//Clients can register listener functions to call as soon as the object is ready.

function Ready() {
	this.isReady = false;
	this.onReady = [];
}

//Call the onReady function as soon as this object is 'ready'.
Ready.prototype.then = function (onReady) {
	if (this.isReady) {
		onReady();
	} else {
		this.onReady.push(onReady);
	}
};

//Switches this object state to 'ready'. 
//If the object was already ready, nothing happens.
//If the object became ready and has registered listeners.
//then the listeners are called.
Ready.prototype.ready = function () {
	if (!this.isReady) {
		this.isReady = true;
		var listeners = this.onReady;
		this.onReady = [];
		for (var i = 0; i < listeners.length; i++) {
			try {
				listeners[i]();
			} catch (e) {
				console.error(e);
			}
		}
	}
};

//Switch object state back to 'not ready'.
Ready.prototype.unready = function () {
	this.isReady = false;
};

exports.Ready = Ready;