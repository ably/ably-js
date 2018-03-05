/// <reference path="./ably.d.ts" />

function Realtime(clientOptions) {
  this.clientOptions = clientOptions;

  /**
   * Example function to expose clientOptions
   */
  this.getClientOptions = function() {
    return JSON.stringify(this.clientOptions);
  }
}

var Types = {
  ClientOptions: function(obj) { return (obj); }
};

module.exports = { Types: Types, Realtime: Realtime };
