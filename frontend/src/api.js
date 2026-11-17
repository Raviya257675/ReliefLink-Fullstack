// Real backend mode. All API calls use the persistent local server.
const BASE=import.meta.env.VITE_API_URL||'';
let token=localStorage.getItem('token');
export function setToken(next){token=next;if(next)localStorage.setItem('token',next);else localStorage.removeItem('token')}
export const getToken=()=>token;
async function request(method,path,body){
 let response;
 try{response=await fetch(`${BASE}/api${path}`,{
  method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
  body:body!==undefined?JSON.stringify(body):undefined,
 });}catch{throw new Error('Cannot reach the ReliefLink server. Start RUN_WINDOWS.bat and try again.')}
 let data;try{data=await response.json()}catch{data=null}
 if(!response.ok){const err=new Error(data?.error||`Request failed (${response.status})`);err.status=response.status;throw err}
 return data;
}
export const api={get:(p)=>request('GET',p),post:(p,b)=>request('POST',p,b??{}),patch:(p,b)=>request('PATCH',p,b??{}),del:(p)=>request('DELETE',p)};
