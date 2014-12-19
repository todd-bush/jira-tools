var require_helper = require('../require_helper')
	jiraApi = require_helper('jira-rest-api').JiraRestApi,
	fs = require('fs'),
	should = require('should'),
	nock = require('nock');

// return the default jira object
var createJiraObject = function()
{
	return new jiraApi('http','test.com',80,'test', 'test',2,true,true);
}

describe('find issue', function(){

	var jira, mockNock;

	it('should be a function', function(){
		jira.findIssue.should.be.a.function;
	});

	it('should successfully return json', function(done){
		jira.findIssue(2, function(error, json){
			
			console.log(json);

			json.test.id.should.equal(2);
			done();
		});
	});

	it('should successfully return a promise', function(done){
		jira.findIssue(2)
			.then(function(result){
				console.log(result);
				result.test.id.should.equal(2);
			})
			.fail(function(error){
				(error === null).should.be.true;  //shouldn't hit here.
			}).
			finally(function(){ done(); });
	});

	it('should handle 404', function(done){
		jira.findIssue(404, function(error, json){
			
			error.should.equal('Invalid object identifier');
			done();
		});
	});

	it('should handle 404 with promise', function(done){
		jira.findIssue(404)
			.then(function(result){
				console.log(result);
				(result === null).should.be.true;
			})
			.fail(function(error){
				error.should.equal('Invalid object identifier');
			})
			.finally(function() { done() });
	});

	it('should handle 500', function(done){
		jira.findIssue(500, function(error, json){
			
			error.should.equal('500::Unable to connect to JIRA');
			done();
		});
	});

	// set up the Jira object
	beforeEach(function(){
		jira = createJiraObject();
		
		var jResp = {"test":{"id":2}};

		mockNock = nock('http://test.com:80')
			.get('/rest/api/2/issue/2')
			.reply(200, JSON.stringify(jResp))
			.get('/rest/api/2/issue/404')
			.reply(404)
			.get('/rest/api/2/issue/500')
			.reply(500);
		
	});

	// null the jira object
	afterEach(function(){
		jira = undefined;
		nock.cleanAll();
	});
});

describe('should execute search', function(){

	var jira;
	var searchResult;

	it('should be a function', function(){
		jira.search.should.be.a.function;
	});

	it('should successfully return search', function(done){
		jira.search('issueStatus=blocked', function(error, json){
			
			console.log(error);
			console.log('in test method::' + json);
			json.total.should.equal(3);
			done();
		});
	});

	it('should successfully return search with promise', function(done){
		jira.search('issueStatus=blocked')
			.then(function(result){
				console.log(result);
				result.total.should.equal(3);
			})
			.fail(function(error){
				(error === null).should.be.true;
			})
			.finally(function(){ done(); });
	});

	it('should deny log search strings', function(done){
		jira.search('issueStatus=blocked AND id > 0 AND status=inprocess AND issueStatus=blocked AND id > 0 AND status=inprocess AND issueStatus=blocked AND id > 0 AND status=inprocess AND issueStatus=blocked AND id > 0 AND status=inprocess and issueStatus=blocked AND id > 0 AND status=inprocess', function(error, json){
			
			console.log(error);

			(error === null).should.be.false;
			done();
		});
	});

	it('should handle 404', function(done){
		jira.search(404, function(error, json){
			
			error.should.equal('Invalid object identifier');
			done();
		});
	});

	it('should handle 404 with promise', function(done){
		jira.search(404)
			.then(function(result){
				(result === null).should.be.true;
			})
			.fail(function(error){
				error.should.equal('Invalid object identifier');
			})
			.finally(function(){ done() });
	});

	it('should handle 500', function(done){
		jira.search(500, function(error, json){
			
			error.should.equal('500::Unable to connect to JIRA');
			done();
		});
	});

	// set up the Jira object
	beforeEach(function(){
		jira = createJiraObject();
		
		var jResp = {"test":{"id":2}};

		nock('http://test.com:80')
			.get('/rest/api/2/search?issueStatus=blocked')
			.reply(200, searchResult)
			.get('rest/api/2/issue/10250')
			.reply(200, JSON.stringify(jResp))
			.get('/rest/api/2/search?404')
			.reply(404)
			.get('/rest/api/2/search?500')
			.reply(500)
			.log(console.log)
			;
		
	});

	// null the jira object
	afterEach(function(){
		jira = undefined;
		nock.cleanAll();
	});

	before(function(done){
		// test search response in outside file  
		fs.readFile('./tests/search-response.json', function(error, data){
			if(error) throw error;
			
			searchResult = data.toString();
			JSON.parse(searchResult);
			//console.log('search result = ' + searchResult);
			done();
		});
	});	

});

