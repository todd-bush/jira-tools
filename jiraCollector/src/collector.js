var nconf = require('nconf'),
	__ = require('underscore'),
	http = require('http'),
	https = require('https'),
	jiraApi = require('./jira-rest-api').JiraRestApi;

function createJiraObject()
{
	var protocol = nconf.get('jira-port')==443?'https':'http';

	var jira = new jiraApi(protocol,
		nconf.get('jira-host'),
		nconf.get('jira-port'),
		nconf.get('jira-user'),
		nconf.get('jira-pass'),
		nconf.get('jira-api-version'),
		nconf.get('jira-verbose'),
		nconf.get('jira-strict-ssl')
		);
	return jira;
}

function pullJiraData(callback)
{
	console.log('in pullJiraData');

	var jira = createJiraObject();
	
	jira.findIssue('MIG-14',function(error, issue){
		if(error) throw error;

		///.log(issue);
		console.log(issue.fields.issuetype.name);
	});

}

function doSearch(callback)
{
	console.log('in search');

	var jira = createJiraObject();
	
	jira.search('project=MIG and sprint = "i0"', function(error, issues){
		if (error) throw error;

		//console.log(issues);		

		jira.processSearchResults(issues, function(error, processed){
			//console.log('processed ' + processed[0]);

			jira.processHours(processed, function(error, hours){
				//console.log('hours = \n' + hours);
				console.log('id=' + hours[0].id);
			});
			
		});

	});	
}

function updateIssue(callback)
{
	var jira = createJiraObject();

	var updateObject = '{"update":{"priority":[{"set":{"id":"1"}}]}}';

	jira.updateIssue('TP-21', updateObject, function(error, success){

		if(error) throw error;

		console.log('updateIssue = ' + success);

	});
}

function notify(callback)
{

	console.log('in notify');

	var jira = createJiraObject();
	jira.notify('TP-14', 'Test Message',
		'Testing, Testing', ['r','a'], 
		null, null, 
		function(error, success){
			if(error) throw error;

			console.log('notify = ' + success);
		});
}


function die() { process.kill(); }

// load config
nconf.env()
	.file({file:'conf.json'});

nconf.load();

// main, of sorts
pullJiraData();

//doSearch(function(){});

//updateIssue(die);

notify(die);