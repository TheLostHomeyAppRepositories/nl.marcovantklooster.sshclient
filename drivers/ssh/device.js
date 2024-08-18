'use strict';

const Homey = require('homey');
const { Device } = require('homey');
const SSH2 = require('node-ssh').NodeSSH;

module.exports = class sshDevice extends Device {

  // noinspection JSUnusedGlobalSymbols
  onInit() {
    // register listener for flow card triggers
    // const receiveResponseTrigger = new Homey.FlowCardTrigger('receiveResponse');
    this.receiveResponseTrigger = this.homey.flow.getDeviceTriggerCard('receiveResponse');
    /**
    receiveResponseTrigger
      .registerRunListener(() => {
        return Promise.resolve();
      })
      .register(); 
     */ 
    // const receiveResponseDeviceTrigger = new Homey.FlowCardTriggerDevice('receiveResponseDevice');
    this.receiveResponseDeviceTrigger = this.homey.flow.getDeviceTriggerCard('receiveResponseDevice');
    /**

    receiveResponseDeviceTrigger
    .registerRunListener(() => {
      return Promise.resolve();
    })
    .register();
    */

    this.receiveErrorTrigger = this.homey.flow.getDeviceTriggerCard('receiveError');
    this.receiveErrorDeviceTrigger = this.homey.flow.getDeviceTriggerCard('receiveErrorDevice');

    // const sshAction = new Homey.FlowCardAction('command');
    this.sshAction = this.homey.flow.getActionCard('command')
        // sshAction
      // .register()
      .registerRunListener(async args => this.deviceAction(args));

    // const sshDeviceAction = new Homey.FlowCardAction('commandDevice');
    this.sshDeviceAction = this.homey.flow.getActionCard('commandDevice')
    //sshDeviceAction
      // .register()
      .registerRunListener(async args => this.deviceAction(args));

    // noinspection JSUnusedGlobalSymbols
    this.deviceAction = async args => {
      const settings = args.device.getSettings();
      this.log(`SSH Client - sending ${args.command}\n to ${settings.hostname}`);
      this.log(args);
      this.log(args.device);
      this.log(settings);

      let completed = false;

      // noinspection JSUnusedGlobalSymbols
      const sshConfig = {
        host: settings.hostname,
        username: settings.username,
        port: settings.port,
        tryKeyboard: true,
        onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
          if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            this.log('entered password');
            finish([settings.password]);
          }
        },
      };
      if (settings.privateKey) {
        sshConfig.privateKey = settings.privateKey;
        if (settings.passphrase) {
          sshConfig.passphrase = settings.passphrase;
        } else {
          this.log('We did not get a passphrase for this private key!');
        }
      } else {
        sshConfig.password = settings.password;
      }

      const client = new SSH2();

      this.log('starting the connection');
      return client.connect(sshConfig).then(() => {
        // noinspection JSUnresolvedFunction
        client.connection.on('error', err => {
          // Here we catch all errors that are not related to creating a connection or executing
          // the command. In testing that was only about improperly closing a connection.
          // Improperly closed connection errors will be ignored, or more specifically, any error
          // that is received after the command completes is ignored.
          if (completed) {
            return Promise.resolve();
          }
          const tokens = {
            type: 'generic', error: err ? err.toString() : '', command: args.command, deviceName: settings.serverName,
          };
          this.receiveErrorTrigger.trigger(tokens, null).catch(receiveErrorTriggerError => {
            this.log('could not start flow', receiveErrorTriggerError);
          }).finally(() => {
            this.log('received error event', tokens);
          });
          return this.receiveErrorDeviceTrigger.trigger(args.device, tokens, null)
            .catch(receiveErrorTriggerError => {
              this.log('could not start flow', receiveErrorTriggerError);
            }).finally(() => {
              this.log('received error event', tokens);
            });
        });
        this.log('connected');
        client.execCommand(args.command).then(data => {
          // set this command as completed and ignore any errors due to improperly closing the
          // connection as the dispose method does not always work as expected
          completed = true;
          const tokens = {
            command: args.command,
            stdout: data.stdout ? data.stdout : '',
            code: data.code ? data.code : 0,
            stderr: data.stderr ? data.stderr : '',
            signal: data.signal ? data.signal : '',
            deviceName: this.getName(),
          };
          /**
          this.receiveResponseTrigger.trigger(tokens, null).catch(
            err => this.log('1g could not fire the response trigger', err),
          ).finally(() => {
            this.log('received', tokens, data);
            client.dispose();
          });
          */
          return this.receiveResponseDeviceTrigger.trigger(args.device, tokens, null).catch(
            err => this.log('2d could not fire the response trigger', err),
          ).finally(() => {
            this.log('received', tokens, data);
            client.dispose();
          });
        }).catch(err => {
          // we can not possibly have completed the command here, as it ended up in the catch
          const tokens = {
            type: 'command', error: err ? err.toString() : '', command: args.command, deviceName: settings.serverName,
          };
          this.receiveErrorDeviceTrigger.trigger(args.device, tokens, null)
            .catch(receiveErrorTriggerError => {
              this.log('could not start flow', receiveErrorTriggerError);
            });
          return receiveErrorTrigger.trigger(tokens, null).catch(receiveErrorTriggerError => {
            this.log('could not start flow', receiveErrorTriggerError);
          }).finally(() => {
            this.log('error received on sending command', tokens, err);
            return Promise.resolve();
          });
        });
      }).catch(err => {
        // We failed to connect, so the command could not have completed and we need to fire the
        // receive error trigger.
        const tokens = {
          type: 'connection', error: err ? err.toString() : '', command: args.command, deviceName: settings.serverName,
        };
        this.receiveErrorDeviceTrigger.trigger(args.device, tokens, null)
          .catch(receiveErrorTriggerError => {
            this.log('could not start flow', receiveErrorTriggerError);
          });
        receiveErrorTrigger.trigger(tokens, null).catch(receiveErrorTriggerError => {
          this.log('could not fire error trigger', receiveErrorTriggerError);
        }).finally(() => {
          this.setUnavailable(`Error: ${JSON.stringify(err)}`);
          this.log(tokens, err);
        });
      });
    };


  }



  async onSettings(oldSettingsObj, newSettingsObj, changedKeysArr) {
    return this.setAvailable();
  }

};