describe('search response process', function() {

	var jira;
	var searchResult;
	var stSearchResult;

	it('should be a function', function(){
		jira.processSearchResults.should.be.a.function;
	});

	it('process correct input', function(){
		jira.processSearchResults(searchResult, function(error, processed){
			(error === null).should.be.true;

			processed.length.should.equal(3);

		});
	});

	it('process correct input with promise', function(done){
		jira.processSearchResults(searchResult)
			.then(function(result){
				result.length.should.equal(3);
			})
			.finally(function(){ done(); });
	});

	it('should handle null input', function(){
		jira.processSearchResults(null, function(error, processed){
			(error === null).should.be.false;
		});
	});

	it('should handle empty string input', function(){
		jira.processSearchResults('', function(error, processed){
			(error === null).should.be.false;
		});
	});

	it('should handle empty string input with promise', function(done){
		jira.processSearchResults('')
			.then(function(result){
				(result === null).should.be.true;
			})
			.fail(function(error){
				(error === null).should.be.false;
			})
			.finally(function(){ done(); });
	});

	it('should handle string input', function(){

		jira.processSearchResults(stSearchResult, function(error, processed){
			(error === null).should.be.true;

			processed.length.should.equal(3);

		});

	});

	it('should handle string input with promise', function(done){
		jira.processSearchResults(stSearchResult)
			.then(function(result){
				result.length.should.equal(3);
			})
			.finally(function(){ done(); }); 
	});

	// set up the Jira object
	beforeEach(function(){
		jira =createJiraObject();
		
		var jResp = {"test":{"id":2}};

		nock('http://test.com:80')
			.get('/rest/api/2/issue/10250')
			.reply(200, JSON.stringify(jResp))
			.get('/rest/api/2/issue/10249')
			.reply(200, JSON.stringify(jResp))			
			.get('/rest/api/2/issue/10247')
			.reply(200, JSON.stringify(jResp))			
			.get('/rest/api/2/search?404')
			.reply(404)
			.get('/rest/api/2/search?500')
			.reply(500)
			//.log(console.log)
			;		
	});		

	before(function(done){
		// test search response in outside file  
		fs.readFile('./tests/search-response.json', function(error, data){
			if(error) throw error;
			
			searchResult = data.toString();
			stSearchResult = searchResult;
			JSON.parse(searchResult);
			//console.log('search result = ' + searchResult);
			done();
		});
	});	

});

