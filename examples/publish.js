const {esserver} = require("./config.js");
const {WebSocketClient } = require("../src/WebSocketClient.js");
const {secureEvent} = require("../src/key.js");
//生成的私钥 (Hex): e2a90b45181b6b08d3d42ca785509b6e8cd0e12480324291de95f7d023abdf2c
//生成的公钥 (Hex): f54659feff021a5437745019cceb2c09b9da8cc21dfb29ec25d774210d067fd3
//生成的私钥 (Bech32): esec1u25sk3gcrd4s35759jnc25ymd6xdpcfysqey9yw7jhmaqgatmukqyljrgp
//生成的公钥 (Bech32): epub174r9nlhlqgd9gdm52qvue6evpxua4rxzrhajnmp96a6zzrgx0lfsdwtstf

let pubkey = 'f54659feff021a5437745019cceb2c09b9da8cc21dfb29ec25d774210d067fd3';
let privkey = 'e2a90b45181b6b08d3d42ca785509b6e8cd0e12480324291de95f7d023abdf2c';
let client = new WebSocketClient(esserver);
let event = {
    
  "ops": "C",
  "code": 100,
  "user": pubkey,
  "data": {
    "email": "asmcos@gmail.com",
  }
}

client.publish(secureEvent(event,privkey),function(message){
    console.log(message);
});
