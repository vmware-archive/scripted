Rest.js
=======

Just enough client, as you need it.  Make HTTP requests from a browser or Node.js applying the only the client features you need.  Configure a client once, and share it safely throughout your application.  Easily extend with interceptors that wrap the request and/or response, or MIME type converters for rich data formats.


Build Status
------------

<table>
  <tr><td>Master</td><td><a href="http://travis-ci.org/s2js/rest" target="_blank"><img src="https://secure.travis-ci.org/s2js/rest.png?branch=master" /></a></tr>
  <tr><td>Development</td><td><a href="http://travis-ci.org/s2js/rest" target="_blank"><img src="https://secure.travis-ci.org/s2js/rest.png?branch=dev" /></a></tr>
</table>


Getting Started
---------------

Rest can be installed via [npm](https://npmjs.org/), [Bower](http://twitter.github.com/bower/), or from source.

To install without source:

    $ npm install rest

or

    $ bower install rest

From source:

    $ npm install

Rest.js is designed to run in a browser environment, utilizing [AMD modules](https://github.com/amdjs/amdjs-api/wiki/AMD), or within [Node.js](http://nodejs.org/).  [curl](https://github.com/cujojs/curl) is highly recommended as an AMD loader, although any loader should work.

An ECMAScript 5 compatible environment is assumed.  Older browsers, ::cough:: IE, that do not support ES5 natively can be shimmed.  Any shim should work, although we've tested against cujo's [poly](https://github.com/cujojs/poly)


Usage
-----

Using Rest.js is easy.  The core clients provide limited functionality around the request and response lifecycle.  The input and response objects are normalized to support portability between browser and server environments.

The response from a client is a promise that is resolved when the remote request finishes.

The core client behavior can be augmented with interceptors.  An interceptor wraps the client and transforms the request and response.  For example: an interceptor may authenticate a request, or reject the promise if an error is encountered.  Interceptors may be combined to create a client with the desired behavior.  A configured interceptor acts just like a client.


### Making a basic request: ###

```javascript
define(['rest'], function(client) {
    client({ path: '/' }).then(function(response) {
        console.log('response: ', response);
    });
});
```

In this example, you can see that the request object is very simple, it just includes the path.  All of the attributes of a request are optional.

The response should look familiar as well, it contains all the fields you would expect, including the response headers (many clients ignore the headers).


### Working with JSON: ###

If you're paying attention, you may have noticed that the response.entity in the previous example is a String.  Often we need to work with more complex data types.  For this, Rest supports a rich set of MIME type conversions with the `mime` interceptor.  The correct converter will automatically be chosen based on the Content-Type response header.  Custom converts can be registered for a MIME type, more on that later...

```javascript
define(['rest/interceptor/mime'], function(mime) {
    var client = mime();
    client({ path: '/data.json' }).then(function(response) {
        console.log('response: ', response);
    });
});
```

Before an interceptor can be used, it needs to be configured.  In this case, we will accept the default configuration, and obtain a client.  Now when we see the response, the entity will be a JS object instead of a String.


### Composing Interceptors: ###

```javascript
define(['rest/interceptor/mime', 'rest/interceptor/errorCode'], function(mime, errorCode) {
    var client = mime();
    client = errorCode(client, { code: 500 });
    client({ path: '/data.json' }).then(
        function(response) {
            console.log('response: ', response);
        },
        function(response) {
            console.error('response error: ', response);
        }
    );
});
```

In this example, we take the client create by the `mime` interceptor, and wrap it in the `errorCode` interceptor.  The errorCode interceptor can accept a configuration object that indicates what status codes should be considered an error.  In this case we override the default value of <=400, to only reject with 500 or greater status code.

Since the errorCode interceptor can reject the response promise, we also add a second handler function to receive the response for requests in error.

Clients can continue to be composed with interceptors as needed.  At any point the client as configured can be shared.  It is safe to share clients and allow other parts of your application to continue to compose other clients around the shared core.  Your client is protected from additional interceptors that other parts of the application may add.


### Custom MIME Converters: ###

```javascript
define(['rest/mime/registry'], function(registry) {
   registry.register('application/vnd.com.example', {
       read: function(str) {
           var obj;
           // do string to object conversions
           return obj;
       },
       write: function(obj) {
           var str;
           // do object to string conversions
           return str;
       }
   });
});
```

Registering a custom converter is a simple as calling the register function on the mime registry with the type and converter.  A converter has just two methods: `read` and `write`.  Read converts a String to a more complex Object.  Write converts an Object back into a String to be sent to the server.  HTTP is fundamentally a text based protocol after all.

Built in converters are available under `rest/mime/type/{type}`, as an example, JSON support is located at `rest/mime/type/application/json`.  You never need to know this as a consumer, but it's a good place to find examples.


Reporting Issues
----------------

Please report issues on [GitHub](https://github.com/s2js/rest/issues).  Include a brief description of the error, information about the runtime (including shims) and any error messages.

Feature requests are also welcome.


Running the Tests
-----------------

The test suite can be run in two different modes: in node, or in a browser.  We use [npm](https://npmjs.org/) and [Buster.JS](http://busterjs.org/) as the test driver, buster is installed automatically with other dependencies.

Before running the test suite for the first time:

    $ npm install

To run the suite in node:

    $ npm test

To run the suite in a browser:

    $ npm start
    browse to http://localhost:8282/ in the browser(s) you wish to test.  It can take a few seconds to start.


Contributors
------------

- Scott Andrews <andrewss@vmware.com>
- Jeremy Grelle <jgrelle@vmware.com>

Please see CONTRIBUTING.md for details on how to contribute to this project.


Copyright
---------

Integration is made available under the MIT license.  See LICENSE.txt for details.

Copyright (c) 2012-2013 VMware, Inc. All Rights Reserved.

VMware, Inc.
3401 Hillview Avenue
Palo Alto, CA 94304


Change Log
----------

0.8.4
- Bower installable, with dependencies
- node client's response.raw includes ClientResquest and ClientResponse objects
- basicAuth interceptor correctly indicates auth method

0.8.3
- moving from the 'scothis' to the 's2js' organization, no functional changes

0.8.2
- requests may be canceled
- timeout incerceptor that cancels the request unless it finishes before the timeout
- retry interceptor handles error respones by retrying the request after an elapsed period
- error interceptor handlers may recover from errors, a rejected promise must be returned in order to preserve the error state
- response objects, with an error property, are used for client errors instead of the thrown value
- interceptor response handlers recieve the interceptor's client rather then the next client in the chain
- interceptor request handlers may provide a response
- convert modules to UMD format; no functional impact
- replaced rest/util/base64 with an MIT licenced impl; no functional impact

0.8.1
- fixed bug where http method may be overwritten

0.8.0
- npm name change 'rest-template' -> 'rest'
- introduced experimental HATEOAS support
- introduced 'location' interceptor which follows Location response headers, issuing a GET for the specified URL
- default method to POST when request contains an entity
- response handlers now have access to the request client to issue subsequent requests
- interceptors may specify their default client
- renamed `rest/interceptor/_base` to `rest/interceptor`

0.7.5
- Initial release, everything is new
