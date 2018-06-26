/*jshint esversion: 6*/
'use strict';
var fs = require('fs'),
    TogglClient = require('toggl-api'),
    Json2csv = require('json2csv').Parser,
    output, file, json = [],
    config = {
        apiToken: '7b0a357e6ffac7198b961aa0dbeadf92',
        outputFolder: './output/',
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
            { value: 'name', label: 'TimeEntry_Name' },
            { value: 'id', label: 'TimeEntry_Id' },
            { value: 'description', label: 'TimeEntry_Description' },
            { value: 'start', label: 'TimeEntry_Start' },
            { value: 'end', label: 'TimeEntry_End' },
            { value: 'updated', label: 'TimeEntry_LastUpdate' },
            { value: 'dur', label: 'TimeEntry_DurationDays' },
            { value: 'durh', label: 'TimeEntry_DurationHours' },
            { value: 'tags', label: 'TimeEntry_Tags' },
            { value: 'billable', label: 'TimeEntry_Amount' },
            { value: 'is_billable', label: 'TimeEntry_Billable' },
            { value: 'tid', label: 'Task_Id' },
            { value: 'task', label: 'Task_Name' },
            { value: 'pid', label: 'Project_Id' },
            { value: 'project', label: 'Project_Name' },
            { value: 'pnb', label: 'Project_Number' },
            { value: 'uid', label: 'User_Id' },
            { value: 'user', label: 'User' },
            { value: 'usertype', label: 'User_Type' },
            { value: 'client', label: 'Client' }
        ]
    },
    toggl = new TogglClient({ apiToken: config.apiToken }),
    csv = new Json2csv(csvFields),
    log;



function getReportData(_log, getAll){
    log = _log;
    log.debug('Check if output folder exists...');
    if (!fs.existsSync(config.outputFolder)) {
        log.info('Folder does not exist. Creating folder...');
        fs.mkdirSync(config.outputFolder);
    }
    getClients(function(){
        getProjects(function(){
            getTasks(function(){
                getTimeEntries(getAll);
            });
        });
    });
}

function writeToFile(fileName, csvOpt, json){
    var csv = new Json2csv(csvOpt);
    log.info('Parsing JSON to CSV...');
    var output = csv.parse(json);
    log.info('JSON parsed !');
    file = fs.createWriteStream(config.outputFolder + fileName);
    log.info('Writing CSV file...');
    file.write(output);
    log.info('CSV file written !');
}

function getDetailedReport(callback) {
    var opt = JSON.parse(JSON.stringify(togglOptions)); // clone object as detailedReport method remove the 'page' attribute from togglOptions
    toggl.detailedReport(opt, function (err, report) {
        if (err !== null) {
            log.error('Error : ' + err.message);
            return;
        } else {
            log.info('Data retrieved (page ' + togglOptions.page + ')');
            log.debug('Get project number from name and calculate duration...');
            json = json.concat(report.data);
            if (report.total_count > report.per_page && report.data.length === report.per_page) {
                togglOptions.page++;
                getDetailedReport(callback);
            } else {
                callback();
            }
        }
    });
}

function getBeginningOfYear(){
    var d = new Date();
    return d.getFullYear()+'-01-01';
}

function getTimeEntries(sinceBeginningOfYear) {
    if (sinceBeginningOfYear) {
        togglOptions.since = getBeginningOfYear();
    }
    getDetailedReport(function () {
        var data = json.map(function (currentValue, index, arr) {
            currentValue.pnb = (currentValue.project) ? currentValue.project.split(' ')[0] : ''; // get project number
            currentValue.project = currentValue.project ? currentValue.project.substring(currentValue.pnb.length).trim() : '';
            currentValue.durh = currentValue.dur / (1000 * 60 * 60); // duration in hours
            currentValue.dur = currentValue.durh / 8; // duration in days
            currentValue.start = currentValue.start.substr(0, 10); // get UTC date
            currentValue.end = currentValue.end.substr(0, 10); // get UTC date
            currentValue.updated = currentValue.updated.substr(0, 10); // get UTC date
            currentValue.name = currentValue.user + '_' + currentValue.id;
            currentValue.usertype = 'Social';
            currentValue.user = currentValue.user.toUpperCase();
            return currentValue;
        });

        writeToFile('timeentries.csv', csvFields, data);
        log.info('End of retrieving Toggl data !');
    });
}

function getTasks(callback){
    toggl.getWorkspaceTasks(config.ws_id, function (err, json) {
        log.info('Retrieving list of tasks...');
        if (err !== null){
            log.error('Error : ' + err.message);
            return;
        } else {
            log.info('List of tasks retrieved !');
            var csvOpt = {
                fields:[
                    { value : 'id', label: 'Task_Id' },
                    { value: 'name', label: 'Task_Name'},
                    { value: 'pid', label: 'Project_Id'}
                ]
            };
            writeToFile('tasks.csv', csvOpt, json);
            if (callback) {
                return callback();
            }
        }
    });
}

function getProjects(callback){
    toggl.getWorkspaceProjects(config.ws_id, function(err, json){
        log.info('Retrieving list of projects...');
        if (err !== null) {
            log.error('Error : ' + err.message);
            return;
        } else {
            log.info('List of projects retrieved !');
            var csvOpt = {
                fields: [
                    { value: 'id', label: 'Project_Id' },
                    { value: 'name', label: 'Project_Name' },
                    { value: 'pnb', label: 'Project_Number' },
                    { value: 'cid', label: 'Client_Id' }
                ]
            };
            var data = json.map(function (currentValue, index, arr) {
                currentValue.pnb = currentValue.name.split(' ')[0]; // get project number
                currentValue.name = currentValue.name ? currentValue.name.substring(currentValue.pnb.length).trim() : '';
                return currentValue;
            });
            writeToFile('projects.csv', csvOpt, data);
            if (callback){
                return callback();
            }
        }
    });
}

function getClients(callback){
    toggl.getClients(function(err, json){
        log.info('Retrieving list of clients...');
        if (err !== null){
            log.error('Error : ' + err.message);
            return;
        } else {
            log.info('List of clients retrieved !');
            var csvOpt = {
                fields:[
                    { value: 'id', label: 'Client_Id' },
                    { value: 'name', label: 'Client_Name' },
                    { value: 'notes', label: 'Client_Description' },
                    { value: 'code', label: 'Client_Code' }
                ]
            };
            var data = json.map(function(currentValue, index, arr){
                currentValue.code = currentValue.name.substring(0, currentValue.name.indexOf(' '));
                currentValue.name = currentValue.name.substring(currentValue.name.indexOf(' ')+1);
                return currentValue;
            });
            writeToFile('clients.csv', csvOpt, data);
            if (callback){
                return callback();
            }
        }
    });
}

module.exports = {
    getReportData : getReportData
};