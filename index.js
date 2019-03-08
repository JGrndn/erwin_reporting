(function () {
  'use strict';
  
  const userAgent = 'erwin api test';
  const url = 'https://www.toggl.com/api/v8';
  const reportUrl = 'https://toggl.com/reports/api/v2/details';
  const wId = 2070626;
  var initParam = {
    output : './output/',
    logs : './logs/application.log',
    verbose : 'debug',
    time : '20'
  }
  

  const argv = require('minimist')(process.argv.slice(2), {
    string: [ 'user', 'output', 'logs', 'verbose', 'time' ],
    boolean: [ 'version', 'help' ],
    alias: { h:'help', V:'version', u:'user', o:'output', L:'logs', v:'verbose', t:'time' },
    default: initParam,
    '--': true,
  });

  function outputUsage() {
    let o = [];
    o.push('** erwin Professional Services Report manager **');
    o.push('Usage : ');
    o.push('--user|-u TOKEN   \t\tMandatory. Set the user token used to retrieve data.');
    o.push('--output|-o PATH  \t\tOptional. Set the path of the files which will be generated. Default value is "' + initParam.output + '"');
    o.push('--logs|-L PATH    \t\tOptional. Set the path of the logs files which will be generated. Default value is "' + initParam.logs + '"');
    o.push('--time|-t VALUE   \t\tOptional. Set the waiting time between each request. Default value is ' + initParam.time + ' ms');
    o.push('--verbose|v LEVEL \t\tOptional. Set the level for logs [debug, info, warn, error, fatal]. Default value is"' + initParam.verbose + '"');
    o.push('--version|V       \t\tOptional. Display the version number.');
    console.info(o.join('\n'));
  }

  if (argv.help || !argv.user){
    outputUsage();
    return;
  }

  if (argv.version){
    const pjson = require('./package.json');
    console.info(pjson.version);
    return;
  }

  const opts = {
    auth: {
      user: argv.user,
      pass: 'api_token'
    },
    headers : {
      'Content-Type': 'application/json'
    },
    json: true
  };

  const log4js = require('log4js');
  log4js.configure({
    appenders: {
        out: { type: 'stdout' },
        file: { type: 'file', filename: argv.logs }
    },
    categories: {
        default: { appenders: ['out', 'file'], level: argv.verbose }
    }
  });
  const log = log4js.getLogger();

  const rp = require('request-promise-native');
  const waitingTime = parseInt(argv.time) === NaN ? 20 : parseInt(argv.time);
  const wait = () => new Promise(resolve => setTimeout(resolve, waitingTime)); // toggl api limitation is set to 1 request per second

  function getProjectUsers(json){
    log.info('Get users for all projects');
    let userIdsByProjectId = {};
    let promises = json.projects.reduce((chain, p) => 
      chain
      .then(() => {
        log.debug('Get users for project <' + p.name + '> (' + p.id + ')');
        return rp.get(url + '/projects/' + p.id + '/project_users', opts).then(data => {
          if (Array.isArray(data)) userIdsByProjectId[p.id] = data.map(u=> u.uid)
        })
      })
    , Promise.resolve(wait));
    return promises.then(() => {
      json.usersByProject = userIdsByProjectId;
      return json;
    });
  }

  const year = new Date().getFullYear();
  function getDetailedReport(json, pageNb){
    let qs = {
      user_agent: userAgent,
      workspace_id: wId,
      order_field: 'date',
      page: (pageNb) ? pageNb : 1,
      since : year + '-01-01',
      until : year + '-12-31',
    }
    let options = Object.assign({}, opts);
    options = Object.assign(options, {qs : qs});
    if(qs.page === 1){
      log.info('Get report details');
    }
    return Promise.resolve().then(() => {
      log.debug('Get report details page <' + qs.page + '>');
      return rp.get(reportUrl, options).then(res => {
        if (!json.timeEntries || !Array.isArray(json.timeEntries)){
          json.timeEntries = [];
        }
        json.timeEntries = json.timeEntries.concat(res.data);
        if (res.total_count > res.per_page && res.data.length === res.per_page) {
          return getDetailedReport(json, qs.page+1);
        }
        return json;
      });
    });
  }

  function transformData(json){
    log.info('Transform data');
    // for some reason some users associated to a project do not exist in the workspace
    Object.keys(json.usersByProject).map(p => {
      json.usersByProject[p] = json.usersByProject[p].filter(uid => json.users.find(x => x.id === uid));
    });
    let output = {
      clients : json.clients.map(o => {
        o.code = o.name.substring(0, o.name.indexOf(' '));
        o.name = o.name.substring(o.name.indexOf(' ') + 1);
        return o;
      }),
      users : json.users.map(o => {
        o.fullname = o.fullname.toUpperCase().trim();
        return o;
      }),
      projects : json.projects.map(o => {
        o.pcode = o.name.split(' ')[0]; // get project number
        o.name = o.name ? o.name.substring(o.pcode.length).trim() : '';
        o.estimated_hours = o.estimated_hours ? o.estimated_hours : 0;
        o.estimated_days = o.estimated_hours ? o.estimated_hours / 8 : 0;
        o.userIds = json.usersByProject[o.id];
        return o;
      }),
      tasks : json.tasks.map(o => {
        o.duration_hours = o.estimated_seconds / (60 * 60); // duration in hours
        o.duration = o.duration_hours / 8; // duration in days
        return o;
      }),
      timeEntries : json.timeEntries.map(o => {
        o.isFromToggl = true,
        o.pcode = (o.project) ? o.project.split(' ')[0] : ''; // get project number
        o.project = o.project ? o.project.substring(o.pcode.length).trim() : '';
        o.durh = o.dur / (1000 * 60 * 60); // duration in hours
        o.dur = o.durh / 8; // duration in days
        o.start = o.start.substr(0, 10) + ' ' + o.start.substr(11,8); // get UTC date
        o.end = o.end.substr(0, 10) + ' ' + o.end.substr(11, 8); // get UTC date
        o.updated = o.updated.substr(0, 10) + ' ' + o.updated.substr(11, 8); // get UTC date
        o.user = o.user.trim();
        o.name = o.user + '_' + o.id;
        o.usertype = 'Social';
        o.user = o.user.toUpperCase();
        return o;
      })
    }
    return output;
  }

  const json2csv = require('json2csv').parse;
  function createCsv(json, options){
    return new Promise(resolve => {
      let csv = json2csv(json, options);
      resolve(csv);
    });
  }

  function exportData(json){
    const fs = require('fs');
    const writeToOutput = function(data, output){
      fs.createWriteStream(output).write(data);
    };
    // export clients
    log.info('Set output folder : ' + argv.output);
    let fields = [
      { value: 'id', label: 'Client_Id' },
      { value: 'name', label: 'Client_Name' },
      { value: 'code', label: 'Client_Code' }
    ];
    createCsv(json.clients, {fields}).then(csv => writeToOutput(csv, argv.output + '/clients.csv'));
    fields = [
      { value: 'id', label: 'Project_Id' },
      { value: 'name', label: 'Project_Name' },
      { value: 'pcode', label: 'Project_Number' },
      { value: 'cid', label: 'Client_Id' },
      { value: 'estimated_hours', label: 'Project_Duration_Hours' },
      { value: 'estimated_days', label: 'Project_Duration' },
      { value: 'billable', label:'Project_Billable' },
      { value: 'active', label:'Project_Active' },
      { value: 'userIds', label:'Project_Users' }
    ]
    createCsv(json.projects, {fields, unwind: 'userIds'}).then(csv => writeToOutput(csv, argv.output + '/projects.csv'));
    fields = [
      { value: 'id', label: 'Task_Id' },
      { value: 'name', label: 'Task_Name' },
      { value: 'pid', label: 'Project_Id' },
      { value: 'active', label:'Task_Active' },
      { value: 'estimated_seconds', label:'Task_Duration_Seconds' },
      { value:'duration_hours', label:'Task_Duration_Hours'},
      { value:'duration', label:'Task_Duration'}
    ];
    createCsv(json.tasks, {fields}).then(csv => writeToOutput(csv, argv.output + '/tasks.csv'));
    fields = [
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
      { value: 'isFromToggl', label: 'TimeEntry_IsFromToggl'},
      { value: 'tid', label: 'Task_Id' },
      { value: 'task', label: 'Task_Name' },
      { value: 'pid', label: 'Project_Id' },
      { value: 'project', label: 'Project_Name' },
      { value: 'pcode', label: 'Project_Number' },
      { value: 'uid', label: 'User_Id' },
      { value: 'user', label: 'User' },
      { value: 'usertype', label: 'User_Type' },
      { value: 'client', label: 'Client' }
    ];
    createCsv(json.timeEntries, {fields}).then(csv => writeToOutput(csv, argv.output + '/timeentries.csv'));
    fields = [
      { value: 'id', label: 'User_Id' },
      { value: 'email', label: 'User_Email' },
      { value: 'fullname', label: 'User_Name' }
    ];
    createCsv(json.users, {fields}).then(csv => writeToOutput(csv, argv.output + '/users.csv'));
  }

  var returnCode = 0;
  Promise.all([
    rp.get(url + '/workspaces/' + wId + '/clients', opts), // get workspace clients
    rp.get(url + '/workspaces/' + wId + '/users', opts), // get workspace users
    rp.get(url + '/workspaces/' + wId + '/projects?active=both', opts), // get workspace projects (active & archive)
    rp.get(url + '/workspaces/' + wId + '/tasks', opts), // get workspace tasks
  ])
  .then(res => {
    return {
      clients : res[0],
      users : res[1],
      projects : res[2],
      tasks : res[3] 
    };
  })
  .then(json => getProjectUsers(json))
  .then(json => getDetailedReport(json))
  .then(json => transformData(json))
  .then(json => exportData(json))
  .catch(err => {
    if (err.statusCode === 429){
      log.fatal('Too many requests at a time. Please add delay between each request.');
    } else {
      log.fatal(err);
    }
    returnCode = 1;
  });

  return returnCode;

}());