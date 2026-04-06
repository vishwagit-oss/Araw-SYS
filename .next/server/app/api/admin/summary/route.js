"use strict";(()=>{var e={};e.id=82,e.ids=[82],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8678:e=>{e.exports=import("pg")},76803:(e,t,i)=>{i.a(e,async(e,r)=>{try{i.r(t),i.d(t,{originalPathname:()=>S,patchFetch:()=>l,requestAsyncStorage:()=>_,routeModule:()=>d,serverHooks:()=>u,staticGenerationAsyncStorage:()=>m});var n=i(49303),s=i(88716),a=i(60670),o=i(70832),c=e([o]);o=(c.then?(await c)():c)[0];let d=new n.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/admin/summary/route",pathname:"/api/admin/summary",filename:"route",bundlePath:"app/api/admin/summary/route"},resolvedPagePath:"C:\\Users\\vishw\\sea-regent-admin\\src\\app\\api\\admin\\summary\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:_,staticGenerationAsyncStorage:m,serverHooks:u}=d,S="/api/admin/summary/route";function l(){return(0,a.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:m})}r()}catch(e){r(e)}})},70832:(e,t,i)=>{i.a(e,async(e,r)=>{try{i.r(t),i.d(t,{GET:()=>c});var n=i(87070),s=i(95456),a=i(75748),o=e([s,a]);async function c(){let e=await (0,s.Gg)();if(!e||"admin"!==e.ship.role)return n.NextResponse.json({error:"Forbidden"},{status:403});let t=await (0,a.I)(`
    WITH cargo_recv AS (
      SELECT
        ship_id,
        SUM(white_ig)  AS white_ig,
        SUM(white_mt)  AS white_mt,
        SUM(yellow_ig) AS yellow_ig,
        SUM(yellow_mt) AS yellow_mt
      FROM cargo_receiving
      GROUP BY ship_id
    ),
    cargo_dis AS (
      SELECT
        ship_id,
        SUM(white_ig)  AS white_ig,
        SUM(white_mt)  AS white_mt,
        SUM(yellow_ig) AS yellow_ig,
        SUM(yellow_mt) AS yellow_mt
      FROM internal_discharge
      GROUP BY ship_id
    ),
    cash_recv AS (
      SELECT ship_id, SUM(amount_aed) AS cash_amount
      FROM cash_receiving
      GROUP BY ship_id
    ),
    cash_dis AS (
      SELECT ship_id, SUM(amount_aed) AS cash_amount
      FROM cash_discharge
      GROUP BY ship_id
    )
    SELECT
      s.id AS ship_id,
      s.name AS ship_name,
      COALESCE(cr.white_ig, 0)  - COALESCE(cd.white_ig, 0)  AS white_ig_remaining,
      COALESCE(cr.white_mt, 0)  - COALESCE(cd.white_mt, 0)  AS white_mt_remaining,
      COALESCE(cr.yellow_ig, 0) - COALESCE(cd.yellow_ig, 0) AS yellow_ig_remaining,
      COALESCE(cr.yellow_mt, 0) - COALESCE(cd.yellow_mt, 0) AS yellow_mt_remaining,
      COALESCE(crr.cash_amount, 0) - COALESCE(cdd.cash_amount, 0) AS cash_amount_remaining
    FROM ships s
    LEFT JOIN cargo_recv cr ON cr.ship_id = s.id
    LEFT JOIN cargo_dis cd ON cd.ship_id = s.id
    LEFT JOIN cash_recv crr ON crr.ship_id = s.id
    LEFT JOIN cash_dis cdd ON cdd.ship_id = s.id
    WHERE s.role = 'ship'
    ORDER BY s.name
    `);return n.NextResponse.json({summary:t.rows})}[s,a]=o.then?(await o)():o,r()}catch(e){r(e)}})},86008:(e,t,i)=>{i.d(t,{Rf:()=>n,SC:()=>s,jt:()=>a,xy:()=>r});let r="sea_regent_demo";function n(){return"sea_regent_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"}function s(e){let t=Buffer.from(JSON.stringify(e)).toString("base64");return`${r}=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`}function a(){return`${r}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`}},95456:(e,t,i)=>{i.a(e,async(e,r)=>{try{i.d(t,{Gg:()=>l,SC:()=>o.SC,xj:()=>d});var n=i(71615),s=i(75748),a=i(65655),o=i(86008),c=e([s]);s=(c.then?(await c)():c)[0];let d={demo:{password:"demo123",ship:{id:"demo-ship",name:"MAHRU",login_id:"demo",role:"ship"}},demo_admin:{password:"demo123",ship:{id:"demo-admin",name:"Admin",login_id:"demo_admin",role:"admin"}}};async function l(){let e=await (0,n.cookies)(),t=e.get(o.xy)?.value;if(t)try{let e=JSON.parse(Buffer.from(t,"base64").toString());if(e?.id&&e?.name&&e?.role)return{sessionId:"demo",ship:e}}catch{}try{let e=await (0,a.I)(),{data:{user:t}}=await e.auth.getUser();if(!t)return null;let i=await (0,s.I)("SELECT id, name, login_id, role FROM ships WHERE auth_user_id = $1 LIMIT 1",[t.id]);if(0===i.rows.length)return null;let r=i.rows[0];return{sessionId:t.id,ship:{id:r.id,name:r.name,login_id:r.login_id,role:r.role}}}catch{return null}}r()}catch(e){r(e)}})},75748:(e,t,i)=>{i.a(e,async(e,r)=>{try{i.d(t,{I:()=>a});var n=i(8678),s=e([n]);n=(s.then?(await s)():s)[0];let o=process.env.DATABASE_URL;o||console.error("[Sea Regent] DATABASE_URL is not set. Set it in .env.local. API routes that use the database will return 500.");let{connectionString:c,ssl:l}=function(){if(!o)return{connectionString:void 0,ssl:void 0};try{let e=new URL(o);return e.searchParams.delete("sslmode"),e.searchParams.delete("ssl"),{connectionString:e.toString(),ssl:{rejectUnauthorized:!1}}}catch{return{connectionString:o,ssl:{rejectUnauthorized:!1}}}}(),d=new n.Pool({connectionString:c,ssl:c?l:void 0,max:Number(process.env.PG_POOL_MAX??5),idleTimeoutMillis:2e4,connectionTimeoutMillis:15e3});async function a(e,t){if(!o)throw Error("DATABASE_URL is not set. Add it to .env.local.");let i=await d.connect();try{return await i.query(e,t)}finally{i.release()}}r()}catch(e){r(e)}})},71228:(e,t,i)=>{function r(e){let t=process.env.SHIP_AUTH_EMAIL_DOMAIN?.trim()||"ship.auth.invalid",i=e.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"_").replace(/_{2,}/g,"_").replace(/^_|_$/g,"");return`${i||"ship"}@${t}`}function n(){return!!(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()&&(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()))}function s(){return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()||""}i.d(t,{WL:()=>s,ct:()=>r,zO:()=>n})},65655:(e,t,i)=>{i.d(t,{I:()=>c,L:()=>o});var r=i(97901),n=i(71615),s=i(71228);let a=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()??"";function o(e){let t=(0,n.cookies)();return(0,r.createServerClient)(a,(0,s.WL)(),{cookies:{getAll:()=>t.getAll(),setAll(t){t.forEach(({name:t,value:i,options:r})=>{e.cookies.set(t,i,r)})}}})}async function c(){let e=(0,n.cookies)();return(0,r.createServerClient)(a,(0,s.WL)(),{cookies:{getAll:()=>e.getAll(),setAll(){}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),r=t.X(0,[276,972,91],()=>i(76803));module.exports=r})();