describe('process hours', function(){

	var jira;
	var singleItemResponse;

	it('should be a function', function(){
		jira.processHours.should.be.a.function;
	});

	it('should handle nulls', function(done){
		jira.processHours(undefined, function(error, hours)
		{
			error.should.equal('json from search is null');
			done();
		});
	});

	it('should handle nulls with promise', function(done){
		jira.processHours(undefined)
			.fail(function(error){
				error.should.equal('json from search is null');
			})
			.finally(function(){ done(); });
	});

	it('should process one response', function(done){
		jira.processHours(singleItemResponse, function(error, hours){
			console.log(hours);
			
			hours.length.should.equal(1);
			hours[0].id.should.equal('MIG-80');
			hours[0].estimate.should.equal(14400);
			hours[0].spent.should.equal(10800);
			hours[0].remaining.should.equal(3600);

			done();
		});
	});

	if('should process one response with promise', function(done){
		jira.processHours(singleItemResponse)
			.then(function(result){
				console.log(result);

				result.length.should.equal(1);
				result[0].id.should.equal('MIG-80');
				result[0].estimate.should.equal(14400);
				result[0].spent.should.equal(10800);
				result[0].remaining.should.equal(3600);
			})	
			.fail(function(error){
				(error === null).should.be.true;
			})
			.finally(function(){ done(); });
	});

	it('should process multiple responses', function(done){
		var multiples = [];

		multiples.push(singleItemResponse);
		multiples.push(singleItemResponse);

		jira.processHours(multiples, function(error, hours){
			hours.length.should.equal(2);

			hours[0].id.should.equal('MIG-80');
			hours[0].estimate.should.equal(14400);
			hours[0].spent.should.equal(10800);
			hours[0].remaining.should.equal(3600);

			hours[1].id.should.equal('MIG-80');
			hours[1].estimate.should.equal(14400);
			hours[1].spent.should.equal(10800);
			hours[1].remaining.should.equal(3600);

			done();
		});
	})

	if('should process multiple responses with promise', function(done){
		var multiples = [];

		multiples.push(singleItemResponse);
		multiples.push(singleItemResponse);

		jira.processHours(multiples)
			.them(function(hours) {
				hours.length.should.equal(2);

				hours[0].id.should.equal('MIG-80');
				hours[0].estimate.should.equal(14400);
				hours[0].spent.should.equal(10800);
				hours[0].remaining.should.equal(3600);

				hours[1].id.should.equal('MIG-80');
				hours[1].estimate.should.equal(14400);
				hours[1].spent.should.equal(10800);
				hours[1].remaining.should.equal(3600);
		})
			.fail(function(error){
				(error === null).should.be.true;
			})
			.finally(function(){ done(); });

	});

	// set up the Jira object
	beforeEach(function(){
		jira = createJiraObject();
		
	});		

	before(function(done){
		// test search response in outside file  
		fs.readFile('./tests/single-item-response.json', function(error, data){
			if(error) throw error;
			
			singleItemResponse = JSON.parse(data.toString());
			//console.log('search result = ' + singleItemResponse);
			done();
		});
	});	

});

describe('update item', function(){

	var jira,
		singleItemResponse;

	it('should be a function', function(){
		jira.updateIssue.should.be.a.function;
	});

	it('should handle nulls', function(){
		jira.updateIssue(0, undefined, function(error, success){
			(error === undefined).should.be.false;
			(success === undefined).should.be.true;
		});
	});

	it('should handle strings', function(done){
		var updateString = '{"fields":{"priority":"2"}}';

		jira.updateIssue(10250, updateString, function(error, success){
			(error === null).should.be.true;

			success.should.be.true;

			done();

		});
	});

	it('should handle string with promise', function(done){
		var updateString = '{"fields":{"priority":"2"}}';

		jira.updateIssue(10250, updateString)
			.then(function(result) {
				success.should.be.true;
			})
			.fail(function(error){
				(error === undefined).should.be.false;
			})
			.finally(function(){ done(); });

	});

	it('should handle object', function(done)
	{

		var updateObject = {fields:{priority:"2"}};

		jira.updateIssue(10250, updateObject, function(error, success){
			console.log('error = ' + error);
			(error === null).should.be.true;

			success.should.be.true;

			done();
		});
		
	});

	it('should handle object with promise', function(done){ 
		var updateObject = {fields:{priority:"2"}};

		jira.updateIssue(10250, updateObject)
			.then(function(result){
				result.should.be.true;
			})
			.fail(function(error){
				(error === null).should.be.false;
			})
			.finally(function(){ done(); });

	});

	it('should handle 404', function()
	{
		var updateObject = {fields:{priority:"2"}};

		jira.updateIssue(404, updateObject, function(error, success){
			(error === null).should.be.false;
		});
	});

	it('should handle 404 with promise', function(done){
		var updateObject = {fields:{priority:"2"}};

		jira.updateIssue(404, updateObject)
			.then(function(result){
				(result === null).should.be.true;
			})
			.fail(function(error){
				(error === null).should.be.false;
			})
			.finally(function(){ done(); });

	});

	// set up the Jira object
	beforeEach(function(){
		jira = createJiraObject();

		nock('http://test.com:80')
			.put('/rest/api/2/issue/10250',{fields:{priority:"2"}})
			.reply(204, 'success')
			.put('/rest/api/2/issue/404',{fields:{priority:"2"}})
			.reply(404)
			.get('/rest/api/2/issue/500')
			.reply(500)
			//.log(console.log)
			;		
		
	});		

	before(function(done){
		// test search response in outside file  
		fs.readFile('./tests/single-item-response.json', function(error, data){
			if(error) throw error;
			
			singleItemResponse = JSON.parse(data.toString());
			//console.log('search result = ' + singleItemResponse);
			done();
		});
	});	
});

