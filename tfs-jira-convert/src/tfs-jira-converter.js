var fs = require('fs'),
	csv = require('csv'),
	S = require('string'),
	util = require('util'),
	// parser = csv.parse(),
	// stringifier = csv.stringify()
	reader = fs.createReadStream('Test-Data-Dump.csv'),
	writer = fs.createWriteStream('out.csv');

// file positions
var ID = 0,
	SYMP = 10,
	STEPS = 11, 
	DESC=9;

var firstRow = true, CRLF = '\r\n';

var processRow = function(record) {
	// add the TFS-ID to the description
	var lnbr = (S(record[DESC]).isEmpty())?'':CRLF;
	record[DESC] = 'TFS-ID:' + 
		record[ID] +
		lnbr +  
		record[DESC];	

	// add symptom to description
	if(!S(record[SYMP]).isEmpty()) {			
		record[DESC] = S(record[DESC]).chompRight('"').s;	
		record[DESC] += '\r\nSymptom:\r\n' + record[SYMP] + '"';
	}

	// // add steps to description
	if(!S(record[STEPS]).isEmpty()) {
		record[DESC] = S(record[DESC]).chompRight('"').s;	
		record[DESC] += '\r\nSteps to Reproduce:\r\n' + record[STEPS] + '"';
	}

	return record;
};

// process
csv().from('Test-Data-Dump.csv')
	.transform(function(row){
		if(!firstRow)
		{
			row = processRow(row);	
			console.log(row[DESC]);			
		}

		firstRow = false;
		return row;
	})
	.to('out.csv');
