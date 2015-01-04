var http = require('http'),
 	https = require('https'),
 	url = require('url'),
 	__ = require('underscore'),
 	S = require('string'),
 	Q = require('q'),
 	logger = console.log;

// common method to check the validity and error
// condition of the response object and body
var checkResponse = function(response, body, deferred)
{

	var errorMsg = '';

	if(response.statusCode === 404)
	{
		errorMsg = 'Invalid object identifier';
	}

	// looking for 200 (GET)s or 204 (POST)s
	else if(response.statusCode !== 200 && response.statusCode !== 204) 
	{
		errorMsg = response.statusCode + '::Unable to connect to JIRA';
	}

	else if(body === undefined)
	{
		errorMsg = 'Response body undefined';
	}

	if(!S(errorMsg).isEmpty())
	{
		if(deferred)
		{
			deferred.reject(errorMsg);
		}

		logger(errorMsg);
		logger(body);

		throw errorMsg;
	}

	return;

};

var toJSON = function(something)
{
	var jsonResult = __.isString(something)?
		JSON.parse(something):
		something;
	
	return jsonResult;
};

// JiraRestApi
// -----------

// This object will connect to a JIRA instance (cloud based) and allow
// to preforms set actions
 var JiraRestApi = exports.JiraRestApi = 
 	function(protocol, host, port, username, 
 			password, apiVersion, verbose, strictSSL)
 {
 	this.protocol = protocol;
 	this.host = host;
 	this.port = port;
 	this.username = username;
 	this.password = password;
 	this.apiVersion = apiVersion;
 	this.strictSSL = strictSSL?strictSSL:true; // default to true

 	this.request = require('request');

 	this.RAWV = {'r':'reporter', 'a':'assignee', 
 	'w':'watchers','v':'voters'};
 	this.RAWVKeys = __.keys(this.RAWV);

 	//  on logger if verbose is true
 	if(verbose !== true) { logger = function(){}; }

 	// creates the JIRA url
 	this.makeUri = function(pathname)
 	{
 		var basePath = 'rest/api';

 		var uri = url.format({
 			protocol:this.protocol,
 			hostname:this.host,
 			port:this.port,
 			pathname: basePath +'/'+ apiVersion + pathname
 		});

 		logger('formatted URI = ' + uri);

 		return decodeURIComponent(uri);
 	};

 	// fires off the request with auth attached
 	this.doRequest = function(options, callback)
 	{
 		options.auth={
 			'user':this.username,
 			'pass':this.password
 		};

 		logger('calling request');

 		this.request(options, callback);
 	};

 };

// returns an issue by issue ID (e.x. MIG-12)
JiraRestApi.prototype.findIssue = function(issueNumber, callback)
{

	// Create deferred promise
	var deferred = Q.defer();

	var options = {
		rejectUnauthorized: this.strictSSL,
		uri : this.makeUri('/issue/' + issueNumber),
		method: 'GET'
	};

	logger('calling ' + options.uri);

	this.doRequest(options, function(error, response, body){
		if(error)
		{
			logger(error);
			//callback(error, null);
			deferred.reject(error);
			return;
		}

		try
		{
			checkResponse(response, body, deferred);	
		}
		catch(err)
		{
			return;
		}
		

		logger(response.statusCode);
		logger(body);

		// if not rejected yet
		if(!deferred.promise.isRejected())
		{
			deferred.resolve(JSON.parse(body));	
		}

	});


	deferred.promise.nodeify(callback);
	return deferred.promise;
};

// executes the JQL query and returns the result.  The result will only 
// have pointers to the objects.  Use @processSearchResults to get each 
// fill object graph
JiraRestApi.prototype.search = function(jql, callback) {

	var deferred = Q.defer();

	if(S(jql).length > 255)
	{
		deferred.reject('search string must be 255 chars or less');
		deferred.promise.nodeify(callback);
		return deferred.promise;
	}

	var options = {
		rejectUnauthorized : this.strictSSL,
		uri : this.makeUri('/search?' + jql),
		method:'GET'
	};

	logger(' calling ' + options.uri);

	this.doRequest(options, function(error, response, body){
		if(error)
		{
			logger(error);
			deferred.reject(error);
			deferred.promise.nodeify(callback);
			return;
		}

		logger(response.statusCode);
		logger(body);

		try
		{
			checkResponse(response, body, deferred);	
		}
		catch(err)
		{
			deferred.promise.nodeify(callback);
			return;
		}

		deferred.resolve(JSON.parse(body));
		deferred.promise.nodeify(callback); 		
		
	});

	return deferred.promise;

};

