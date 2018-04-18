/*jshint esversion: 6*/
var fs = require('fs'),
    TogglClient = require('toggl-api'),
    Json2csv = require('json2csv').Parser,
    output, file, json = [],
    config = {
        apiToken: '7b0a357e6ffac7198b961aa0dbeadf92',
        outputFolder: './output/',
        outputFile: 'activity.csv',
        ws_id: 2070626
    },
    togglOptions = {
        user_agent: 'erwin Reporting - Consulting team',
        workspace_id: config.ws_id,
        order_field: 'date',
        page: 1
    },
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
    },
    toggl = new TogglClient({ apiToken: config.apiToken }),
    csv = new Json2csv(csvFields),
    log;


function getActivityData(_log, getAll) {
    'use strict';
    log = _log;

    log.debug('Check if output folder exists...');
    if (!fs.existsSync(config.outputFolder)) {
        log.info('Folder does not exist. Creating folder...');
        fs.mkdirSync(config.outputFolder);
    }
    if (getAll) {
        togglOptions.since = '2018-01-01';
    }
    log.info('Get data from Toggl...');
    execQuery(function(){
        log.info('Parsing JSON to CSV...');
        var output = csv.parse(json);
        log.info('JSON parsed !');
        file = fs.createWriteStream(config.outputFolder + config.outputFile);
        log.info('Writing CSV file...');
        file.write(output);
        log.info('CSV file written !');
    });
}

function execQuery(callback) {
    var opt = JSON.parse(JSON.stringify(togglOptions)); // clone object as detailedReport method remove the 'page' attribute from togglOptions
    toggl.detailedReport(opt, function (err, report) {
        if (err !== null) {
            log.error('Error : ' + err.message);
            return;
        } else {
            log.info('Data retrieved (page ' + togglOptions.page + ')');
            log.debug('Get project number from name and calculate duration...');
            var data = report.data.map(function (currentValue, index, arr) {
                currentValue.pnb = (currentValue.project) ? currentValue.project.split(' ')[0] : '';
                currentValue.dur = currentValue.dur / (1000 * 60 * 60);
                return currentValue;
            });
            json = json.concat(data);
            if (report.total_count > report.per_page && report.data.length === report.per_page) {
                togglOptions.page++;
                execQuery(callback);
            } else {
                callback();
            }
        }
    });
}


module.exports = {
    getActivityData
};