describe('notify', function(){

	var jira;

	it('should be a function', function(){
		jira.notify.should.be.a.function;
	});

	it('should error without issue id', function(done){
		jira.notify(null, 'test', 'test', [], 'awhere-rest',
			null, function(error, success){
				(error === null).should.be.false;
				(success === undefined).should.be.true;
				done();
			});
	});

	it('should error without issue id with promise', function(done){
		jira.notify(null, 'test', 'test',[], 'awhere-rest',
			null)
			.then(function(result){
				(result === null).should.be.true;
			})
			.fail(function(error){
				(error === null).should.be.false;
			})
			.finally(function(){ done(); });
	});

	it('should notify on call with single user', function(done){

		jira.notify('TP-14', 'test email',
			'this is a test email',['r'],'awhere-rest', null, 
			function(error, success){
				
				(error === null).should.be.true;
				success.should.be.true;

				done();
			});

	});

	it('should notify on call with single user with promise', function(done){
		jira.notify('TP-14', 'test email',
			'this is a test email',['r'],'awhere-rest', null)
			.then(function(result){
				result.should.be.true;
			})
			.fail(function(error){
				(error === null).should.be.true;
			})
			.finally(function(){ done(); });

	});

	it('should notify on a call with user array', function(done){
		jira.notify('TP-14', 'test email',
			'this is a test email', ['r','a','w','v'],
			['awhere-rest', 'tbush'], null,
			function(error, success){

				(error === null).should.be.true;
				success.should.be.true;

				done();

			});
	});

	it('should notify on a call with user array with promise', function(done){
		jira.notify('TP-14', 'test email',
			'this is a test email', ['r','a','w','v'],
			['awhere-rest', 'tbush'], null)
			.then(function(result){
				result.should.be.true;
			})
			.fail(function(error){
				(error === null).should.be.true;
			})
			.finally(function(){ done(); });

	});

	it('should notify on a call with user and group array', function(done){
		jira.notify('TP-14', 'test email',
			'this is a test email', ['r','v'],
			['awhere-rest', 'tbush'], ['admin', 'jira-developers'],
			function(error, success){

				(error === null).should.be.true;
				success.should.be.true;

				done();

			});
	});

	it('should notify on a call with RAWV', function(done){
		jira.notify('TP-14', 'test email',
			'this is a test email', ['r','a','w','v'], null, null,
			function(error, success){

				(error === null).should.be.true;
				success.should.be.true;

				done();

			});
	});

	it('should notify on a call with no email ', function(done){
		jira.notify('TP-14', 'test email',
			'this is a test email', null, null, null,
			function(error, success){

				(error === null).should.be.true;
				success.should.be.true;

				done();

			});
	});


	it('should support 404 response', function(done){
		jira.notify('404', 'test', 'test',[], 'test', 'test',
			function(error, success){

				(error === null).should.be.false;
				(success === undefined).should.be.true;

				done();
			});
	});

	it('should support 404 reponse with promise', function(done){
		jira.notify('404', 'test', 'test',[], 'test', 'test')
			.then(function(result){
				(result === undefined).should.be.true;
			})
			.fail(function(error){
				(error === null).should.be.false;
			})
			.finally(function(){ done(); });
	});

	// set up the Jira object
	beforeEach(function(){
		jira = createJiraObject();

		nock('http://test.com:80')
			.filteringRequestBody(/.*/, '*')
			.put('/rest/api/2/issue/TP-14/notify','*')
			.reply(204, 'success')
			.put('/rest/api/2/issue/404/notify','*')
			.reply(404)
			.get('/rest/api/2/issue/500/notify')
			.reply(500)
			//.log(console.log)
			;		
		
	});		

});