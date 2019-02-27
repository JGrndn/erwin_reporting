(function () {
  'use strict';

  var config = {
    outputFolder: './output/',
    ws_id: 2070626
  };
  var https = require('https');
  var log4js = require('log4js');
  log4js.configure({
    appenders: {
        out: { type: 'stdout' },
        file: { type: 'file', filename: 'logs/application.log', keepFileExt: true }
    },
    categories: {
        default: { appenders: ['out', 'file'], level: 'debug' }
    }
  });
  var log = log4js.getLogger();

  function getTogglOptions(obj){
    var opts = {
      json : true,
      auth : '7b0a357e6ffac7198b961aa0dbeadf92:api_token',
      headers : {
        'Content-Type': 'application/json'
      }
    };
    for(var p in obj){
      if (obj.hasOwnProperty(p)){
        opts[p] = obj[p];
      }
    }
    return opts;
  }

  function receiveData(response, callback){
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
  }

  function getProjects(callback){
    var url = 'https://www.toggl.com/api/v8/workspaces/'+config.ws_id+'/projects?active=both';
    var opts = getTogglOptions({active:'both'});
    https.get(url, opts, (res) => {
      receiveData(res, callback);
    });
  }


  var projects, tasks, timeentries, users;
  getProjects(function(data){
    projects = data;
    // get tasks and users
  });


}());