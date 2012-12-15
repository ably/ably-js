var Type = require('./thrift').Type;

var TStringTransport = exports.TStringTransport = function(recv_buf, flushCallback) {
    this.send_buf = '';
    this.recv_buf = recv_buf || '';
    this.flushCallback = flushCallback;
};

TStringTransport.receiver = function(callback) {
  return function(data) {
    callback(new TStringTransport(data));
  };
};

TStringTransport.prototype = {

    flush: function() { this.flushCallback(this.send_buf);},

    isOpen: function() {
        return true;
    },

    open: function() {},

    close: function() {},

    read: function(len) {
        return this.recv_buf;
    },

    readAll: function() {
        return this.recv_buf;
    },

    write: function(buf) {
        this.send_buf = buf;
    },

    getSendBuffer: function() {
        return this.send_buf;
    }
};

var TJSONProtocol = exports.TJSONProtocol = function(transport) {
    this.transport = transport;
    this.reset();
};

var RType = {};
RType.tf = Type.BOOL;
RType.i8 = Type.BYTE;
RType.i16 = Type.I16;
RType.i32 = Type.I32;
RType.i64 = Type.I64;
RType.dbl = Type.DOUBLE;
RType.rec = Type.STRUCT;
RType.str = Type.STRING;
RType.map = Type.MAP;
RType.lst = Type.LIST;
RType.set = Type.SET;

var SType = {};
SType[Type.BOOL] = 'tf';
SType[Type.BYTE] = 'i8';
SType[Type.I16] = 'i16';
SType[Type.I32] = 'i32';
SType[Type.I64] = 'i64';
SType[Type.DOUBLE] = 'dbl';
SType[Type.STRUCT] = 'rec';
SType[Type.STRING] = 'str';
SType[Type.MAP] = 'map';
SType[Type.LIST] = 'lst';
SType[Type.SET] = 'set';

var getValueFromScope = function(scope) {
  var listvalue = scope.listvalue;
  return listvalue ? listvalue.shift() : scope.value;
};

var getScopeFromScope = function(scope) {
  var listvalue = scope.listvalue;
  if(listvalue)
    scope = {value:listvalue.shift()};
  return scope;
};

