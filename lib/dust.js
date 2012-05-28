var fs     = require('fs'),
    fsPath = require('path'),
    http   = require('http'),

    dust = require('dustjs-linkedin'),

    baseContext = dust.makeBase({});

var mix = function(s, d) {
    for (var i in s) {
        d[i] = s[i]
    }
    return d;
}

module.exports = {
    filters : dust.filters
  , makeBase: function(obj) {
        baseContext = dust.makeBase(mix(baseContext.global, obj));
        return baseContext;
    }
}


// Loads the named template the first time it's used (it will be cached for
// later calls).
function getView(name, callback) {
    name = name.replace(/\.dust$/, '') + '.dust';
    fs.readFile(fsPath.join(process.cwd(), 'views', name), 'utf8', callback);
}

dust.onLoad = getView;

// This needs a setter TODO
// Disable whitespace compression.
dust.optimizers.format = function (context, node) {
    return node;
};

// Duckpunch Express's res.render() method to use Dust. This is necessary
// because Express doesn't support async template engines by default.
http.ServerResponse.prototype.render = function (view, options, callback) {
    var res = this;

    // Support callback as second arg.
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    callback || (callback = function (err, html) {
        if (err) { res.req.next(err); return; }
        res.send(html);
    });

    options = options ? baseContext.push(options) : baseContext;

    if (res.locals) {
        options = options.push(res.locals);
    }

    // Dynamic helper support
    var dynamicHelpers = res.app.dynamicViewHelpers;
    if (false !== baseContext.get('dynamicHelpers')) {
        // cache
        if (!res.__dynamicHelpers) {
            res.__dynamicHelpers = {};
            for (var key in dynamicHelpers) {
                res.__dynamicHelpers[key] = dynamicHelpers[key].call(
                    res.app,
                    res.req,
                    res);
            }
        }
        baseContext = baseContext.push(res.__dynamicHelpers);
    }

    // TODO: Figure out a good way to catch parser errors. Currently Dust's
    // parser just throws them instead of passing them to the callback.
    // See https://github.com/akdubya/dustjs/issues#issue/12
    if (res.app.settings.env === 'development') {
        dust.cache = {}; // Reflect template changes without a restart.

        getView(view, function (err, content) {
            if (err) { res.req.next(err); return; }
            dust.renderSource(content, options, callback);
        });
    } else {
        dust.render(view, options, callback);
    }
};

http.ServerResponse.prototype.partial = function (view, options, callback) {
    var res = this,
        req = this.req,
        header = '',
        ct = req.headers['content-type'],
        setHeader = false;

    // Support callback as second arg.
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }
    if (!callback) {
        setHeader = true;
    }

    var part = fsPath.join(process.cwd(), 'views', 'partials', view + '.dust');

    callback || (callback = function (err, html) {
        if (err) { res.req.next(err); return; }
        res.send(html);
    });
    fsPath.exists(part, function(x) {
        if (x) {
            res.render('partials/' + view, function(err, html) {
                if (err) {
                    callback(err);
                    return;
                }
                var data = html;
                if (setHeader) {
                    if (ct && ct.indexOf(';') > 0) {
                        ct = ct.split(';')[0];
                    }
                    switch (ct) {
                        case 'application/json':
                        case 'text/javascript':
                            header = '.json';
                            data = { html: html };
                            break;
                        case 'text/plain':
                            header = '.txt';
                            break;
                        default:
                            header = '.html';
                            break;
                    }
                    res.contentType(header);
                }
                callback(null, data);
            });
            
        } else {
            callback({ error: 'Not Found' });
        }
    });
    
}
