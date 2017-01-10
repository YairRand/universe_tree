var maxResults = 100,
    allTypes = [ 
        "Q15642541",  // administrative division
        "Q5107"     // continent
        //"Q5"         // human
     ];

// The "queries" object is a list of all SPARQL queries used in this script.
// List of properties:
// * P361 (part of), P527 (has part): Primary "part-ness" indicators.
// * P31 (instance of), P279 (subclass of): Part-ness is assumed to be 
//   inherited, so if X>P31/P279*>Y>P361>Z, X is part of Z. Similarly, if
//   X>P279>Y>P527>Z, X has part (instance of) Z. (Only used when no straight
//   non-class parts are available.) Also used to determine whether an item 
//   is a class. Classes are filtered out unless no non-classes are available.
// * Various subproperties and similar of P361/P527:
// ** P150, P131 (contains/located in the administrative territorial entity)
// ** P397, P398 (parent/child astronomical body). Not technically the same, 
//    but I count them anyway.
// ** P30 (continent) Also technically not a subprop, but it works under
//    certain limited conditions.
// ** P446 (occupant)
// ** P551 (residence), P1082 (population): List humans residing in item, along
//   with the statistics on how many total there are.
// * Other properties:
// ** P585 (point in time): To determine most recent population figures.
// ** P580 (start time), P582 (end time): Extra data is shown for duration 
//    of "part-ness", or, if that's not possible, non-current results are
//    simply filtered out.
// ** P571 (inception), P576 (dissolved or abolished): Same thing.
// ** P569 (date of birth), P570 (date of death): Same, for humans.
// ** P1114 (quantity): If qualifying a class>has part, list the number of
//    instances.

