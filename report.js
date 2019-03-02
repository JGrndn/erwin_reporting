(function () {
  'use strict';

  var wId = 2070626;
  var outputFolder = './output/';


  var argv = require('minimist')(process.argv.slice(2), {
    string: [ 'user', 'output' ],
    boolean: [ 'version', 'help' ],
    alias: { h:'help', v:'version', u:'user', o:'output' },
    default: {output: outputFolder},
    '--': true,
  });

  function outputUsage() {
    var o = [];
    o.push('** erwin Professional Services Report manager **');
    o.push('Usage : ');
    o.push('--user|-u TOKEN \t\tMandatory. Set the user token used to retrieve data.');
    o.push('--output|-o PATH\t\tOptional. Set the path of the files which will be generated. Default value is "' + outputFolder + '"');
    o.push('--help|-h       \t\tOptional. Display usage.');
    o.push('--version|v     \t\tOptional. Display the version number.');
    console.info(o.join('\n'));
  }

  if (argv.h){
    outputUsage();
    return;
  }

  if (argv.v){
    var pjson = require('./package.json');
    console.info(pjson.version);
    return;
  }

  if (!argv.u){
    outputUsage();
    return;
  }  

  var opts = {
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


  var rp = require('request-promise');
  var url = 'https://www.toggl.com/api/v8';


  const wait = () => new Promise(resolve => setTimeout(resolve, 1000)); // toggl api limitation is set to 1 request / second

  function getProjectUsers(projects){
    //projects = projects.filter((v,i)=> i<3);
    var userIdsByProjectId = {};
    var promises = projects.reduce((chain, p) =>
      chain
      .then(() => rp.get(url + '/projects/' + p.id + '/project_users', opts).then(data => {
        if (Array.isArray(data)) userIdsByProjectId[p.id] = data.map(u=> u.uid)
      }))
    , Promise.resolve());
    return promises.then(() => userIdsByProjectId);
  }

  rp.get(url + '/workspaces/'+ wId + '/projects?active=both', opts)
  .then(projects => getProjectUsers(projects))
  .then(userIdsByProjectId => {
    console.log('hello');
  })
  .catch(function(err){
    console.error(err);
  });

  // promise to get projects & users
  // promise to get tasks
  // promise to get timeentries
  // promise to get clients

}());