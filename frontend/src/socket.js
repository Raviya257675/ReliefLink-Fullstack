// Zero-dependency realtime adapter: Server-Sent Events (SSE), NOT Socket.IO.
// Maintains the original .on/.off/.connected interface used by the React components.
const handlers=new Map();
let stream=null;
export const socket={
 connected:false,
 on(name,fn){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn)},
 off(name,fn){handlers.get(name)?.delete(fn)},
 emit(name,payload){for(const fn of handlers.get(name)||[])try{fn(payload)}catch(error){console.error(error)}},
};
function connect(){
 if(stream)stream.close();
 stream=new EventSource(`${import.meta.env.VITE_API_URL||''}/api/events`);
 stream.onopen=()=>{socket.connected=true;socket.emit('connect')};
 stream.onerror=()=>{if(socket.connected){socket.connected=false;socket.emit('disconnect')}};
 stream.onmessage=(message)=>{
  try{const {event,payload}=JSON.parse(message.data);if(typeof event==='string')socket.emit(event,payload)}catch(error){console.warn('Invalid live event',error)}
 };
}
export function reconnectSocket(){connect()}
if(typeof window!=='undefined')connect();