var queries = {
    // TODO: Add P186 (material used) somewhere into one of the queries.
    // TODO: Maybe work P2670 ("has parts of the class") into some of these.
    // Basic part relationship. Example: Eurasia > Europe
    basicParts : // TODO: Split this into two parts. Get more data out of the classes.
        "SELECT distinct ?p ?pLabel (sample(?type_) as ?type) (max(?start_) as ?start) (min(?end_) as ?end) WHERE {" +
            /*
            "?pr wdt:P1647* wd:P361 ." +
            "?pr wikibase:directClaim ?t ." +
            "?p ?t wd:" + id + " ." +
            */
            // List props
            "{" + // I don't even know what this encapsulation does. TODO: Find out.
                // Without encapsulation, this times out...
                // TODO: Figure out how to handle astronomical bodies (P397/P398).
                // I don't want redundant entries, but whether to place them in 
                // inner or outer items is confusing.
                // Solar system >p> planet >a> moon -> inner
                // Milky way group >p> Milky Way >a> orbiting galaxy -> outer
                //
                // Maybe just dump astronomical object...?
                // Or maybe just special-case some astronomical objects.
                "?p p:P361|p:P131|p:P397|^ps:P527|^ps:P150|^ps:P398|^ps:P466 ?st ." +
                "{ ?st ps:P361|ps:P131|ps:P397|^p:P527|^p:P150|^p:P398|^p:P466 wd:$1. }" +
                //"?p p:P361|p:P131|^ps:P527|^ps:P150|^ps:P466 ?st ." +
                //"{ ?st ps:P361|ps:P131|^p:P527|^p:P150|^p:P466 wd:$1. }" +
                "OPTIONAL { ?st pq:P580 ?start_ }" +
                "OPTIONAL { ?st pq:P582 ?end_ }" +
            "}" + 
            // old
            //"{" +
                // Subprop method. Messed up by "facet" and "country" props.
                //"?p (wdt:P361|wdt:P131|wdt:P397|^wdt:P527|^wdt:P150|^wdt:P398) wd:$1." +
                // Simple
                //"?p wdt:P361 wd:" + id + "." +
            //"} UNION { " + 
                //"wd:$1 () ?p" +
                // Simple
                //"wd:" + id + " wdt:P527 ?p " + 
            //"} UNION {" +
                // class stuff. moved to partsFromSuperClass
                // If P279*, there are 440,000 parts of universe...
                // 7000 at P279{3} (mostly Q83620 (thoroughfare), 
                // 400,000 at {4} (mostly Q79007 (street), Q55488 (railway station))
                //"?p wdt:P31/(wdt:P279)?/(wdt:P279)?/wdt:P361 wd:$1." + 
            //"}" + 
            // /old
            // filter classes
            "FILTER NOT EXISTS { ?p (wdt:P279|^wdt:P279|^wdt:P31) ?q }" +
            //"FILTER NOT EXISTS { ?p wdt:P31 wd:Q5 }" +
            // filter fictional entities
            "FILTER NOT EXISTS { ?p wdt:P31/wdt:P279* wd:Q14897293 }" +
            "OPTIONAL { ?p wdt:P31/wdt:P279* ?type_. VALUES ?type_ { wd:" + allTypes.join( " wd:" ) + " } }" +
            "OPTIONAL { ?p wdt:P571 ?start_. }" +
            "OPTIONAL { ?p wdt:P576 ?end_. }" +
            // Also further down the parts tree
            "FILTER NOT EXISTS { ?p (wdt:P361|^wdt:P527)/(wdt:P361|^wdt:P527)+ wd:$1 . }" +
            // And further down on the subclass tree. Not necessary for direct, I think?
            //"FILTER NOT EXISTS { ?p wdt:P31/wdt:P279*/wdt:P361/wdt:P361+ wd:$1 . }" +
            // And mixed, if possible
            //"FILTER NOT EXISTS { ?p (wdt:P31/wdt:P279*)?/wdt:P361/wdt:P361+ wd:$1 . }" +
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
        "} GROUP BY ?p ?pLabel LIMIT " + maxResults,
    // Unused
    oldPartsFromSuperClass : // Get instances of superclass. $1 = instance, return instance
        "SELECT distinct ?p ?pLabel ?start ?end ?subClass ?subClassLabel ?class ?classLabel ?type WHERE {" +
            // If P279*, there are 440,000 parts of universe...
            // 7000 at P279{3} (mostly Q83620 (thoroughfare), 
            // 400,000 at {4} (mostly Q79007 (street), Q55488 (railway station))
            "{" +
                "?p wdt:P31 ?subClass ." +
                "?subClass (wdt:P279)?/(wdt:P279)? ?class." +
                "?class wdt:P361 wd:$1." + 
            //"}" +
            // whyyyyyyyy
            "}union{?p wdt:P222222 []}" +
            // filter classes
            "FILTER NOT EXISTS { ?p (wdt:P279|^wdt:P279|^wdt:P31) ?q }" +
            //"FILTER NOT EXISTS { ?p wdt:P31 wd:Q5 }" +
            // filter fictional entities
            "FILTER NOT EXISTS { ?p wdt:P31/wdt:P279* wd:Q14897293 }" +
            "OPTIONAL { ?p wdt:P31/wdt:P279* ?type. VALUES ?type { wd:" + allTypes.join( " wd:" ) + " } }" +
            "OPTIONAL { ?p wdt:P571 ?start. }" +
            "OPTIONAL { ?p wdt:P576 ?end. }" +
            // Also further down the parts tree
            "FILTER NOT EXISTS { ?p (wdt:P361|^wdt:P527)/(wdt:P361|^wdt:P527)+ wd:$1 . }" +
            // And further down on the subclass tree
            // this times out. TODO: Replace.
            "FILTER NOT EXISTS { ?subClass wdt:P279*/wdt:P361/wdt:P361+ wd:$1 . }" +
            // And mixed, if possible
            //"FILTER NOT EXISTS { ?p (wdt:P31/wdt:P279*)?/wdt:P361/wdt:P361+ wd:$1 . }" +
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
        "} LIMIT " + maxResults,
    // Part relationships inherited from superclass. Example: Yellow Sea > seawater
    // (Inherited from P31 > Sea > has part > seawater)
    partsFromSuperClass : // Get instances of superclass. $1 = instance, return instance
        // TO CONSIDER: Use max/min for times. Might not be necessary.
        "SELECT distinct ?p ?pLabel ?start ?end ?type WHERE {" +
            // If P279*, there are 440,000 parts of universe...
            // 7000 at P279{3} (mostly Q83620 (thoroughfare), 
            // 400,000 at {4} (mostly Q79007 (street), Q55488 (railway station))
            "{" +
                "?p wdt:P31/wdt:P279/wdt:P279 ?class. " +
            //"}" +
            // whyyyyyyyy
            "} union {" + 
                "?p wdt:P31/wdt:P279? ?class. " +
            "}" +
            "?class wdt:P361 wd:$1. " + 
            // filter classes
            "FILTER NOT EXISTS { ?p (wdt:P279|^wdt:P279|^wdt:P31) ?q }" +
            //"FILTER NOT EXISTS { ?p wdt:P31 wd:Q5 }" +
            // filter fictional entities
            "FILTER NOT EXISTS { ?p wdt:P31/wdt:P279* wd:Q14897293 }" +
            "OPTIONAL { ?p wdt:P31/wdt:P279* ?type. VALUES ?type { wd:" + allTypes.join( " wd:" ) + " } }" +
            "OPTIONAL { ?p wdt:P571 ?start. }" +
            "OPTIONAL { ?p wdt:P576 ?end. }" +
            // Also further down the parts tree
            "FILTER NOT EXISTS { ?p (wdt:P361|^wdt:P527)+ wd:$1 . }" +
            // And further down on the subclass tree
            // this times out. TODO: Replace.
            // Also, don't overlap with basicParts query.
            "FILTER NOT EXISTS { ?p wdt:P31/wdt:P279*/wdt:P361/wdt:P361+ wd:$1 . }" +
            // And mixed, if possible
            "FILTER NOT EXISTS { ?p (wdt:P31/wdt:P279*)?/wdt:P361/wdt:P361+ wd:$1 . }" +
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
        "} LIMIT " + maxResults,
    // For classes, parts inherited from superclasses. Example: 
    classParts: // Parts of classes of instance
        // $1 = instance, return class (?)
        // TODO: Filter out parts of parts
        // Maybe todo: Filter out superclasses of other parts
        "SELECT distinct ?p ?pLabel WHERE {" +
            //"?p ^wdt:P527/^wdt:P279*/^wdt:P31 wd:$1 ." +
            "wd:$1 wdt:P31/wdt:P279*/wdt:P527 ?p ." +
            // Not working. Timing out. TODO: Fix.
            //"FILTER NOT EXISTS { " +
            //    // "wd:$1 wdt:P31/wdt:P279*/wdt:P527+/wdt:P279*/wdt:P527+ ?p ." +
                //"wd:$1 wdt:P31/wdt:P279*/wdt:P527 ?q ." +
            //    //"?p ^wdt:P527/^wdt:P279* ?q ." +
                //"?q (wdt:P279|wdt:P527)*/wdt:P527 ?p ." +
            //"}" +
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
            // "?p (wdt:P361|^wdt:P527)/wdt:P279+ wd:$1 ." +
        "} LIMIT " + maxResults,
    partClassParts: // Parts of the current class. (Returns classes.)
        "SELECT distinct ?p ?pLabel ?quant WHERE {" +
            "wd:$1 wdt:P279*/p:P527 ?statement. " + 
            "?statement ps:P527 ?p. " +
            "FILTER NOT EXISTS { ?p ^wdt:P279+/wdt:P527 wd:$1 .}" +
            "OPTIONAL { ?statement pq:P1114 ?quant . } " +
            // TODO: Filter out parts of parts
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
            // "?p (wdt:P361|^wdt:P527)/wdt:P279+ wd:$1 ." +
        "} LIMIT " + maxResults,
    classPartNumbers: 
        // Should this divide by subclass or top class?
        // $1 = instance, returns classes, with numbers
        // Does adding distinct here remove duplicates from multiple classes?
        "SELECT ?class ?classLabel ?subClass ?subClassLabel (count(distinct ?p) as ?num) WHERE {" +
            "?p wdt:P31 ?subClass ." +
            "?subClass wdt:P279?/wdt:P279? ?class ." +
            "?class wdt:P361 wd:$1. " +
            // For some reason, this filter results in more results. ???
            // This should probably only require a single part-link, not {2,}
            "FILTER NOT EXISTS { ?p (wdt:P361|^wdt:P527)+ wd:$1 . }" +
            // TODO: Filter out parts of parts
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
            // "?p (wdt:P361|^wdt:P527)/wdt:P279+ wd:$1 ." +
        "} GROUP BY ?class ?classLabel ?subClass ?subClassLabel ORDER BY DESC(?num) " +
        "LIMIT " + maxResults,
    specificClassPartList:
        "SELECT ?p ?pLabel WHERE {" +
            "?p wdt:P31 wd:$1 ." +
            // For some reason, this filter results in more results. ???
            "FILTER NOT EXISTS { ?p (wdt:P361|^wdt:P527)+ wd:$2 . }" +
            // TODO: Filter out parts of parts
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
            // "?p (wdt:P361|^wdt:P527)/wdt:P279+ wd:$1 ." +
        "}",
    findTypeLabelAndIsClass: 
        "SELECT DISTINCT ?l ?isClass ?type WHERE {" +
            "wd:$1 rdfs:label ?l filter (lang(?l) = \"en\") ." +
            "OPTIONAL {" +
                "wd:$1 wdt:P279|^wdt:P279|^wdt:P31 ?x ." +
                "VALUES ?isClass { 1 }" +
            "}" +
            "OPTIONAL { wd:$1 wdt:P31/wdt:P279* ?type. VALUES ?type { wd:" + allTypes.join( " wd:" ) + " } }" +
        "}",
    populationAndResNum:
        "SELECT ?pop ?time ?num WHERE {" +
            "{" +
                "SELECT ( count( distinct ?res ) as ?num ) WHERE {" +
                    "OPTIONAL {" +
                        "?res p:P551 ?statement ." +
                        "?statement ps:P551 ?place ." +
                        "?place wdt:P131* wd:$1 ." +
                        "FILTER NOT EXISTS { ?statement pq:P582 ?end }" +
                        "FILTER NOT EXISTS { ?res wdt:P570 ?death }" +
                    "}" +
                "}" +
            "}" +
            "OPTIONAL {" +
                "wd:$1 p:P1082 ?popStatement. " +
                "?popStatement ps:P1082 ?pop; " +
                "              pq:P585 ?time. " +
            "}" +
        "} ORDER BY DESC( ?time ) limit 1",
    allResidents: 
        // Can't figure out how to do time-based part-of loops.
        // Instead, limit to current residents, not considering
        // part-of issues.
        // Note in case I figure out a solution: GROUP_CONCAT could be useful.
        // TODO: Figure this out.
        "SELECT DISTINCT ?p ?pLabel WHERE {" +
            "?p p:P551 ?st . " + 
            "?st ps:P551/(wdt:P131|^wdt:P150)* wd:$1. " +
            "FILTER NOT EXISTS { ?st pq:P582 ?start . } " +
            "FILTER NOT EXISTS { ?p wdt:P570 ?death . }" +
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
        "} LIMIT " + maxResults,
    allOrgs:
        "SELECT DISTINCT ?p ?pLabel WHERE {" +
            "?p wdt:P159/(wdt:P131|^wdt:P150)* wd:$1. " +
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
        "}",
    continentParts:
        "SELECT DISTINCT ?p ?pLabel WHERE {" +
            "?p wdt:P30 wd:$1; " +
            "   wdt:P31/wdt:P279* wd:Q3624078 . " +
            "FILTER NOT EXISTS { ?p (wdt:P361|^wdt:P527)+ wd:$1 . }" +
            "FILTER NOT EXISTS { ?p wdt:P576 [] . }" +
            "SERVICE wikibase:label {" +
                "bd:serviceParam wikibase:language \"en\" ." +
            "}" +
        "}"
};

