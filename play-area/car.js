/*global define console */
define(function() {
    function Car(model) {
        this.model = model;
    }
    Car.prototype = {
        show: function() {
            console.log(this.model);
		}
    };
    return Car;
});