#!/usr/bin/env node
/*jshint esversion: 6*/

var config = {
    apiToken: '7b0a357e6ffac7198b961aa0dbeadf92',
    outputFile: 'C:\\Dev\\SRC\\erwin_Reporting\\report.csv',
    ws_id: 2070626
};

var togglOptions = {
    user_agent: 'erwin Reporting - Consulting team',
    workspace_id: config.ws_id,
    order_field: 'date' //,
    // since:'2018-04-01'
};

var csvOptions = {
    fields: [
        { value: 'id', label: 'TimeEntry_Id' },
        { value: 'description', label: 'TimeEntry_Description' },
        { value: 'start', label: 'TimeEntry_Start' },
        { value: 'end', label: 'TimeEntry_End' },
        { value: 'updated', label: 'TimeEntry_LastUpdate' },
        { value: 'dur', label: 'TimeEntry_Duration' },
        { value: 'tags', label: 'TimeEntry_Tags' },
        { value: 'tid', label: 'Task_Id' },
        { value: 'task', label: 'Task_Name' },
        { value: 'pid', label: 'Project_Id' },
        { value: 'project', label: 'Project_Name' },
        { value: 'uid', label: 'User_Id' },
        { value: 'user', label: 'User' },
        { value: 'client', label: 'Client' },
        { value: 'billable', label: 'Amount' },
        { value: 'is_billable', label: 'Billable' }
    ]
};

var TogglClient = require('toggl-api');
var Json2csv = require('json2csv').Parser;
var fs = require('fs');

var toggl = new TogglClient({ apiToken: config.apiToken });
var parser = new Json2csv(csvOptions);
var file = fs.createWriteStream(config.outputFile);

toggl.detailedReport(togglOptions, function (err, report) {
    if (err !== null) {
        console.error(err.message);
    }
    var csv = parser.parse(report.data);
    file.write(csv);
});