function getQuery( name ) {
    var query = queries[ name ];
    if ( !query ) {
        throw new Error( "Query not found. queries." + name + " does not exist." );
    }
    for ( var i = 1; i < arguments.length; i++ ) {
        if ( arguments[ i ] ) {
            query = query.replace( new RegExp( "\\$" + i, "g" ), arguments[ i ] );
        }
    }
    return query;
}

// Currently unused :/
function getQueries( names, id ) {
    return names.map( function ( a ) {
        return getQuery( a, id );
    } );
}

function getWD( query, callback ) {
    var queriesArray = typeof query === "string" ? [ query ] : query,
        numberOfQueries = queriesArray.length,
        completedQueries = 0,
        responses = [];
    for ( var i = 0; i < numberOfQueries; i++ ) {
        ( function ( query, i ) {
            var request = new XMLHttpRequest(),
                url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent( query );
            request.open( "GET", url, true );
            request.onreadystatechange = function () {
                if ( request.readyState === 4 ) {
                    try {
                        var response = JSON.parse( request.response );
                    } catch ( e ) {
                        console.error( "Error on recieving query result. \nQuery url: " + url + "\nResponse: " + ( request && request.response ) );
                        //return false;
                    }
                    responses[ i ] = response && response.results.bindings;
                    completedQueries++;
                    if ( completedQueries === numberOfQueries ) {
                        callback.call( null, responses );
                    }
                    //callback( response );
                }
            };
            request.send();
        })( queriesArray[ i ], i );
    }
}

