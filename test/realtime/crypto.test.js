'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var expect = chai.expect;
  var loadTestData = helper.loadTestData;
  var BufferUtils = Ably.Realtime.Platform.BufferUtils;
  var Crypto = Ably.Realtime.Platform.Crypto;
  var Message = Ably.Realtime.Message;
  var displayError = helper.displayError;
  var testResourcesPath = helper.testResourcesPath;
  var msgpack = typeof window == 'object' ? Ably.msgpack : require('@ably/msgpack-js');
  var testOnAllTransports = helper.testOnAllTransports;
  var closeAndFinish = helper.closeAndFinish;
  var whenPromiseSettles = helper.whenPromiseSettles;

  function attachChannels(channels, callback) {
    async.map(
      channels,
      function (channel, cb) {
        whenPromiseSettles(channel.attach(), cb);
      },
      callback
    );
  }

  function testMessageEquality(done, one, two) {
    try {
      helper.testMessageEquality(one, two);
    } catch (err) {
      done(err);
    }
  }

  function testEachFixture(done, filename, channelName, testsPerFixture, testPlaintextVariants, fixtureTest) {
    if (!Crypto) {
      done(new Error('Encryption not supported'));
      return;
    }

    loadTestData(testResourcesPath + filename, async function (err, testData) {
      if (err) {
        done(new Error('Unable to get test assets; err = ' + displayError(err)));
        return;
      }
      var realtime = helper.AblyRealtime();
      var key = BufferUtils.base64Decode(testData.key);
      var iv = BufferUtils.base64Decode(testData.iv);
      var channel = realtime.channels.get(channelName, { cipher: { key: key, iv: iv } });

      try {
        for (var i = 0; i < testData.items.length; i++) {
          var item = testData.items[i];

          /* read messages from test data and decode (ie remove any base64 encoding). */
          var createTestMessage = async function () {
            return await Message.fromEncoded(item.encoded);
          };

          var encryptedMessage = await Message.fromEncoded(item.encrypted);

          var runTest = function (testMessage) {
            /* reset channel cipher, to ensure it uses the given iv */
            channel.setOptions({ cipher: { key: key, iv: iv } });
            fixtureTest(channel.channelOptions, testMessage, encryptedMessage, item.msgpack);
          };

          // Run the test with the message’s data as-is.
          runTest(await createTestMessage());

          if (testPlaintextVariants) {
            var testMessage = await createTestMessage();
            if (BufferUtils.isBuffer(testMessage.data) && !(testMessage.data instanceof ArrayBuffer)) {
              // Now, check that we can also handle an ArrayBuffer plaintext.
              var testMessageWithArrayBufferData = await createTestMessage();
              testMessageWithArrayBufferData.data = BufferUtils.toArrayBuffer(testMessageWithArrayBufferData.data);
              runTest(testMessageWithArrayBufferData);
            }
          }
        }
      } catch (err) {
        closeAndFinish(done, realtime, err);
        return;
      }
      closeAndFinish(done, realtime);
    });
  }

  describe('realtime/crypto', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    /* generateRandomKey with an explicit keyLength */
    it('generateRandomKey0', function (done) {
      whenPromiseSettles(Crypto.generateRandomKey(64), function (err, key) {
        if (err) {
          done(err);
          return;
        }
        try {
          /* .length for a nodejs buffer, .byteLength for a browser ArrayBuffer */
          expect(key.length || key.byteLength).to.equal(8, 'generated key is the correct length');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    /* generateRandomKey with no keyLength should generate 256-bit keys */
    it('generateRandomKey1', function (done) {
      whenPromiseSettles(Crypto.generateRandomKey(), function (err, key) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(key.length || key.byteLength).to.equal(32, 'generated key is the default length');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('getDefaultParams_withResultOfGenerateRandomKey', function (done) {
      whenPromiseSettles(Crypto.generateRandomKey(), function (err, key) {
        if (err) {
          done(err);
        }
        var params = Crypto.getDefaultParams({ key: key });
        try {
          expect(params.key).to.equal(key);
          expect(params.algorithm).to.equal('aes', 'check default algorithm');
          expect(params.mode).to.equal('cbc', 'check default mode');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('getDefaultParams_ArrayBuffer_key', function (done) {
      whenPromiseSettles(Crypto.generateRandomKey(), function (err, key) {
        if (err) {
          done(err);
        }
        var arrayBufferKey = Ably.Realtime.Platform.BufferUtils.toArrayBuffer(key);
        var params = Crypto.getDefaultParams({ key: arrayBufferKey });
        try {
          expect(BufferUtils.areBuffersEqual(params.key, key)).to.equal(true);
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('getDefaultParams_base64_key', function (done) {
      whenPromiseSettles(Crypto.generateRandomKey(), function (err, key) {
        if (err) {
          done(err);
          return;
        }
        var b64key = Ably.Realtime.Platform.BufferUtils.base64Encode(key);
        var params = Crypto.getDefaultParams({ key: b64key });
        try {
          expect(BufferUtils.areBuffersEqual(params.key, key)).to.equal(true);
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('getDefaultParams_check_keylength', function (done) {
      whenPromiseSettles(Crypto.generateRandomKey(64), function (err, key) {
        if (err) {
          done(err);
          return;
        }
        try {
          Crypto.getDefaultParams({ key: key });
          done(new Error('expected getDefaultParams with a 64-bit key to throw an exception'));
        } catch (err) {
          done();
        }
      });
    });

    it('getDefaultParams_preserves_custom_algorithms', function (done) {
      whenPromiseSettles(Crypto.generateRandomKey(64), function (err, key) {
        if (err) {
          done(err);
          return;
        }
        try {
          var params = Crypto.getDefaultParams({ key: key, algorithm: 'foo', mode: 'bar' });
          expect(params.key).to.equal(key);
          expect(params.algorithm).to.equal('foo');
          expect(params.mode).to.equal('bar');
          expect(params.keyLength).to.equal(64);
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('encrypt_message_128', function (done) {
      testEachFixture(
        done,
        'crypto-data-128.json',
        'encrypt_message_128',
        2,
        true,
        function (channelOpts, testMessage, encryptedMessage) {
          /* encrypt plaintext message; encode() also to handle data that is not already string or buffer */
          Message.encode(testMessage, channelOpts, function () {
            /* compare */
            testMessageEquality(done, testMessage, encryptedMessage);
          });
        }
      );
    });

    it('encrypt_message_256', function (done) {
      testEachFixture(
        done,
        'crypto-data-256.json',
        'encrypt_message_256',
        2,
        true,
        function (channelOpts, testMessage, encryptedMessage) {
          /* encrypt plaintext message; encode() also to handle data that is not already string or buffer */
          Message.encode(testMessage, channelOpts, function () {
            /* compare */
            testMessageEquality(done, testMessage, encryptedMessage);
          });
        }
      );
    });

    it('decrypt_message_128', function (done) {
      testEachFixture(
        done,
        'crypto-data-128.json',
        'decrypt_message_128',
        2,
        false,
        async function (channelOpts, testMessage, encryptedMessage) {
          /* decrypt encrypted message; decode() also to handle data that is not string or buffer */
          await Message.decode(encryptedMessage, channelOpts);
          /* compare */
          testMessageEquality(done, testMessage, encryptedMessage);
        }
      );
    });

    it('decrypt_message_256', function (done) {
      testEachFixture(
        done,
        'crypto-data-256.json',
        'decrypt_message_256',
        2,
        false,
        async function (channelOpts, testMessage, encryptedMessage) {
          /* decrypt encrypted message; decode() also to handle data that is not string or buffer */
          await Message.decode(encryptedMessage, channelOpts);
          /* compare */
          testMessageEquality(done, testMessage, encryptedMessage);
        }
      );
    });

    it('fromEncoded_cipher_options', function (done) {
      if (!Crypto) {
        done(new Error('Encryption not supported'));
        return;
      }

      loadTestData(testResourcesPath + 'crypto-data-256.json', async function (err, testData) {
        if (err) {
          done(err);
          return;
        }
        var key = BufferUtils.base64Decode(testData.key);
        var iv = BufferUtils.base64Decode(testData.iv);

        for (var i = 0; i < testData.items.length; i++) {
          var item = testData.items[i];
          var testMessage = await Message.fromEncoded(item.encoded);
          var decryptedMessage = await Message.fromEncoded(item.encrypted, { cipher: { key: key, iv: iv } });
          testMessageEquality(done, testMessage, decryptedMessage);
        }
        done();
      });
    });

    /* Tests require encryption and binary transport */
    if (typeof ArrayBuffer !== 'undefined') {
      it('msgpack_128', function (done) {
        testEachFixture(
          done,
          'crypto-data-128.json',
          'msgpack_128',
          2,
          false,
          function (channelOpts, testMessage, encryptedMessage, msgpackEncodedMessage) {
            Message.encode(testMessage, channelOpts, function () {
              var msgpackFromEncoded = msgpack.encode(testMessage);
              var msgpackFromEncrypted = msgpack.encode(encryptedMessage);
              var messageFromMsgpack = Message.fromValues(
                msgpack.decode(BufferUtils.base64Decode(msgpackEncodedMessage))
              );

              try {
                /* Mainly testing that we're correctly encoding the direct output from
                 * the platform's ICipher implementation into the msgpack binary type */
                expect(BufferUtils.areBuffersEqual(msgpackFromEncoded, msgpackFromEncrypted)).to.equal(
                  true,
                  'verify msgpack encodings of newly-encrypted and preencrypted messages identical using areBuffersEqual'
                );

                /* Can't compare msgpackFromEncoded with fixture data because can't
                 * assume key order in the msgpack serialisation. So test decoded instead */
                expect(messageFromMsgpack).to.deep.equal(encryptedMessage, 'verify msgpack fixture decodes correctly');
              } catch (err) {
                done(err);
              }
            });
          }
        );
      });

      it('msgpack_256', function (done) {
        testEachFixture(
          done,
          'crypto-data-256.json',
          'msgpack_256',
          2,
          false,
          function (channelOpts, testMessage, encryptedMessage, msgpackEncodedMessage) {
            Message.encode(testMessage, channelOpts, function () {
              var msgpackFromEncoded = msgpack.encode(testMessage);
              var msgpackFromEncrypted = msgpack.encode(encryptedMessage);
              var messageFromMsgpack = Message.fromValues(
                msgpack.decode(BufferUtils.base64Decode(msgpackEncodedMessage))
              );

              try {
                /* Mainly testing that we're correctly encoding the direct output from
                 * the platform's ICipher implementation into the msgpack binary type */
                expect(BufferUtils.areBuffersEqual(msgpackFromEncoded, msgpackFromEncrypted)).to.equal(
                  true,
                  'verify msgpack encodings of newly-encrypted and preencrypted messages identical using areBuffersEqual'
                );

                /* Can't compare msgpackFromEncoded with fixture data because can't
                 * assume key order in the msgpack serialisation. So test decoded instead */
                expect(messageFromMsgpack).to.deep.equal(encryptedMessage, 'verify msgpack fixture decodes correctly');
              } catch (err) {
                done(err);
              }
            });
          }
        );
      });
    }

    function single_send(done, realtimeOpts, keyLength) {
      if (!Crypto) {
        done(new Error('Encryption not supported'));
        return;
      }

      whenPromiseSettles(Crypto.generateRandomKey(keyLength), function (err, key) {
        if (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
        /* For single_send tests we test the 'shortcut' way of setting the cipher
         * in channels.get. No callback, but that's ok even for node which has
         * async iv generation since the publish is on an attach cb */
        var realtime = helper.AblyRealtime(realtimeOpts),
          channel = realtime.channels.get('single_send', { cipher: { key: key } }),
          messageText = 'Test message for single_send -	' + JSON.stringify(realtimeOpts);

        whenPromiseSettles(channel.attach(), function (err) {
          if (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
          try {
            expect(channel.channelOptions.cipher.algorithm).to.equal('aes');
            expect(channel.channelOptions.cipher.keyLength).to.equal(keyLength);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
          channel.subscribe('event0', function (msg) {
            try {
              expect(msg.data == messageText).to.be.ok;
            } catch (err) {
              closeAndFinish(done, realtime, err);
              return;
            }
            closeAndFinish(done, realtime);
          });
          channel.publish('event0', messageText);
        });
      });
    }

    /**
     * Publish and subscribe, various transport, 128 and 256-bit
     */
    testOnAllTransports('single_send_128', function (realtimeOpts) {
      return function (done) {
        single_send(done, realtimeOpts, 128);
      };
    });

    testOnAllTransports('single_send_256', function (realtimeOpts) {
      return function (done) {
        single_send(done, realtimeOpts, 256);
      };
    });

    function _multiple_send(done, text, iterations, delay) {
      if (!Crypto) {
        done(new Error('Encryption not supported'));
        return;
      }

      var realtime = helper.AblyRealtime({ useBinaryProtocol: !text });
      var channelName = 'multiple_send_' + (text ? 'text_' : 'binary_') + iterations + '_' + delay,
        channel = realtime.channels.get(channelName),
        messageText = 'Test message (' + channelName + ')';

      whenPromiseSettles(Crypto.generateRandomKey(128), function (err, key) {
        channel.setOptions({ cipher: { key: key } });
        try {
          expect(channel.channelOptions.cipher.algorithm).to.equal('aes');
          expect(channel.channelOptions.cipher.keyLength).to.equal(128);
        } catch (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
        function sendAll(sendCb) {
          var sent = 0;
          var sendOnce = function () {
            channel.publish('event0', messageText);
            if (++sent == iterations) {
              sendCb(null);
              return;
            }
            setTimeout(sendOnce, delay);
          };
          sendOnce();
        }
        function recvAll(recvCb) {
          var received = 0;
          channel.subscribe('event0', function (msg) {
            expect(msg.data == messageText).to.be.ok;
            if (++received == iterations) recvCb(null);
          });
        }

        channel.attach(function (err) {
          if (err) {
            closeAndFinish(done, realtime, err);
            return;
          }
          async.parallel([sendAll, recvAll], function (err) {
            closeAndFinish(done, realtime, err);
          });
        });
      });
    }

    it('multiple_send_binary_2_200', function (done) {
      _multiple_send(done, false, 2, 200);
    });

    it('multiple_send_text_2_200', function (done) {
      _multiple_send(done, true, 2, 200);
    });

    it('multiple_send_binary_20_100', function (done) {
      _multiple_send(done, false, 20, 100);
    });

    it('multiple_send_text_20_100', function (done) {
      _multiple_send(done, true, 20, 100);
    });

    function _single_send_separate_realtimes(done, txOpts, rxOpts) {
      if (!Crypto) {
        done(new Error('Encryption not supported'));
        return;
      }

      var txRealtime = helper.AblyRealtime(txOpts),
        rxRealtime = helper.AblyRealtime(rxOpts),
        channelName = 'single_send_separate_realtimes';
      var messageText = 'Test message for single_send_separate_realtimes',
        txChannel = txRealtime.channels.get(channelName),
        rxChannel = rxRealtime.channels.get(channelName);

      whenPromiseSettles(Crypto.generateRandomKey(), function (err, key) {
        if (err) {
          closeAndFinish(done, realtime, err);
          return;
        }
        async.parallel(
          [
            function (cb) {
              txChannel.setOptions({ cipher: { key: key } });
              cb();
            },
            function (cb) {
              rxChannel.setOptions({ cipher: { key: key } });
              cb();
            },
          ],
          function (err) {
            if (err) {
              closeAndFinish(done, [txRealtime, rxRealtime], err);
              return;
            }
            try {
              expect(txChannel.channelOptions.cipher.algorithm).to.equal('aes');
              expect(rxChannel.channelOptions.cipher.algorithm).to.equal('aes');
            } catch (err) {
              closeAndFinish(done, [txRealtime, rxRealtime], err);
            }

            attachChannels([txChannel, rxChannel], function () {
              rxChannel.subscribe('event0', function (msg) {
                try {
                  expect(msg.data == messageText).to.be.ok;
                } catch (err) {
                  closeAndFinish(done, [txRealtime, rxRealtime], err);
                  return;
                }
                closeAndFinish(done, [txRealtime, rxRealtime]);
              });
              txChannel.publish('event0', messageText);
            });
          }
        );
      });
    }

    /**
     * Connect twice to the service, using the binary protocol
     * and the text protocol. Publish an encrypted message on that channel using
     * the default cipher params and verify correct receipt.
     */
    it('single_send_binary_text', function (done) {
      _single_send_separate_realtimes(done, { useBinaryProtocol: true }, { useBinaryProtocol: false });
    });

    /**
     * Connect twice to the service, using the text protocol and the
     * binary protocol. Publish an encrypted message on that channel using
     * the default cipher params and verify correct receipt.
     */
    it('single_send_text_binary', function (done) {
      _single_send_separate_realtimes(done, { useBinaryProtocol: false }, { useBinaryProtocol: true });
    });

    it('publish_immediately', function (done) {
      if (!Crypto) {
        done(new Error('Encryption not supported'));
        return;
      }

      var txRealtime = helper.AblyRealtime(),
        rxRealtime = helper.AblyRealtime(),
        channelName = 'publish_immediately',
        messageText = 'Test message';

      whenPromiseSettles(Crypto.generateRandomKey(), function (err, key) {
        if (err) {
          closeAndFinish(done, [txRealtime, rxRealtime], err);
          return;
        }
        var rxChannel = rxRealtime.channels.get(channelName, { cipher: { key: key } });
        rxChannel.subscribe(
          'event0',
          function (msg) {
            try {
              expect(msg.data == messageText).to.be.ok;
            } catch (err) {
              closeAndFinish(done, [txRealtime, rxRealtime], err);
              return;
            }
            closeAndFinish(done, [txRealtime, rxRealtime]);
          },
          function () {
            var txChannel = txRealtime.channels.get(channelName, { cipher: { key: key } });
            txChannel.publish('event0', messageText);
          }
        );
      });
    });

    /**
     * Connect twice to the service, using different cipher keys.
     * Publish an encrypted message on that channel using
     * the default cipher params and verify that the decrypt failure
     * is noticed as bad recovered plaintext.
     */
    it('single_send_key_mismatch', function (done) {
      if (!Crypto) {
        done(new Error('Encryption not supported'));
        return;
      }

      var txRealtime = helper.AblyRealtime();
      var rxRealtime = helper.AblyRealtime();
      var channelName = 'single_send_key_mismatch',
        txChannel = txRealtime.channels.get(channelName),
        messageText = 'Test message (' + channelName + ')',
        rxChannel = rxRealtime.channels.get(channelName);

      async.parallel(
        [
          function (cb) {
            whenPromiseSettles(Crypto.generateRandomKey(), cb);
          },
          function (cb) {
            whenPromiseSettles(Crypto.generateRandomKey(), cb);
          },
          function (cb) {
            attachChannels([txChannel, rxChannel], cb);
          },
        ],
        function (err, res) {
          if (err) {
            closeAndFinish(done, [txRealtime, rxRealtime], err);
            return;
          }
          var txKey = res[0],
            rxKey = res[1];

          async.parallel(
            [
              function (cb) {
                txChannel.setOptions({ cipher: { key: txKey } });
                cb();
              },
              function (cb) {
                rxChannel.setOptions({ cipher: { key: rxKey } });
                cb();
              },
            ],
            function () {
              rxChannel.subscribe('event0', function (msg) {
                try {
                  expect(msg.data != messageText).to.be.ok;
                } catch (err) {
                  closeAndFinish(done, [txRealtime, rxRealtime], err);
                  return;
                }
                closeAndFinish(done, [txRealtime, rxRealtime]);
              });
              txChannel.publish('event0', messageText);
            }
          );
        }
      );
    });

    /**
     * Connect twice to the service, one with and one without encryption.
     * Publish an unencrypted message and verify that the receiving connection
     * does not attempt to decrypt it.
     */
    it('single_send_unencrypted', function (done) {
      if (!Crypto) {
        done(new Error('Encryption not supported'));
        return;
      }

      var txRealtime = helper.AblyRealtime();
      var rxRealtime = helper.AblyRealtime();
      var channelName = 'single_send_unencrypted',
        txChannel = txRealtime.channels.get(channelName),
        messageText = 'Test message (' + channelName + ')',
        rxChannel = rxRealtime.channels.get(channelName);

      attachChannels([txChannel, rxChannel], function (err) {
        if (err) {
          closeAndFinish(done, [txRealtime, rxRealtime], err);
          return;
        }
        whenPromiseSettles(Crypto.generateRandomKey(), function (err, rxKey) {
          if (err) {
            closeAndFinish(done, [txRealtime, rxRealtime], err);
            return;
          }
          rxChannel.setOptions({ cipher: { key: rxKey } });
          rxChannel.subscribe('event0', function (msg) {
            try {
              expect(msg.data == messageText).to.be.ok;
            } catch (err) {
              closeAndFinish(done, [txRealtime, rxRealtime], err);
              return;
            }
            closeAndFinish(done, [txRealtime, rxRealtime]);
          });
          txChannel.publish('event0', messageText);
        });
      });
    });

    /**
     * Connect twice to the service, one with and one without encryption.
     * Publish an encrypted message and verify that the receiving connection
     * handles the encrypted message correctly.
     */
    it('single_send_encrypted_unhandled', function (done) {
      if (!Crypto) {
        done(new Error('Encryption not supported'));
        return;
      }

      var txRealtime = helper.AblyRealtime();
      var rxRealtime = helper.AblyRealtime();
      var channelName = 'single_send_encrypted_unhandled',
        txChannel = txRealtime.channels.get(channelName),
        messageText = 'Test message (' + channelName + ')',
        rxChannel = rxRealtime.channels.get(channelName);

      attachChannels([txChannel, rxChannel], function (err) {
        if (err) {
          closeAndFinish(done, [txRealtime, rxRealtime], err);
          return;
        }
        whenPromiseSettles(Crypto.generateRandomKey(), function (err, txKey) {
          if (err) {
            closeAndFinish(done, [txRealtime, rxRealtime], err);
            return;
          }
          txChannel.setOptions({ cipher: { key: txKey } });
          rxChannel.subscribe('event0', function (msg) {
            try {
              expect(msg.encoding.indexOf('cipher') > -1).to.be.ok;
            } catch (err) {
              closeAndFinish(done, [txRealtime, rxRealtime], err);
              return;
            }
            closeAndFinish(done, [txRealtime, rxRealtime]);
          });
          txChannel.publish('event0', messageText);
        });
      });
    });

    /**
     * Check Channel.setOptions updates CipherParams correctly:
     * - publish a message using a key, verifying correct receipt;
     * - publish with an updated key on the tx connection and verify that it is not decrypted by the rx connection;
     * - publish with an updated key on the rx connection and verify connect receipt
     */
    it('set_cipher_params0', function (done) {
      if (!Crypto) {
        done(new Error('Encryption not supported'));
        return;
      }

      var txRealtime = helper.AblyRealtime();
      var rxRealtime = helper.AblyRealtime();
      var channelName = 'set_cipher_params',
        txChannel = txRealtime.channels.get(channelName),
        messageText = 'Test message (' + channelName + ')',
        rxChannel = rxRealtime.channels.get(channelName),
        firstKey,
        secondKey;

      var waitAttach = function (cb) {
        attachChannels([txChannel, rxChannel], cb);
      };
      var setInitialOptions = function (cb) {
        whenPromiseSettles(Crypto.generateRandomKey(), function (err, key) {
          if (err) {
            closeAndFinish(done, [txRealtime, rxRealtime], err);
            return;
          }
          firstKey = key;
          async.parallel(
            [
              function (innercb) {
                rxChannel.setOptions({ cipher: { key: key } });
                innercb();
              },
              function (innercb) {
                txChannel.setOptions({ cipher: { key: key } });
                innercb();
              },
            ],
            cb
          );
        });
      };

      var sendFirstMessage = function (cb) {
        var handler = function (msg) {
          expect(msg.data == messageText, 'Message data not expected value').to.be.ok;
          rxChannel.unsubscribe('event0', handler);
          cb(null);
        };
        rxChannel.subscribe('event0', handler);
        txChannel.publish('event0', messageText);
      };

      var createSecondKey = function (cb) {
        whenPromiseSettles(Crypto.generateRandomKey(), function (err, key) {
          if (err) {
            closeAndFinish(done, [txRealtime, rxRealtime], err);
            return;
          }
          secondKey = key;
          async.parallel(
            [
              function (innercb) {
                rxChannel.setOptions({ cipher: null });
                innercb();
              },
              function (innercb) {
                txChannel.setOptions({ cipher: { key: key } });
                innercb();
              },
            ],
            cb
          );
        });
      };

      var sendSecondMessage = function (cb) {
        var handler = function (msg) {
          expect(msg.encoding.indexOf('cipher') > -1, 'Message does not have cipher transform').to.be.ok;
          rxChannel.unsubscribe('event1', handler);
          cb(null);
        };
        rxChannel.subscribe('event1', handler);
        txChannel.publish('event1', messageText);
      };

      var setSecondKey = function (cb) {
        rxChannel.setOptions({ cipher: { key: secondKey } });
        cb();
      };

      var sendThirdMessage = function (cb) {
        var handler = function (msg) {
          expect(msg.data == messageText, 'Message data not expected (third message)').to.be.ok;
          rxChannel.unsubscribe('event2', handler);
          cb(null);
        };
        rxChannel.subscribe('event2', handler);
        txChannel.publish('event2', messageText);
      };

      async.series(
        [
          waitAttach,
          setInitialOptions,
          sendFirstMessage,
          createSecondKey,
          sendSecondMessage,
          setSecondKey,
          sendThirdMessage,
        ],
        function (err) {
          closeAndFinish(done, [txRealtime, rxRealtime], err);
        }
      );
    });
  });
});
