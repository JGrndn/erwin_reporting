(function () {
  'use strict';

  var defaultOutput = '';

  var argv = require('minimist')(process.argv.slice(2), {
    string: [ 'user', 'output' ],
    boolean: [ 'version', 'help' ],
    alias: { h:'help', v:'version', u:'user', o:'output' },
    default: {output: defaultOutput},
    '--': true,
  });

  function outputUsage() {
    var o = [];
    o.push('** erwin Professional Services Report manager **');
    o.push('Usage : ');
    o.push('--user|-u TOKEN \t\tMandatory. Set the user token used to retrieve data.');
    o.push('--output|-o PATH\t\tOptional. Set the path of the files which will be generated. Default value is "' + defaultOutput + '"');
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
    auth : argv.u + ':api_token',
    headers : {
      'Content-Type': 'application/json'
    }
  };
  var config = {
    outputFolder: (argv.o) ? argv.o : defaultOutput,
    ws_id: 2070626
  };

  var https = require('https');

  
  function apiRequest(path, callback){
    var url = 'https://www.toggl.com/api/v8' + path;
    https.get(url, opts, (response) => {
      if (response.statusCode !== 200){
        log.error('ko');
      } else {
        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          callback(JSON.parse(data));
        });
      }
    });
  }

  var output = {
    projects: {},
    timeEntries: [],
    users: {},
    clients: {}
  };

  function getProjects(callback){
    var url = '/workspaces/'+config.ws_id+'/projects?active=both';
    apiRequest(url, callback);
  }

  function getTasks(pId, callback){
    var url = '/projects/' + pId + '/tasks';
    apiRequest(url, callback);
  }

  function getClient(cId, callback){
    var url = '/clients/' + cId;
    apiRequest(url, callback);
  }

  function getTimeEntries(callback){

  }

  function getProjectUsers(pId, callback){
    var url = '/projects/' + pId + '/project_users';
    request(url, callback);
  }


  getProjects(function(projects){
    output.projects = projects;
    // get tasks and users
    let countT = 0;
    let countC = 0;
    let countU = O;
    for (var i = 0; i<projects.length; i+=1){
      // get tasks
      getTasks(projects[i].id, function(task){
        output.tasks[i] = task;
        countT += 1;
        if (countT === projects.length){
          writeTasks();
        }
      });
      // get clients
      if (projects[i].cid != 0){
        getClient(projects[i].cid, function(client){
          output.clients[client.id] = client;
          countC += 1;
          if (countC === projects.length){
            writeClients();
          }
        });
      } else {
        countC += 1;
        if (countC === projects.length){
          writeClients();
        }
      }
      // get users
      getProjectUsers(projects[i].id, function(users){

      });
    }
    writeProjects();
  });

  getTimeEntries(function(data){

  });

}());