TJSONProtocol.prototype = {

    reset: function() {
      this.elementStack = [];
    },

    flush: function() {
      this.transport.flush();
    },

    //Write functions
    writeMessageBegin: function(name, messageType, seqid) {
      throw new Error("TJSONProtocol: Message not supported");
    },

    writeMessageEnd: function() {
    },

    writeStructBegin: function(name) {
      var container = {};
      this.elementStack.unshift(container);
    },

    writeStructEnd: function() {
      var container = this.elementStack.shift();
      if(this.elementStack.length == 0)
        this.transport.write(JSON.stringify(container));
      else
        this.elementStack[0].value.push(container);
    },

    writeFieldBegin: function(name, fieldType, fieldId) {
      var field = {name:name, fieldType:SType[fieldType], fieldId:fieldId, value:[]};
      this.elementStack.unshift(field);
    },

    writeFieldEnd: function() {
      var field = this.elementStack.shift();
      var fieldValue = {};
      fieldValue[field.fieldType] = field.value[0];
      this.elementStack[0][field.fieldId] = fieldValue;
    },

    writeFieldStop: function() {
        //na
    },

    writeMapBegin: function(keyType, valType, size) {
      var map = {value:[
        SType[keyType],
        SType[valType],
        size
      ]};
      this.elementStack.unshift(map);
    },

    writeMapEnd: function() {
      var map = this.elementStack.shift();
      this.elementStack[0].value.push(map.value);
    },

    writeListBegin: function(elemType, size) {
      var list = {value:[
        SType[elemType],
        size
      ]};
      this.elementStack.unshift(list);
    },

    writeListEnd: function() {
      var list = this.elementStack.shift();
      this.elementStack[0].value.push(list.value);
    },

    writeSetBegin: function(elemType, size) {
      var set = {name:name, value:[
        SType[elemType],
        size
      ]};
      this.elementStack.unshift(set);
    },

    writeSetEnd: function() {
      var set = this.elementStack.shift();
      this.elementStack[0].value.push(set.value);
    },

    writeBool: function(value) {
      this.elementStack[0].value.push(value ? 1 : 0);
    },

    writeByte: function(i8) {
      this.elementStack[0].value.push(i8);
    },

    writeI16: function(i16) {
      this.elementStack[0].value.push(i16);
    },

    writeI32: function(i32) {
      this.elementStack[0].value.push(i32);
    },

    writeI64: function(i64) {
      this.elementStack[0].value.push(i64);
    },

    writeDouble: function(dbl) {
      this.elementStack[0].value.push(dbl);
    },

    writeString: function(str) {
      this.elementStack[0].value.push(str);
    },

    writeBinary: function(str) {
      this.elementStack[0].value.push(str);
    },

    // Reading functions
    readMessageBegin: function(name, messageType, seqid) {
      throw new Error("TJSONProtocol: Message not supported");
    },

    readMessageEnd: function() {
    },

    readStructBegin: function(name) {
      var value;
      if(this.elementStack.length == 0)
        value = JSON.parse(this.transport.readAll());
      else
        value = getValueFromScope(this.elementStack[0]);
        
      var fields = [];
      for(var field in value)
        fields.push(field);
      this.elementStack.unshift({
        fields:fields,
        value:value
      });
      return {
        fname:''
      }
    },

    readStructEnd: function() {
      this.elementStack.shift();
    },

    readFieldBegin: function() {
      var scope = this.elementStack[0];
      var scopeValue = getValueFromScope(scope);
      var fid = scope.fields.shift();
      if(!fid)
        return {fname:'', ftype:Type.STOP};

      var fieldValue = scopeValue[fid];
      for(var soleMember in fieldValue) {
        this.elementStack.unshift({value:fieldValue[soleMember]});
        return {
          fname:'',
          fid:Number(fid),
          ftype:RType[soleMember]
        };
      }
      /* there are no members, which is a format error */
      throw new Error("TJSONProtocol: parse error reading field value");
    },

    readFieldEnd: function() {
      this.elementStack.shift();
    },

    readMapBegin: function(keyType, valType, size) {
      var scope = this.elementStack[0];
      var value = getValueFromScope(scope);
      var result = {
        ktype:RType[value.shift()],
        vtype:RType[value.shift()],
        size:value.shift()
      };
      this.elementStack.unshift({listvalue:value});
      return result;
    },

    readMapEnd: function() {
      this.elementStack.shift();
    },

    readListBegin: function(elemType, size) {
      var scope = this.elementStack[0];
      var value = getValueFromScope(scope);
      var result = {
        etype:RType[value.shift()],
        size:value.shift()
      };
      this.elementStack.unshift({listvalue:value});
      return result;
    },

    readListEnd: function() {
      this.elementStack.shift();
    },

    readSetBegin: function(elemType, size) {
      var scope = this.elementStack[0];
      var value = getValueFromScope(scope);
      var result = {
        etype:RType[value.shift()],
        size:value.shift()
      };
      this.elementStack.unshift({listvalue:value});
      return result;
    },

    readSetEnd: function() {
      this.elementStack.shift();
    },

    readBool: function() {
      return !!getValueFromScope(this.elementStack[0]);
    },

    readByte: function() {
      return getValueFromScope(this.elementStack[0]);
    },

    readI16: function() {
      return getValueFromScope(this.elementStack[0]);
    },

    readI32: function(f) {
      return getValueFromScope(this.elementStack[0]);
    },

    readI64: function() {
      return getValueFromScope(this.elementStack[0]);
    },

    readDouble: function() {
      return getValueFromScope(this.elementStack[0]);
    },

    readString: function() {
      return getValueFromScope(this.elementStack[0]);
    },

    readBinary: function() {
      return getValueFromScope(this.elementStack[0]);
    }
};
