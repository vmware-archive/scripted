/*global define window console document*/
define(["main"], function () {
    function subdepFun(x) {
        return "subdepFun of "+x;
    }
    return {
        subdepFun: subdepFun
    };
});
