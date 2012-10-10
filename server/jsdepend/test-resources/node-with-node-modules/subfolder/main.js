/*global require*/
//Each of the below node_modules use a slighyly different layout/lookup convention.

//This is a copy of the main.js same as in my parent folder. Given the way node looks
//for modules also in parent directories it should still be able to find these modules.
require('foo').fooFun();
require('bar').barFun();
require('zor').zorFun();
require('booger').boogy();