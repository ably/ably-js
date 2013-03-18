var quiet = false;

exports.quiet = function(beQuiet) {
  quiet = beQuiet;
};

exports.log = function(message) {
  if (!quiet) console.log(message);
};

exports.info = function(message) {
  if (!quiet) console.info(message);
};

exports.warn = function(message) {
  if (!quiet) console.warn(message);
};

exports.error = function(message) {
  console.error(message);
};