#! /usr/bin/env node
/*jshint esversion: 6*/

(function () {
    'use strict';
    var log4js = require('log4js'),
        argv = require('minimist')(process.argv.slice(2), {
            string: ['activity'],
            boolean:false,
            alias: { a: 'activity', e: 'expense' }
        }),
        log, options;

    log4js.configure({
        appenders: {
            out: { type: 'stdout' },
            file: { type: 'file', filename: 'logs/application.log' }
        },
        categories: {
            default: { appenders: ['out', 'file'], level: 'debug' }
        }
    });
    log = log4js.getLogger();

    function outputUsage() {
        var o = [];
        o.push('** erwin Professional Services Report manager **\n');
        o.push('Usage : \n');
        o.push('-activity|--a [all]\t\tGet activity report data\n');
        //o.push('-expense|--e\t\tGet expenses report data\n');
        console.info(o.join(''));
    }

    function checkInternet(callback) {
        require('dns').lookup('google.com', function (err) {
            if (err && err.code == 'ENOTFOUND') {
                log.error('Check the internet connection before launching the application.');
            } else {
                callback();
            }
        });
    }

    if (argv.activity === undefined && argv.exepense === undefined){
        outputUsage();
    }

    if (argv.activity !== null && argv.activity !== undefined) {
        checkInternet(function () {
            var all = argv.activity === 'all';
            require('./libs/activity').getActivityData(log, all);
        });
    }
    if (argv.expense !== null && argv.expense !== undefined) {

    }
}());