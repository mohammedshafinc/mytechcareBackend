import { HttpError } from './http';

const ITERATIONS=100_000, SALT_LENGTH=16, KEY_LENGTH=32;
const encoder=new TextEncoder();
let dummyPasswordRecordValue:string|undefined;
export function getDummyPasswordRecord(){if(!dummyPasswordRecordValue){const randomSalt=crypto.getRandomValues(new Uint8Array(SALT_LENGTH));const randomComparison=crypto.getRandomValues(new Uint8Array(KEY_LENGTH));dummyPasswordRecordValue=`pbkdf2-sha256$v=1$i=${ITERATIONS}$l=${KEY_LENGTH}$${b64(randomSalt)}$${b64(randomComparison)}`;}return dummyPasswordRecordValue;}
function b64(v:Uint8Array){let s='';for(const b of v)s+=String.fromCharCode(b);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function unb64(v:string){if(!/^[A-Za-z0-9_-]+$/.test(v))throw new Error('invalid_hash');const s=v.replaceAll('-','+').replaceAll('_','/')+'==='.slice((v.length+3)%4);return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
function parse(record:string){const m=/^pbkdf2-sha256\$v=1\$i=100000\$l=32\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/.exec(record);if(!m)throw new Error('invalid_hash');const salt=unb64(m[1]),key=unb64(m[2]);if(salt.length!==SALT_LENGTH||key.length!==KEY_LENGTH)throw new Error('invalid_hash');return{salt,key};}
async function derive(password:string,salt:Uint8Array){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},key,KEY_LENGTH*8));}
export function validatePassword(password:unknown):asserts password is string {if(typeof password!=='string'||[...password].length<12||encoder.encode(password).length>128)throw new HttpError(400,'Password must be at least 12 characters and at most 128 UTF-8 bytes');}
export async function hashPassword(password:string){validatePassword(password);const salt=crypto.getRandomValues(new Uint8Array(SALT_LENGTH));return `pbkdf2-sha256$v=1$i=${ITERATIONS}$l=${KEY_LENGTH}$${b64(salt)}$${b64(await derive(password,salt))}`;}
export async function verifyPassword(password:string,record:string){const {salt,key}=parse(record);const actual=await derive(password,salt);let diff=0;for(let i=0;i<KEY_LENGTH;i++)diff|=actual[i]^key[i];return diff===0;}
