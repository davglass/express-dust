# Dust Template Engine for ExpressJS

This express module allows you to use [Dust](http://akdubya.github.com/dustjs/) as your template engine.

## Install

    npm install express-dust

## Async Rendering

Express does not support async rendering, so with this module installed you will only be able
to use Dust as your renderer in your app. We have to override the render/partial methods on the 
prototype of the ServerResponse object in order to support the async nature of Dust.

If the callback is ommitted to render/partial the response will automatically be passed to res.send
when the Dust operation is completed.

## Usage

There is a simple example included in this repo under `./examples`.


### server.js

    var app = require('express').createServer();
    var dust = require('../lib/dust');
    
    //Sets up Global Variables to be used in all views
    dust.makeBase({
        copy: '&copy; 2011 Nobody LLC'
    });

    app.get('/', function(req, res, next) {
        res.render('index', {
            //Local Variables for this view
            title: 'This is a test'
        });
    });

    app.listen(8000);


### views/layouts/main.dust

    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{+title}My Site{/title}</title>
    </head>
    <body>
    {>"partials/nav"/}

    {+html_body}
    {/html_body}
    <div id="footer">{+copy}Copyright{/copy}</footer>
    </body>
    </html>

### views/index.dust

    {>"layouts/main"/}

    {<title}Foo {title}{/title}


    {<html_body}
        <p>This is my index.dust main body {title}</p>
    {/html_body}

    {<copy}{copy|s}{/copy}

