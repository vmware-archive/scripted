/*global define window console document*/
define([], function () {
    function subdepFun(x) {
        return "subdepFun of "+x;
    }
    return {
        subdepFun: subdepFun
    };
});
