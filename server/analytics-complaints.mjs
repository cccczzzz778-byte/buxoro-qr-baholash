import { database, sql } from './database.mjs';
import { clientToken, digest, equal, sign, requestOrigin } from './security.mjs';
import { securityHeaders } from './application.mjs';

const districts=['Buxoro shahri','Kogon shahri','Buxoro tumani','Vobkent tumani','G‘ijduvon tumani','Jondor tumani','Kogon tumani','Olot tumani','Peshku tumani','Qorako‘l tumani','Qorovulbozor tumani','Romitan tumani','Shofirkon tumani'];
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new HttpError(status,message)};
const json=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value))};

function parseSessionToken(token){
  const parts=String(token||'').split('.');
  if(parts.length!==3)return null;
  const [nonce,payload,signature]=parts;
  if(!nonce||!payload||!equal(signature,sign(`session:${nonce}.${payload}`)))return null;
  try{
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if(data.role==='admin')return{role:'admin',district:'',username:String(data.username||'admin')};
    if(data.role==='management')return{role:'management',district:'',username:String(data.username||'boshqarma')};
    if(data.role==='district'&&districts.includes(data.district))return{role:'district',district:data.district,username:String(data.username||'')};
  }catch{}
  return null;
}

async function session(db,req){
  const token=clientToken(req);
  if(!token||token.length>512)fail(401,'Tizimga qayta kiring.');
  const [row]=await db.all(sql`SELECT token_hash FROM admin_sessions WHERE token_hash=${digest(token)} AND expires_at>${new Date().toISOString()}`);
  if(!row)fail(401,'Tizimga qayta kiring.');
  const scope=parseSessionToken(token);
  if(!scope)fail(401,'Tizimga qayta kiring.');
  return scope;
}

export default async function analyticsComplaints(req,res){
  securityHeaders(res);
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='GET')fail(405,'Bu amal qo‘llab-quvvatlanmaydi.');
    const db=await database();
    const auth=await session(db,req);
    const url=new URL(req.url,requestOrigin(req));
    let district=String(url.searchParams.get('hudud')||'').trim();
    if(auth.role==='district')district=auth.district;
    else if(district&&!districts.includes(district))fail(400,'Hudud noto‘g‘ri tanlangan.');

    const rows=district
      ? await db.all(sql`SELECT f.id,f.institution_id,f.doctor,f.service,f.rating,f.comment,f.citizen_name,f.citizen_phone,f.created_at,i.name AS institution_name,i.district FROM feedbacks f JOIN institutions i ON i.id=f.institution_id WHERE f.is_complaint=1 AND i.district=${district} ORDER BY f.created_at DESC LIMIT 500`)
      : await db.all(sql`SELECT f.id,f.institution_id,f.doctor,f.service,f.rating,f.comment,f.citizen_name,f.citizen_phone,f.created_at,i.name AS institution_name,i.district FROM feedbacks f JOIN institutions i ON i.id=f.institution_id WHERE f.is_complaint=1 ORDER BY f.created_at DESC LIMIT 500`);
    return json(res,200,{scope:{role:auth.role,district:auth.district},district:district||'',complaints:rows});
  }catch(error){
    const status=error instanceof HttpError?error.status:500;
    if(status>=500)console.error(error);
    return json(res,status,{error:status>=500?'Server bilan bog‘lanishda xatolik.':error.message});
  }
}
