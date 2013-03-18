/* Admin */
var Admin = require('../../../../../admin/nodejs/admin').Admin;

var adminOpts = {};
var username = process.env.ADMIN_USERNAME || 'admin';
var password = process.env.ADMIN_PASSWORD || 'admin';
var hostname = process.env.GOSSIP_ADDRESS || 'localhost';
var uri = 'http://' + username + ':' + password + '@' + hostname + ':8090';
var admin = new Admin(uri, adminOpts);

exports.clearTest = function(testVars, callback) {
	admin.apps.id(testVars.testAppId).get(function(err, app) {
		if(err) {
			callback(err);
			return;
		}
		app.del(function(err) {
			if(err) {
				callback(err);
				return;
			}
			admin.accounts.id(testVars.testAcctId).get(function(err, acct) {
				if(err) {
					callback(err);
					return;
				}
				acct.del(function(err) {
					if(err) {
						callback(err);
						return;
					}
					callback();
				});
			});
		});
	});
};
