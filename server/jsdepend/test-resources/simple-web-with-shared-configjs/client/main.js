/*global define exports window console document*/
define(['foo', 'utils'], function (foo, utils) {
	console.log('Loading main'); 
	utils.println("This is 'main' using println from utils");
});