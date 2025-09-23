'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, Helper, async, chai) {
  const expect = chai.expect;

  describe('rest/message-operations', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      console.log('Setting up app');
      const helper = Helper.forHook(this);
      helper.setupApp(function (err) {
        if (err) {
          console.log('Error setting up app: ', err);
          done(err);
        }
        console.log('App setup complete');
        done();
      });
    });

    /**
     * Test getMessage functionality
     *
     * @spec RSL11
     */
    it('Should retrieve a message by serial', async function () {
      const helper = this.test.helper;
      const rest = helper.AblyRest({});
      const channel = rest.channels.get('mutable:updatesanddeletes_get');

      // First publish a message
      await channel.publish('test-message', { value: 'original' });

      // Wait for the message to appear in history
      let originalMessage;
      await helper.waitFor(async () => {
        const page = await channel.history();
        if (page.items.length > 0) {
          originalMessage = page.items[0];
          return true;
        }
        return false;
      }, 10000);

      expect(originalMessage.serial, 'Message has a serial').to.be.ok;

      // Now retrieve the message by serial
      const retrievedMessage = await channel.getMessage(originalMessage.serial);
      expect(retrievedMessage.serial).to.equal(originalMessage.serial);
      expect(retrievedMessage.name).to.equal('test-message');
      expect(retrievedMessage.data).to.deep.equal({ value: 'original' });
    });

    /**
     * Test getMessage with Message object
     *
     * @spec RSL11a1
     */
    it('Should retrieve a message by passing a Message object', async function () {
      const helper = this.test.helper;
      const rest = helper.AblyRest({});
      const channel = rest.channels.get('mutable:updatesanddeletes_get_obj');

      // First publish a message
      await channel.publish('test-message-obj', { value: 'original' });

      // Wait for the message to appear in history
      let originalMessage;
      await helper.waitFor(async () => {
        const page = await channel.history();
        if (page.items.length > 0) {
          originalMessage = page.items[0];
          return true;
        }
        return false;
      }, 10000);

      // Retrieve the message by passing the Message object
      const retrievedMessage = await channel.getMessage(originalMessage);
      expect(retrievedMessage.serial).to.equal(originalMessage.serial);
      expect(retrievedMessage.name).to.equal('test-message-obj');
    });

    /**
     * Test updateMessage with operation metadata
     *
     * @spec RSL12
     */
    it('Should update a message (with operation metadata)', async function () {
      const helper = this.test.helper;
      const rest = helper.AblyRest({});
      const channel = rest.channels.get('mutable:updatesanddeletes_update_meta');

      // First publish a message
      await channel.publish('original-message', { value: 'original' });

      // Wait for the message to appear in history
      let originalMessage;
      await helper.waitFor(async () => {
        const page = await channel.history();
        if (page.items.length > 0) {
          originalMessage = page.items[0];
          return true;
        }
        return false;
      }, 10000);

      // Update the message with operation metadata
      const updateMessage = {
        serial: originalMessage.serial,
        data: { value: 'updated with metadata' },
      };

      const operation = {
        clientId: 'updater-client',
        description: 'Test update operation',
        metadata: { reason: 'testing' },
      };

      const updatedMessage = await channel.updateMessage(updateMessage, operation);
      expect(updatedMessage.serial).to.equal(originalMessage.serial);
      expect(updatedMessage.data).to.deep.equal({ value: 'updated with metadata' });

      // Wait for the update to be the latest message
      let latestMessage;
      await helper.waitFor(async () => {
        latestMessage = await channel.getMessage(originalMessage.serial);
        return latestMessage.data.value === 'updated with metadata';
      }, 10000);
      expect(latestMessage.serial).to.equal(originalMessage.serial);
      expect(latestMessage.version?.serial > originalMessage.serial).to.be.ok;
      expect(latestMessage.version?.timestamp).to.be.greaterThan(originalMessage.timestamp);
      expect(latestMessage.version?.clientId).to.equal('updater-client');
      expect(latestMessage.version?.description).to.equal('Test update operation');
      expect(latestMessage.version?.metadata).to.deep.equal({ reason: 'testing' });
      expect(latestMessage.action).to.equal('message.update');
      // patch semantics: data was updated, name should be unchanged
      expect(latestMessage.data).to.deep.equal({ value: 'updated with metadata' });
      expect(latestMessage.name).to.equal('original-message');
    });

    /**
     * Test deleteMessage with operation metadata
     *
     * @spec RSL13a
     */
    it('Should delete a message (with operation metadata)', async function () {
      const helper = this.test.helper;
      const rest = helper.AblyRest({});
      const channel = rest.channels.get('mutable:updatesanddeletes_delete_meta');

      // First publish a message
      await channel.publish('message-to-delete', { value: 'will be deleted' });

      // Wait for the message to appear in history
      let originalMessage;
      await helper.waitFor(async () => {
        const page = await channel.history();
        if (page.items.length > 0) {
          originalMessage = page.items[0];
          return true;
        }
        return false;
      }, 10000);

      // Delete the message with operation metadata
      const operation = {
        clientId: 'deleter-client',
        description: 'Test delete operation',
        metadata: { reason: 'inappropriate content' },
      };

      const deletion = Object.assign({}, originalMessage, { data: {} });

      const deletedMessage = await channel.deleteMessage(deletion, operation);
      expect(deletedMessage.serial).to.equal(originalMessage.serial);
      expect(deletedMessage.action).to.equal('message.delete');

      // Wait for the delete to be the latest message
      let latestMessage;
      await helper.waitFor(async () => {
        latestMessage = await channel.getMessage(originalMessage.serial);
        return latestMessage.action === 'message.delete';
      }, 10000);
      expect(latestMessage.serial).to.equal(originalMessage.serial);
      expect(latestMessage.data).to.deep.equal({});
      // expect name to be still present if not explicitly erased
      expect(latestMessage.name).to.equal('message-to-delete');
      expect(latestMessage.version?.serial > originalMessage.serial).to.be.ok;
      expect(latestMessage.version?.timestamp).to.be.greaterThan(originalMessage.timestamp);
      expect(latestMessage.version?.clientId).to.equal('deleter-client');
      expect(latestMessage.version?.description).to.equal('Test delete operation');
      expect(latestMessage.version?.metadata).to.deep.equal({ reason: 'inappropriate content' });
      expect(latestMessage.action).to.equal('message.delete');
    });

    /**
     * Test getMessageVersions functionality
     *
     * @spec RSL14
     */
    it('Should retrieve all versions of a message', async function () {
      const helper = this.test.helper;
      const rest = helper.AblyRest({});
      const channel = rest.channels.get('mutable:updatesanddeletes_versions');

      // First publish a message
      await channel.publish('versioned-message', { value: 'version-1' });

      // Wait for the message to appear in history
      let originalMessage;
      await helper.waitFor(async () => {
        const page = await channel.history();
        if (page.items.length > 0) {
          originalMessage = page.items[0];
          return true;
        }
        return false;
      }, 10000);

      // Update the message
      const updateMessage = {
        serial: originalMessage.serial,
        data: { value: 'version-2' },
      };
      await channel.updateMessage(updateMessage);

      // Get all versions
      let items;
      await helper.waitFor(async () => {
        const versionsPage = await channel.getMessageVersions(originalMessage.serial);
        items = versionsPage.items;
        return items.length >= 2;
      }, 10000);
      expect(items.length).to.be.at.least(2);

      // Check that we have both the original and the update
      const actions = items.map((m) => m.action);
      expect(actions).to.include('message.create');
      expect(actions).to.include('message.update');
    });

    /**
     * Test error handling for getMessage without serial
     */
    it('Should error when getMessage called without serial', async function () {
      const helper = this.test.helper;
      const rest = helper.AblyRest({});
      const channel = rest.channels.get('mutable:updatesanddeletes_error');

      try {
        await channel.getMessage({});
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.have.property('code', 40003);
      }
    });

    /**
     * Test error handling for updateMessage without serial
     */
    it('Should error when updateMessage called without serial', async function () {
      const helper = this.test.helper;
      const rest = helper.AblyRest({});
      const channel = rest.channels.get('mutable:updatesanddeletes_error');

      try {
        await channel.updateMessage({ data: 'test' });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.have.property('code', 40003);
      }
    });

    /**
     * Test error handling for deleteMessage without serial
     */
    it('Should error when deleteMessage called without serial', async function () {
      const helper = this.test.helper;
      const rest = helper.AblyRest({});
      const channel = rest.channels.get('mutable:updatesanddeletes_error');

      try {
        await channel.deleteMessage({});
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.have.property('code', 40003);
      }
    });

    /**
     * Test error handling for getMessageVersions without serial
     */
    it('Should error when getMessageVersions called without serial', async function () {
      const helper = this.test.helper;
      const rest = helper.AblyRest({});
      const channel = rest.channels.get('mutable:updatesanddeletes_error');

      try {
        await channel.getMessageVersions({});
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.have.property('code', 40003);
      }
    });
  });
});