//	Will follow each work item pointer and fetch the object graph.  Passed
// as the second argument of the callback function
JiraRestApi.prototype.processSearchResults = function(searchResult, callback)
{

	var deferred = Q.defer();

	if(searchResult === null || 
		(__.isString(searchResult) && S(searchResult).isEmpty())){
			deferred.reject('no search results');
			deferred.promise.nodeify(callback);
			//callback(null, null);
			return deferred.promise;
	}

	logger('is string? ' + __.isString(searchResult));

	var jsonResult = toJSON(searchResult);
	
	logger('processSearchResults.jsonResult == ' + typeof jsonResult);

	var processedResults = [];

	var finalCallback = __.after(jsonResult.issues.length, function(result){
		deferred.resolve(result);
	});

	__.each(jsonResult.issues, function(row, index){
		var uri = row.self;

		var options = {
			rejectUnauthorized: this.strictSSL,
			uri : uri,
			method: 'GET'
		};

		this.doRequest(options, function(error, response, body){
			if(error)
			{
				logger('in processSearchResults\n' + error);
				deferred.reject(error);
			}

			logger(body);

			try
			{
				checkResponse(response, body, deferred);	
			}
			catch(err)
			{
				deferred.request(err);
			}

			if(!deferred.promise.isRejected())
			{
				processedResults.push(JSON.parse(body));
				finalCallback(processedResults);				
			}

		});

	}, this);

	deferred.promise.nodeify(callback);
	return deferred.promise;

};

// takes either an object or array and will pull the estimated, remaining, and
// spent hours.  Returns an array with the id if the item and the timetracking
// items.
JiraRestApi.prototype.processHours = function(jsonfromSearch, callback)
{

	var deferred = Q.defer();

	// resulting data
	var data = [];

	// processing function
	var processRow = function(item)
	{
		logger('processing \n' + item.fields);
		logger('item typeof' + typeof item);

		var itemData = {};
		itemData.id = item.key;
		if(item.fields && item.fields.timetracking)
		{
			itemData.estimate = 
				item.fields.timetracking.originalEstimateSeconds;
			itemData.spent = 
				item.fields.timetracking.timeSpentSeconds;
			itemData.remaining = 
				item.fields.timetracking.remainingEstimateSeconds;		
		}

		logger('estimate is = ' + itemData.estimate);
		logger('spent is = ' + itemData.spent);
		logger('remaining is = ' + itemData.remaining);	


		data.push(itemData);
	};

	// early null check
	if(jsonfromSearch === undefined)
	{
		deferred.reject('json from search is null');
		deferred.promise.nodeify(callback);
		return deferred.promise;
	}

	//determine if it's an array and process accordingly
	var eachLength  = (__.isArray(jsonfromSearch))?
		jsonfromSearch.length:1;

	logger('search results to process = ' + eachLength );

	if(eachLength == 1)
	{
		var jJsonFromSearch = toJSON(jsonfromSearch);

		processRow(jJsonFromSearch);
		//callback(null,data);
		deferred.resolve(data);
	}
	else
	{
		var finalCallback = __.after(eachLength, function(theData){
			deferred.resolve(theData);
		});

		__.each(jsonfromSearch, function(item){

			var jJsonFromSearch = toJSON(item);

			processRow(jJsonFromSearch);

			finalCallback(data);

		});		
	}

	deferred.promise.nodeify(callback);

	return deferred.promise;
};

