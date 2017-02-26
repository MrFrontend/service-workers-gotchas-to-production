# service-workers-gotchas-to-production

Source code and slides of my talk for the Rolling Scopes 2017 conference in Minsk

This project contains a basic Node.js static file server, this server logs on the 
terminal all the assets being served over the network so you can keep track of which 
resources are being cached and which ones are being served.

Different cache strategies are implemented in different Service Workers.
Follow the slides located at the root of the project 


## How to run the server
  * cd node_server/
  * npm install
  * node server.js
  
## Change the HTTP headers from the server
  * server.js line 56 and 57
  
## Try different Service Worker strategies
  * index.html lines 18 to 21
  * Uncomment the line of the service worker you want to try out. 
  * Remember that only one service worker can be registered on the same scope for
  a specific domain.
  * Remember to unregister the current service before loading a different one or 
  check the "Update on reload" option on Chrome developer tools located at the 
  Application / Service Workers section.