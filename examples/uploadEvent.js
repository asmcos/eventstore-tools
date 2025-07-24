const fs = require('fs').promises;
const path = require('path');

const {esserver} = require("./config.js");
const {WebSocketClient } = require("../src/WebSocketClient.js");
const {secureEvent} = require("../src/key.js");

//生成的私钥 (Hex): e2a90b45181b6b08d3d42ca785509b6e8cd0e12480324291de95f7d023abdf2c
//生成的公钥 (Hex): f54659feff021a5437745019cceb2c09b9da8cc21dfb29ec25d774210d067fd3
//生成的私钥 (Bech32): esec1u25sk3gcrd4s35759jnc25ymd6xdpcfysqey9yw7jhmaqgatmukqyljrgp
//生成的公钥 (Bech32): epub174r9nlhlqgd9gdm52qvue6evpxua4rxzrhajnmp96a6zzrgx0lfsdwtstf

let pubkey = 'f54659feff021a5437745019cceb2c09b9da8cc21dfb29ec25d774210d067fd3';
let privkey = 'e2a90b45181b6b08d3d42ca785509b6e8cd0e12480324291de95f7d023abdf2c';


let filename = "dddepth-281.jpg";
let client ;
let event = {
    
  "ops": "C",
  "code": 400,
  "user": pubkey,
  "data": {
     fileName: filename,
  },
  "tags":[['t','upload_file'],],
}


async function initWebSocket (){
    client = new WebSocketClient(esserver);
    await client.connect();
    const fileData = await fs.readFile(path.join(__dirname, './',filename));
    const sevent = secureEvent(event,privkey);
    sevent.data.fileData = fileData;
    
    client.publish(sevent,function(message){
      console.log(message);
    });
}

initWebSocket();


