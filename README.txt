This app will allow you to connect to a remote ssh server.
You can create for every server a device. And give it a logical name.
You can login with you username and password. So you don't have to fill in twice.
In the flow manager you can select the server, and send the command.

Usefull?
* Create a backup of your server through Homey
* Useful to start a playlist from [Spotify](https://github.com/dronir/SpotifyControl) on your Mac.
* For debugging and failover trigger flows can be created that catch errors and responses. If desired these can be logged using the simple logging app.

Remarks
* You can debug things using a flow with the receivedResponse and receivedError events. Tokens for what device, command etc are available within the flows.
* You can't create an connection to the Homey, because SSH access to the Homey is secured by Athom.