/**
 * ...
 * @param {Array} queries List of query names
 * @param {Array} stringArgs
 * @param {Function} callback
 * @param {Function} [finishedCallback] Called after all results are processed.
 */
function runQuery( queries, stringArgs, callback, finishedCallback, offset ) {
    var queryStrings = queries.map( function ( x ) {
            return getQuery( x, stringArgs[ 0 ], stringArgs[ 1 ] ); // + " offset " + offset;
        } ),
        allQueries = queries.map( function ( x ) {
            return { query: x, stringArgs: stringArgs, offset: 0 };
        } );
    //console.log( "runQuery", queries, allQueries, allQueries.length );
    function handleResult( responses ) {
        //console.log( "handleResult", allQueries[ 0 ], responses );
        function runAnotherQuery( queries, _stringArgs, _callback ) {
            //console.log( "runAnotherQuery" );
            // runAnotherQuery has to add new stuff to a local array, but must
            // maintain its own version of offset, and maybe also stringArgs.
            // Actually, I think maybe every query needs its own stringArgs...
            for ( var i = 0; i < queries.length; i++ ) {
                allQueries.push( { 
                    query: queries[ i ], 
                    stringArgs: _stringArgs, 
                    offset: 0
                } );
            }
        }
        var queryStrings;
        if ( allQueries.length !== responses.length ) {
            throw new Error( "handleResult error: Wrong number of responses. ", allQueries, responses );
        }
        for ( var i = 0; i < responses.length; i++ ) {
            var halt = 
                callback( 
                    responses[ i ], 
                    allQueries[ i ].query, 
                    runAnotherQuery, 
                    allQueries[ i ].offset
                ) === false;
                
            if ( responses[ i ].length === maxResults && !halt ) {
                if ( allQueries[ i ].offset < maxResults * 10 ) {
                    allQueries[ i ].offset += maxResults;
                } else {
                    //console.log( "Too many" );
                    // Too many.
                    // TODO.
                    // For now, just kill the query.
                    allQueries.splice( i--, 1 );
                }
            } else {
                //console.log( "Query complete", allQueries[ i ], i )
                // Finished the query
                allQueries.splice( i--, 1 );
                // sigh... temporary
                responses.splice( i + 1, 1 );
            }
        }
        if ( allQueries.length ) {
            queryStrings = allQueries.map( function ( x ) {
                return getQuery( x.query, x.stringArgs[ 0 ], x.stringArgs[ 1 ] ) +
                    " offset " + x.offset;
            } );
            getWD( queryStrings, handleResult );
        } else {
            finishedCallback && finishedCallback( true );
            /*
            if ( complete === numberOfQueries ) {
                finishedCallback && finishedCallback( true );
            }
            */
        }
    }
    getWD( queryStrings, handleResult );
}

