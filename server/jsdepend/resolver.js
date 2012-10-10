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

/*global resolve require define console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

//////////////////////////////////////
// resolver
//
//   Responsible for resolving reference found by the reference finder to determine
//   an actual module corresponding to a reference.
///////////////////////////////////////

function configure(conf) {

	var sloppy = conf.sloppy;
	if (typeof(sloppy)==='undefined') {
		console.trace('WARNING: sloppy mode is undefined. Assuming it will be disabled');
	}

	//in 'sloppy' mode we use a searchByName resolver as a last resort 
	//if the more precise strategies have failed.

	var fileIndexer = require('./file-indexer').configure(conf);
	var utils = require('./utils');

	var isFile = conf.isFile;
	var endsWith = utils.endsWith;
	var getFileName = utils.getFileName;
	
	function isResolved(dep, k) {
		if (dep.exists) {
			k(true);
		} else if (dep.path) {
			isFile(dep.path, k);
		} else {
			k(false);
		}
	}
	
	function unresolve(dep) {
		//it would be strange if we left the error from previous resolve in there
		//when we resolve it an subsequent resolver in a chain.
		if (dep.hasOwnProperty('error')) {
			delete dep.error;
		}
		if (dep.hasOwnProperty('path')) {
			delete dep.path;
		}
	}
	
	//compose two resolvers into one. The second resolver is used if the first one fails
	//to resolve a dependency to an existing file.
	function compose(r1, r2) {
		function resolve(context, dep, callback) {
			r1(context, dep, function (dep) {
				isResolved(dep, function (resolved) {
					if (resolved) {
						callback(dep);
					} else {
						unresolve(dep);
						r2(context, dep, callback);
					}
				});
			});
		}
		return resolve;
	}

	//Determine a score for a given 'name is matching' candidate. The candidates passed in here already have
	//the last path segment matched with the last path segment of the dependency name.
	function matchScore(nameSegments, candidatePath) {
		//Count number of matching segments, starting segment[end-1]
		//Stop as soon as a non-matching segment is found.
		var score = 0;
		var candidateSegments = candidatePath.split('/');
		var matching = true;
		var i = 1; // start at 'end - 1' (which is length-2)
		while (i<candidateSegments.length && matching) {
			matching = candidateSegments[candidateSegments.length-i-1]===nameSegments[nameSegments.length-i-1];
			if (matching) {
				score++;
			}
			i++;
		}
		return score;
	}

	//When the find by name resolver has more than one candidate that matches the file name,
	//this tries to use additional path segments to determine which one is
	//a 'better' match.
	function bestGuess(dep, candidates) {
		var best = null;
		var bestScore = -1;
		var segments = dep.name.split('/');
		for (var i=0; i<candidates.length; i++) {
			var score = matchScore(segments, candidates[i]);
			if (score>bestScore) {
				bestScore = score;
				best = candidates[i];
			}
		}
		return best;
	}

	//General purpose resolver. This one is used in case we have no other way to resolve a dependency,
	// or if the other way was tried but resolved to a non-existent file.
	function searchByNameResolver(context, dep, callback) {
		fileIndexer.getIndexer(context, function (indexer) {
			var name = getFileName(dep.name);
			if (!endsWith(name, '.js')) {
				name = name + '.js';
			}
			indexer.findFilesWithName(name, function (candidates) {
				if (candidates.length>0) {
					dep.path = candidates[0];
					if (candidates.length>1) {
						dep.path = bestGuess(dep, candidates);
						//console.log('Multiple candidates for resolving '+ dep.name);
						//console.log(candidates);
						//console.log('Ignoring all but '+candidates[0]);
						dep.candidates = candidates; //informational when there's more than one.
					}
				}
				callback(dep);
			});
		});
	}
	
	//A 'resolver transformer' which ensures that any resolved dependency
	//actually points to an existing file. If it does not, then the path is removed.
	//Client code relies on this. So make sure to apply this transformer to
	//any resolvers that don't already guarantee the path exists.
	function removePathFromUnresolved(resolver) {
		return function (context, dep, callback) {
			resolver(context, dep, function (dep) {
				isResolved(dep, function (isResolved) {
					if (!isResolved) {
						if (dep.hasOwnProperty('path')) {
							delete dep.path;
						}
					}
					callback(dep);
				});
			});
		};
	}
	
	function listResolver(context, list, callback) {
		if (list.length===0) {
			//For empty list there won't be any receiveFor functions created
			//(and called) which means we would drop our callback. To avoid this we must
			//handle it specially
			callback([]);
		} else { //list is not empty
			//This is tricky becasue the results are received asynchronously, yet we
			//can't return the array of results until all results have been received.
		
			var results = [];
			var waiting = list.length;
			
			var receiveFor = function(i) {
				return function(resolved) {
					waiting--;
					results[i] = resolved;
					if (waiting===0) {
						callback(results);
					}
				};
			};

			for (var i = 0; i < list.length; i++) {
				resolve(context, list[i], receiveFor(i));
			}
		}
	}
	
	var resolvers = {
		'list': listResolver,
		'AMD': require('./amd-resolver').configure(conf).resolver,
		'commonjs': require('./commonjs-resolver').configure(conf).resolver
	};
	if (sloppy) {
		resolvers.AMD = compose(resolvers.AMD, searchByNameResolver);
		resolvers.commonjs = compose(resolvers.commonjs, searchByNameResolver);
		resolvers.unknown = searchByNameResolver; 
	} else {
		resolvers.AMD = removePathFromUnresolved(resolvers.AMD);
		resolvers.commonjs = removePathFromUnresolved(resolvers.commonjs);
	}

	function getKind(dep) {
		if (dep.kind) {
			return dep.kind;
		} else if (typeof(dep)==='string') {
			return 'string';
		} else {
			return 'list';
		}
	}

	//resolve :: Handle -> UnresolvedDependency -> ResolvedDependency
	//Curried function that first takes a handle identifying context.
	//then takes a dep and callback. Resolves dependency in given context
	//and passes resolved dependency to callback.
	function resolve(context, dep, callback) {
		var theResolver = resolvers[getKind(dep)];
		if (!theResolver) {
			throw "don't know how to resolve dependency of type '"+dep.kind+"'";
		} else {
			return theResolver(context, dep, callback);
		}
	}
	
	return {
		resolve: resolve,
		forTesting: {
			matchScore: matchScore
		}
	};

}

exports.configure = configure;
///////////////////////////////////////////////////////////////////
});
