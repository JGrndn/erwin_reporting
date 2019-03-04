(function () {
  'use strict';
  
  const userAgent = 'erwin api test';
  const url = 'https://www.toggl.com/api/v8';
  const reportUrl = 'https://toggl.com/reports/api/v2/details';
  const wId = 2070626;
  var initParam = {
    output : './output/',
    logs : './logs/application.log',
    verbose : 'debug'
  }
  

  const argv = require('minimist')(process.argv.slice(2), {
    string: [ 'user', 'output', 'logs', 'verbose' ],
    boolean: [ 'version', 'help' ],
    alias: { h:'help', V:'version', u:'user', o:'output', L:'logs', v:'verbose' },
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
  var wait = () => new Promise(resolve => setTimeout(resolve, 10)); // toggl api limitation is set to 1 request per second

  function getProjectUsers(json){
    log.info('Get users for all projects');
    let userIdsByProjectId = {};
    let promises = json.projects.reduce((chain, p) => chain
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
      since : year+'-01-01',
      until : year+'-12-31',
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
    let output = {
      clients : json.clients.map(o => {
        o.code = o.name.substring(0, o.name.indexOf(' '));
        o.name = o.name.substring(o.name.indexOf(' ') + 1);
        return o;
      }),
      users : json.users,
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
        o.project = o.project ? o.project.substring(o.pnb.length).trim() : '';
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
  
  function exportData(json){
    const fs = require('fs');
    const Json2csvTransform = require('json2csv').Transform;
    // export clients
    log.info('Set output folder : ' + argv.output);
    const fields = [
      { value: 'id', label: 'Client_Id' },
      { value: 'name', label: 'Client_Name' },
      { value: 'code', label: 'Client_Code' }
    ]
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
  .then(json => {
//    json.projects = json.projects.filter((v, i) => i<3);
    return getProjectUsers(json);
  })
  .then(json => getDetailedReport(json))
  .then(json => transformData(json))
  .then(json => {
    log.info('write to csv');
  })
  .catch(err => {
    if (err.statusCode === 429){
      returnCode = 1;
      log.fatal('Too many requests at a time. Please add delay between each request.');
    }
  });

  return returnCode;

}());