function fromEntity( url ) {
    return url && url.split( "/entity/" )[ 1 ];
}

/**
 * @param {string} parentId Wikidata ID of the parent item.
 * @param {object} item
 * @param {string|undefined} type
 */
function getParts( parentId, item, type ) {
    var loading = document.createTextNode( "Loading..." ),
        block = item.subtree,
        classParts = type === "class";
    block.appendChild( loading );
    function handleResponse( response, query, runAnotherQuery, offset ) {
        // TODO: Rework some stuff. This would be a lot easier if an arg held
        // the name of the query. Maybe kill getQuery?
        // TODO: Find out if any of the handlings require both 
        // query results simultaneously. If not, that simplifies things.
        // Type:instance needs to know whether both are empty to know
        // whether to launch the backup query.
        // I'm thinking return true for finished. Offset as arg?;
        if ( !response ) {
            loading.nodeValue = "Error: Can't parse response";
            return;
        }
        //console.log( response );
        var list = response;
        
        switch ( type ) {
            case "class":
                break;
            case "instance":
                if ( query === "classPartNumbers" ) {
                    // We're checking the classes that are parts of the item,
                    // first just with numbers and class names.
                    if ( response && response[ 0 ] ) {
                        // If the class pile has too many members to list as
                        // individuals, break them up into groups listed by class.
                        if ( response[ 0 ].num.value > 100 ) {
                            // If too many, use "class * #", linking to further query
                            // TODO: This should be added after the regular subblocks.
                            for ( var i = 0; i < response.length; i++ ) {
                                getSubBlock( {
                                    id: fromEntity( response[ i ].subClass.value ),
                                    //id: fromEntity( response[ i ].class.value ),
                                    l: response[ i ].subClassLabel.value,
                                        // + " (" + response[ i ].classLabel.value + ")"
                                    quant: response[ i ].num.value,
                                    type: "classGroup",
                                    extradata: parentId
                                }, item, "classGroup" );
                            }
                        } else {
                            // Otherwise, go straight to simple query.
                            // Find all instances of classes that are part of 
                            // the item.
                            runAnotherQuery( [ "partsFromSuperClass" ], [ parentId ] );
                            // Then, halt the query.
                            // Even if there's more stuff, it's irrelevant now.
                            return false;
                        }
                    } else if ( !item.children || item.children.length === 0 ) {
                        // There are no instances of classes that are parts
                        // of the item. Instead, just list the classes.
                        runAnotherQuery( [ "classParts" ], [ parentId ] );
                        classParts = true;
                        // Give a visual indicator that the script is still
                        // doing stuff. TODO: Also have this elsewhere.
                        loading.nodeValue += "...";
                    }
                }
                break;
            case "Q15642541":
                // Place
                if ( query === "populationAndResNum" ) {
                    // Populations and residents.
                    var pop = response, res;
                    if ( pop ) {
                        pop = pop[ 0 ];
                        res = pop && pop.num.value;
                        pop = pop && pop.pop && pop.pop.value;
                        ( pop || res && res > 0 ) && getSubBlock( {
                            l: ( pop ? ( +pop ).toLocaleString() : "?" ) + " humans (" + res + " listed)",
                            type: "pop",
                            extradata: parentId
                        }, item, "pop" );
                    }
                }
                break;
            case "Q5107":
                if ( query === "continentParts" ) {
                    // This query only returns places, so add the
                    // type here manually.
                    list.forEach( function ( x ) {
                        x.type = {
                            value: "/entity/Q15642541"
                        };
                    } )
                }
                break;
            case "pop":
                break;
        }
        
        /*
        // TODO, if this becomes necessary.
        if ( query === "basicParts" ) {
            // Remove duplicates
            ( function () {
                var l = {};
                list.forEach( function ( a ) {
                    
                } );
            } )();
        }
        */

        // This condition is temporary. TODO: Find another way to work things.
        list[ 0 ] && list[ 0 ].p && list.map( function ( a ) {
            return {
                //id: a.p.value.split( "/entity/" )[ 1 ],
                id: fromEntity( a.p.value ),
                l: a.pLabel.value,
                quant: classParts ? a.quant && a.quant.value || "?" : false,
                start: a.start,
                end: a.end,
                isClass: classParts,
                type: a.type
            };
        }).forEach( function ( a ) {
            if ( a.id !== parentId ) {
                var quant = a.quant;
                if ( a.type ) {
                    a.type = fromEntity( a.type.value );
                }
                if ( quant === quant | 0 && quant > 0 && quant <= 10 ) {
                    // Make sure this only splits up as a result of the quantity property.
                    a.quant = false;
                    for ( var i = 0; i < quant; i++ ) {
                        // TODO: Change type. Block is a single instance of a class.
                        getSubBlock( a, item, "instance" );
                    }
                } else {
                    getSubBlock( a, item, classParts ? "class" : a.type || "instance" );
                }
            }
        });
    }

    // Initial request
    runQuery( 
        ( {
            "class":[ "partClassParts" ],
            "instance": [ "basicParts", "classPartNumbers" ], 
            // Place
            "Q15642541": [ "populationAndResNum", "basicParts" ], 
            // Continent
            "Q5107": [ "basicParts", "continentParts" ], 
            // Population block
            "pop": [ "allResidents" ],
            "classGroup": [ "specificClassPartList" ]
        } )[ type ],
        ( {
            "pop" : [ item.extradata ],
            "classGroup" : [ parentId, item.extradata ]
        } )[ type ] || [ parentId ], 
        handleResponse,
        function () {
            // if ( ... )
            //      loading.nodeValue = "Too many results.";
            loading.parentNode && block.removeChild( loading );
        }
    );
}

