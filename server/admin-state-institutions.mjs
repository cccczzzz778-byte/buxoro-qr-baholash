import { randomBytes } from 'node:crypto';
import { database, sql, normalizedName } from './database.mjs';
import { clientToken, digest, equal, sign, csrfFor, requestOrigin, publicBase } from './security.mjs';
import { securityHeaders } from './application.mjs';

const districts=['Buxoro shahri','Kogon shahri','Buxoro tumani','Vobkent tumani','G‘ijduvon tumani','Jondor tumani','Kogon tumani','Olot tumani','Peshku tumani','Qorako‘l tumani','Qorovulbozor tumani','Romitan tumani','Shofirkon tumani'];
const types=['Davlat tibbiyot muassasasi','OP','OSHP','Tibbiyot birlashmasi','Boshqa davlat muassasasi'];
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new HttpError(status,message)};
const json=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value))};
const clean=(value,label,min,max)=>{if(typeof value!=='string')fail(400,`${label}ni to‘g‘ri kiriting.`);const s=value.normalize('NFKC').trim().replace(/[\u0000-\u001f]/g,'');if(s.length<min||s.length>max)fail(400,`${label}: ${min}–${max} ta belgi bo‘lishi kerak.`);return s};
async function readBody(req){if(!/^application\/json\b/i.test(req.headers['content-type']||''))fail(415,'Ma’lumot JSON shaklida yuborilishi kerak.');const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>32768)fail(413,'Yuborilgan ma’lumot juda katta.');chunks.push(c)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail(400,'Ma’lumot shakli noto‘g‘ri.')}}
function parseSessionToken(token){const parts=String(token||'').split('.');if(parts.length===1)return{role:'admin',username:process.env.ADMIN_USERNAME||'admin'};if(parts.length!==3)return null;const[nonce,payload,signature]=parts;if(!nonce||!payload||!equal(signature,sign(`session:${nonce}.${payload}`)))return null;try{const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));if(data.role==='admin')return{role:'admin',username:String(data.username||'admin')}}catch{}return null}
async function adminSession(db,req){const token=clientToken(req);if(!token||token.length>512)fail(401,'Tizimga qayta kiring.');const[row]=await db.all(sql`SELECT token_hash FROM admin_sessions WHERE token_hash=${digest(token)} AND expires_at>${new Date().toISOString()}`);if(!row)fail(401,'Tizimga qayta kiring.');const auth=parseSessionToken(token);if(!auth||auth.role!=='admin')fail(403,'Bu bo‘lim faqat administrator uchun.');if(!equal(req.headers['x-csrf-token'],csrfFor(token)))fail(403,'Sahifani yangilab, qayta urinib ko‘ring.');return auth}
function guardOrigin(req){const origin=req.headers.origin;if(origin&&![requestOrigin(req),publicBase(req)].includes(origin))fail(403,'So‘rov manzili tasdiqlanmadi.');if(req.headers['sec-fetch-site']==='cross-site')fail(403,'So‘rov manzili tasdiqlanmadi.')}
async function newId(db,prefix,bytes=5){for(let i=0;i<10;i++){const id=`${prefix}${randomBytes(bytes).toString('hex').toUpperCase()}`;const table=prefix.startsWith('REG-')?'institution_registrations':'institutions';const rows=table==='institutions'?await db.all(sql`SELECT id FROM institutions WHERE id=${id}`):await db.all(sql`SELECT id FROM institution_registrations WHERE id=${id}`);if(!rows.length)return id}fail(500,'Yangi identifikator yaratilmadi.')}

export default async function adminStateInstitutions(req,res){
  securityHeaders(res);res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='POST')fail(405,'Bu amal qo‘llab-quvvatlanmaydi.');guardOrigin(req);
    const db=await database();const auth=await adminSession(db,req);const data=await readBody(req);
    const name=clean(data.name,'Muassasa nomi',2,180);const type=clean(data.type,'Muassasa turi',2,80);if(!types.includes(type))fail(400,'Muassasa turini ro‘yxatdan tanlang.');
    const stir=clean(data.stir,'STIR',9,14).replace(/\s/g,'');if(!/^\d{9,14}$/.test(stir))fail(400,'STIR faqat 9–14 ta raqamdan iborat bo‘lsin.');
    const district=clean(data.district,'Hudud',2,120);if(!districts.includes(district))fail(400,'Hududni ro‘yxatdan tanlang.');
    const address=clean(data.address??'','Manzil',0,240);const director=clean(data.directorName,'Rahbar F.I.Sh.',2,160);const contact=clean(data.contactName,'Mas’ul shaxs F.I.Sh.',2,160);
    const phone=clean(data.phone,'Telefon raqami',7,30);if(!/^[+0-9()\-\s]{7,30}$/.test(phone))fail(400,'Telefon raqamini to‘g‘ri kiriting.');const email=clean(data.email??'','Email',0,160);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Email manzilini to‘g‘ri kiriting.');
    const [stirExists]=await db.all(sql`SELECT id FROM institution_registrations WHERE stir=${stir}`);if(stirExists)fail(409,'Bu STIR bilan davlat muassasasi allaqachon ro‘yxatdan o‘tgan.');
    const nameKey=normalizedName(name,district);const [nameExists]=await db.all(sql`SELECT id FROM institutions WHERE name_key=${nameKey}`);if(nameExists)fail(409,'Bu muassasa va hudud allaqachon mavjud.');
    const institutionId=await newId(db,'INST-BUX-',5);const registrationId=await newId(db,'REG-BUX-',6);const now=new Date().toISOString();
    await db.all(sql`INSERT INTO institutions (id,name,district,address,name_key,active,created_at) VALUES (${institutionId},${name},${district},${address},${nameKey},1,${now})`);
    try{await db.all(sql`INSERT INTO institution_registrations (id,institution_name,institution_type,stir,district,address,director_name,contact_name,phone,email,status,review_note,institution_id,created_at,reviewed_at,reviewed_by) VALUES (${registrationId},${name},${type},${stir},${district},${address},${director},${contact},${phone},${email},'approved','Admin panel orqali to‘g‘ridan-to‘g‘ri qo‘shildi',${institutionId},${now},${now},${auth.username})`)}catch(error){await db.all(sql`DELETE FROM institutions WHERE id=${institutionId}`).catch(()=>{});throw error}
    const base=publicBase(req);return json(res,201,{ok:true,registrationId,institution:{id:institutionId,name,type,stir,district,address,directorName:director,contactName:contact,phone,email,feedbackUrl:`${base}/?m=${encodeURIComponent(institutionId)}`,qrUrl:`/api/qr/${encodeURIComponent(institutionId)}.png`}});
  }catch(error){const status=error instanceof HttpError?error.status:500;if(status>=500)console.error(error);return json(res,status,{error:status>=500?'Server bilan bog‘lanishda xatolik.':error.message})}
}
