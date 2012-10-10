/*global define window console document*/
define(['sub/subdep'], function (subdep) {
    var f = subdep.subdepFun;
    
    function submainFun(x) {
        return f("submainFun of "+x);
    }

    return {
        submainFun: submainFun
    };

});