function buildItemDom( labelText, qId ) {
    var d = document.createElement( "div" ),
        label = d.appendChild( document.createElement( "span" ) ),
        wdLink = document.createElement( "a" ),
        subtree = d.appendChild( document.createElement( "div" ) );
    d.className = "item";
    d.classList.add( "collapsed" );
    label.className = "label";
    label.appendChild( document.createTextNode( labelText ) );
    subtree.className = "subtree";

    if ( qId ) {
        wdLink.href = "https://www.wikidata.org/wiki/" + qId;
        wdLink.target = "_";
        wdLink.title = qId + " on Wikidata";
        label.appendChild( wdLink );
    }
    
    return {
        outer: d,
        label: label,
        wdLink: wdLink,
        subtree: subtree
    };
}

function getSubBlock( item, parent, type ) {

    var itemObj = buildItemDom( 
            item.l + ( item.quant ? " * " + item.quant : "" ), 
            item.id
        );
    
    var start = item.start,
        end = item.end, 
        d = itemObj.outer,
        label = itemObj.label,
        subtree = item.subtree = itemObj.subtree,
        expanded = false,
        filled = false,
        titleParts = [];
    
    parent.children = parent.children || [];
    parent.children.push( item );
    
    if ( end && end.value && end.type === "literal" ) {
        label.classList.add( "former" );
    }
    if ( item.quant ) {
        titleParts.push( 
            ( item.quant === "?" ? "Unknown quantity of" : item.quant ) + 
            ( item.quant === "1" ? " instance" : " instances" ) +
            " of " + item.l 
        );
    }
    if ( start || end ) {
        titleParts.push( 
            ( start && start.type === "literal" && start.value || "?" ) + 
            " - " + 
            ( end && end.type === "literal" && end.value || "?" )
        );
    }
    if ( titleParts.length ) {
        label.title = titleParts.join( ";" );
    }
    
    label.onclick = function () {
        if ( expanded ) {
            d.classList.add( "collapsed" );
            d.classList.remove( "expanded" );
        } else {
            d.classList.add( "expanded" );
            d.classList.remove( "collapsed" );
        }
        if ( !filled ) {
            getParts( item.id, item, type );
            filled = true;
        }
        expanded = !expanded;
    };
    parent.subtree.appendChild( d );
    return d;
}

function init() {
    var search = location.search,
        form = document.body.appendChild( document.createElement( "form" ) ),
        input = form.appendChild( document.createElement( "input" ) ),
        submit = form.appendChild( document.createElement( "input" ) ),
        qParam;
    submit.type = "submit";
    input.placeholder = "Enter Q-id";
    input.name = "q";
    search = search && search.split( "q=" );
    qParam = search && search[ 1 ];
    search = qParam || "Q1";
    input.value = qParam || "";
    //getWD( getQuery( "findTypeLabelAndIsClass", search ), function ( responses ) {
    runQuery( [ "findTypeLabelAndIsClass" ], [ search ], function ( response ) {
        var binding = response[ 0 ],
            label = binding && binding.l.value,
            type = fromEntity( binding && binding.type && binding.type.value );
        if ( binding ) {
            // Class status is currently invisible.
            var topItem = { subtree: document.body };
            getSubBlock( { id: search, l: label || search || "Universe" }, topItem, binding.isClass ? "class" : type || "instance" );
        } else {
            document.body.appendChild( document.createTextNode( 
                "Item " + search + " not found." 
            ) );
        }
    } );
}

init();
