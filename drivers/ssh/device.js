'use strict';

const Homey = require('homey');
const { Device } = require('homey');
const SSH2 = require('node-ssh').NodeSSH;

module.exports = class sshDevice extends Device {

  onInit() {
    const sshAction = new Homey.FlowCardAction('command');
    sshAction
      .register()
      .registerRunListener(async args => {
        const settings = this.getSettings();
        this.log(`SSH Client - sending ${args.command}\n to ${settings.hostname}`);

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
          this.log('connected');
          client.execCommand(args.command).then(data => {
            this.log('received', data);
            client.dispose();
          });
        }).catch(err => {
          this.setUnavailable(`Error: ${JSON.stringify(err)}`);
          this.log(err);
        });
      });
  }

};