//sends the updated issue object back to JIRA
JiraRestApi.prototype.updateIssue = 
	function(issueId, issueChangeJson, callback) {

	var deferred = Q.defer();

	if(issueChangeJson === undefined || issueId === undefined)
	{
		deferred.reject('Either issueChangeJson or issueId is undefined');
		deferred.promise.nodeify(callback);
		return deferred.promise;
	}

	// if string, convert to json
	var issueJsonString = (__.isString(issueChangeJson))?
		issueChangeJson:JSON.stringify(issueChangeJson);

	logger('update issue string ' + issueJsonString);


	var options = {
		rejectUnauthorized : this.strictSSL,
		uri : this.makeUri('/issue/' + issueId),
		method:'PUT',
		body:issueJsonString,
		headers:{
			'Content-Type' : 'application/json'
		}
	};

	this.doRequest(options, function(error, response, body){
		if(error)
		{
			deferred.reject(error);
			//callback(error, null);
		}

		try
		{
			checkResponse(response, body, deferred);
		}
		catch(err)
		{
			// error handled in checkResponse method
		}

		if(response.statusCode === 204)
		{
			deferred.resolve(true);
			//callback(null, true);
		}
		else
		{
			deferred.reject('Got %s back from server', response.statusCode);
			//callback(body, false);
		}

		deferred.promise.nodeify(callback);
		return;
	});

	return deferred.promise;
};

// send notification email from JIRA server to all users and/or 
// eveyone within a group about the issueIdOrKey
// users - can be string or array of string
// group - can be string or array of string or null
// rawv - array containing each letter 'r', 'a', 'w','v' 
// for reporter, assigned, watcher, and/or voter
JiraRestApi.prototype.notify = function(issueIdOrKey, 
	subject, body, rawv, 
	users, groups, callback)
{

	var deferred = Q.defer();

	// error if issueIdOrKey is not present
	if(S(issueIdOrKey).isEmpty())
	{
		deferred.reject('issueIdOrKey must be something');
		//callback('issueIdOrKey must be something', null);
		deferred.promise.nodeify(callback);
		return deferred.promise;
	}

	// build request object
	var jNotify = {};
	jNotify.subject = subject;
	jNotify.textBody = body;
	jNotify.htmlBody = body;
	jNotify.to = {};

	var localRAWV = __.isArray(rawv)?rawv:[];

	logger('RAWVTrue = ' + localRAWV);

	for(var iRAWV=0; iRAWV < this.RAWVKeys.length; iRAWV++)
	{
		jNotify.to[this.RAWV[this.RAWVKeys[iRAWV]]] = 
			__.indexOf(localRAWV, this.RAWVKeys[iRAWV])>-1;
	}



	jNotify.to.users = [];

	if(__.isArray(users))
	{
		for(var inx = 0; inx < users.length; inx++)
		{
			jNotify.to.users.push({name:users[inx], active:true});
		}
	}
	else if(__.isString(users))
	{
		jNotify.to.users.push({name:users});		
	}

	jNotify.to.groups = [];

	if(__.isArray(groups))
	{
		for(var inx2 = 0; inx2 < groups.length; inx2++)
		{
			jNotify.to.groups.push({name:groups[inx2]});
		}
	}
	else if(__.isString(groups))
	{
		jNotify.to.groups.push({name:groups});
	}

	var notifyJsonString = JSON.stringify(jNotify);

	logger(notifyJsonString);
	
	var options = {
		rejectUnauthorized : this.strictSSL,
		uri : this.makeUri('/issue/' + issueIdOrKey + '/notify'),
		method:'PUT',
		body:notifyJsonString,
		headers:{
			'Content-Type' : 'application/json'
		}
	};


	this.doRequest(options, function(error, response, body){
		if(error)
		{
			deferred.reject(error);
			//callback(error, false);
			return;
		}

		try
		{
			checkResponse(response, body, deferred);
		}
		catch(err)
		{
			return;
		}

		if(response.statusCode === 204)
		{
			deferred.resolve(true);
			//callback(null, true);
		}
		else
		{
			deferred.reject(body);
			//callback(body, false);
		}

		return;
	});

	deferred.promise.nodeify(callback);
	return deferred.promise;
};