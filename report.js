(function () {
  'use strict';
  
  const userAgent = 'erwin api test';
  const url = 'https://www.toggl.com/api/v8';
  const reportUrl = 'https://toggl.com/reports/api/v2/details';
  const wId = 2070626;
  var outputFolder = './output/';


  const argv = require('minimist')(process.argv.slice(2), {
    string: [ 'user', 'output' ],
    boolean: [ 'version', 'help' ],
    alias: { h:'help', v:'version', u:'user', o:'output' },
    default: {output: outputFolder},
    '--': true,
  });

  function outputUsage() {
    let o = [];
    o.push('** erwin Professional Services Report manager **');
    o.push('Usage : ');
    o.push('--user|-u TOKEN \t\tMandatory. Set the user token used to retrieve data.');
    o.push('--output|-o PATH\t\tOptional. Set the path of the files which will be generated. Default value is "' + outputFolder + '"');
    o.push('--help|-h       \t\tOptional. Display usage.');
    o.push('--version|v     \t\tOptional. Display the version number.');
    console.info(o.join('\n'));
  }

  if (argv.h || !argv.u){
    outputUsage();
    return;
  }

  if (argv.v){
    const pjson = require('./package.json');
    console.info(pjson.version);
    return;
  }

  const opts = {
    auth: {
      user: argv.u,
      pass: 'api_token'
    },
    headers : {
      'Content-Type': 'application/json'
    },
    json: true
  };

  outputFolder = (argv.o) ? argv.o : outputFolder;

  const rp = require('request-promise-native');
  const wait = () => new Promise(resolve => setTimeout(resolve, 1000)); // toggl api limitation is set to 1 request per second

  function getProjectUsers(json){
    let userIdsByProjectId = {};
    let promises = json.projects.reduce((chain, p) => chain
      .then(() => rp.get(url + '/projects/' + p.id + '/project_users', opts).then(data => {
        if (Array.isArray(data)) userIdsByProjectId[p.id] = data.map(u=> u.uid)
      }))
    , Promise.resolve(wait));
    return promises.then(() => {
      json.usersByProject = userIdsByProjectId;
      return json;
    });
  }

  function getDetailedReport(json, pageNb){
    let qs = {
      user_agent: userAgent,
      workspace_id: wId,
      order_field: 'date',
      page: (pageNb) ? pageNb : 1,
      since : new Date().getFullYear()+'-01-01',
      until : new Date().getFullYear()+'-12-31',
    }
    let options = Object.assign({}, opts);
    options = Object.assign(options, {qs : qs});
    
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
  }

  Promise.all([
    rp.get(url + '/workspaces/' + wId + '/clients', opts), // get workspace clients
    rp.get(url + '/workspaces/' + wId + '/users', opts), // get workspace users
    rp.get(url + '/workspaces/' + wId + '/projects?active=both', opts), // get workspace projects (active & archive)
    rp.get(url + '/workspaces/' + wId + '/tasks', opts) // get workspace tasks
  ])
  .then(res => {
    return {
      clients : res[0],
      users : res[1],
      projects : res[2],
      tasks : res[3] 
    }
  })
  .then(json => {
    json.projects = json.projects.filter((v,i)=> i<3); // to be removed
    return getProjectUsers(json)
  })
  .then(json => getDetailedReport(json))
  .then(json => {
    // at this point, "json" contains all required data to be updated to csv file
    console.log('Time to transform data !');
  })
  .catch(err =>{
    console.error(err);
  });


}());