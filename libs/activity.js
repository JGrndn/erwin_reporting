/*jshint esversion: 6*/


function getActivityData(log, getAll){
    'use strict';
    var fs = require('fs'),
        TogglClient = require('toggl-api'),
        Json2csv = require('json2csv').Parser,
        toggl, csv, output, file, csvFields;

    var config = {
            apiToken: '7b0a357e6ffac7198b961aa0dbeadf92',
            outputFolder: './output',
            ws_id: 2070626
        }, togglOptions = {
            user_agent: 'erwin Reporting - Consulting team',
            workspace_id: config.ws_id,
            order_field: 'date'
        };

    if (getAll){
        togglOptions.since = '2017-01-01';
    }

    csvFields = {
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
            { value: 'pnb', label: 'Project_Number' },
            { value: 'uid', label: 'User_Id' },
            { value: 'user', label: 'User' },
            { value: 'client', label: 'Client' },
            { value: 'billable', label: 'Amount' },
            { value: 'is_billable', label: 'Billable' }
        ]
    };

    toggl = new TogglClient({ apiToken: config.apiToken });
    csv = new Json2csv(csvFields);

    log.debug('Check if output folder exists...');
    if (!fs.existsSync(config.outputFolder)) {
        log.info('Folder does not exist. Creating folder...');
        fs.mkdirSync(config.outputFolder);
    }

    file = fs.createWriteStream(config.outputFolder + '/activity.csv');
    log.info('Get data from Toggl...');
    toggl.detailedReport(togglOptions, function (err, report) {
        if (err !== null) {
            log.error(err.message);
        }
        log.info('Data retrieved.');
        log.debug('Get project number from name...');
        var json, data = report.data;
        json = data.map(function(currentValue, index, arr){
            currentValue.pnb = currentValue.project.split(' ')[0];
            return currentValue;
        });
        log.info('Parse JSON to CSV...');
        var output = csv.parse(json);
        log.info('Write CSV file...');
        file.write(output);
        log.info('CSV file written.');
    });
}

module.exports = {
    getActivityData
};