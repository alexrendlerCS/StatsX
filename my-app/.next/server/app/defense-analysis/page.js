(()=>{var e={};e.id=588,e.ids=[588],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},78893:e=>{"use strict";e.exports=require("buffer")},84770:e=>{"use strict";e.exports=require("crypto")},17702:e=>{"use strict";e.exports=require("events")},32615:e=>{"use strict";e.exports=require("http")},35240:e=>{"use strict";e.exports=require("https")},98216:e=>{"use strict";e.exports=require("net")},55315:e=>{"use strict";e.exports=require("path")},68621:e=>{"use strict";e.exports=require("punycode")},76162:e=>{"use strict";e.exports=require("stream")},82452:e=>{"use strict";e.exports=require("tls")},17360:e=>{"use strict";e.exports=require("url")},71568:e=>{"use strict";e.exports=require("zlib")},58879:(e,a,s)=>{"use strict";s.r(a),s.d(a,{GlobalError:()=>l.a,__next_app__:()=>p,originalPathname:()=>u,pages:()=>c,routeModule:()=>g,tree:()=>d}),s(51650),s(67739),s(90996);var r=s(30170),t=s(45002),n=s(83876),l=s.n(n),i=s(66299),o={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>i[e]);s.d(a,o);let d=["",{children:["defense-analysis",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,51650)),"/mnt/c/Users/zesty/OneDrive/Desktop/Complete/StatsX/my-app/app/defense-analysis/page.tsx"]}]},{metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,57481))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(s.bind(s,67739)),"/mnt/c/Users/zesty/OneDrive/Desktop/Complete/StatsX/my-app/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,90996,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,57481))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],c=["/mnt/c/Users/zesty/OneDrive/Desktop/Complete/StatsX/my-app/app/defense-analysis/page.tsx"],u="/defense-analysis/page",p={require:s,loadChunk:()=>Promise.resolve()},g=new r.AppPageRouteModule({definition:{kind:t.x.APP_PAGE,page:"/defense-analysis/page",pathname:"/defense-analysis",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},38251:(e,a,s)=>{Promise.resolve().then(s.bind(s,56641))},56641:(e,a,s)=>{"use strict";s.r(a),s.d(a,{default:()=>u});var r=s(97247),t=s(28964),n=s(27757),l=s(94049),i=s(58053),o=s(97792),d=s(35216),c=s(12169);function u(){let[e,a]=(0,t.useState)(""),[s,u]=(0,t.useState)(""),[p,g]=(0,t.useState)([]),[m,h]=(0,t.useState)([]),[x,v]=(0,t.useState)(!1),[y,f]=(0,t.useState)(!1),b=async()=>{if(!e||!s){alert("Please select both a team and a position.");return}v(!0),f(!0),h([]);try{let a="QB"===s?["Week","Matchup","Passing Attempts","Completions","Passing Yards","Passing TDs","Interceptions","Rate","Rushing Attempts","Rushing Yards","Rushing TDs"]:["Week","Matchup","Rushing Attempts","Total Rushing Yards","Avg Yards per Carry","Rushing TDs","Targets","Receptions","Total Receiving Yards","Avg Yards per Catch","Receiving TDs"];g(a);let t={"Passing Attempts":"passing_attempts",Completions:"completions","Passing Yards":"passing_yards","Passing TDs":"passing_tds",Interceptions:"interceptions",Rate:"rate","Rushing Attempts":"rushing_attempts","Rushing Yards":"total_rushing_yards","Avg Rushing Yards":"avg_yards_per_carry","Rushing TDs":"rushing_tds",Targets:"targets",Receptions:"receptions","Total Rushing Yards":"total_rushing_yards","Avg Yards per Carry":"avg_yards_per_carry","Total Receiving Yards":"total_receiving_yards","Avg Yards per Catch":"avg_yards_per_catch","Receiving TDs":"receiving_tds"},n={...t,"Rushing Yards":"rushing_yards","Avg Rushing Yards":"avg_rushing_yards","Total Rushing Yards":"rushing_yards","Total Receiving Yards":"receiving_yards"},l="QB"===s?"qb_defensive_stats":"general_defensive_stats",i="QB"===s?"all_defense_averages_qb":"all_defense_averages",o=c.Z.from(l).select("*").eq("team_id",e);"QB"!==s&&(o=o.eq("position_id",s));let{data:d,error:u}=await o;if(u||!d){console.error("Error fetching team stats:",u),alert("Failed to fetch team data.");return}let{data:p,error:m}="QB"===s?await c.Z.from(i).select("*").single():await c.Z.from(i).select("*").eq("position_id",s).single();if(m||!p){console.error("Error fetching league averages:",m),alert("Failed to fetch league averages.");return}let x=(e,a,s)=>{if("Passing TDs"===e){if(a>=2)return"#00c853";if(1===a)return"#ffea00";if(0===a)return"#d32f2f"}if("Rushing TDs"===e||"Receiving TDs"===e){if(a>=1)return"#00c853";if(0===a)return"#d32f2f"}return 0===s?"#d32f2f":a>s+1.5?"#00c853":1.5>=Math.abs(a-s)?"#ffea00":"#d32f2f"},v=[],y={};for(let l=1;l<=17;l++){let i=d.filter(e=>e.week===l);if(i.length>0){let o={Week:l,Matchup:`${i[0].matchup||"Unknown Opponent"} ▼`,rowType:"parent",isHidden:!1};a.slice(2).forEach(e=>{let a=t[e];if(!a){console.error(`Header "${e}" is not mapped to a database key.`),o[e]="N/A";return}"QB"===s&&"total_rushing_yards"===a?a="rushing_yards":"QB"===s&&"avg_yards_per_carry"===a&&(a="avg_qb_avg_rushing_yards");let n=i[0][a]??"N/A",l=p[`avg_${a}`]??0;y[e]||(y[e]=[]),"N/A"!==n&&y[e].push(Number(n)),o[e]="N/A"===n?n:r.jsx("span",{style:{color:x(e,n,l),fontWeight:"bold"},children:n})}),v.push(o);let{data:d,error:u}=await c.Z.from("player_stats").select("*").eq("opponent",e).eq("position_id",s).eq("week",l);if(u){console.error(`Error fetching player stats for week ${l}:`,u.message);continue}let g={};for(let e of d){let{data:a,error:s}=await c.Z.from("player_averages").select("*").eq("player_name",e.player_name).single();if(s){console.error(`Error fetching averages for ${e.player_name}:`,s.message);continue}g[e.player_name]=a}d.forEach(e=>{let t={Week:"",Matchup:e.player_name,rowType:"child",isHidden:!0};a.slice(2).forEach(a=>{let l=n[a];"QB"===s&&("Rushing Yards"===a||"Avg Rushing Yards"===a)&&(l="Rushing Yards"===a?"rushing_yards":"avg_qb_avg_rushing_yards");let i=e[l]??"N/A",o=g[e.player_name]?.[`avg_${l}`]??0;t[a]="N/A"===i?i:r.jsx("span",{style:{color:x(a,i,o),fontWeight:"bold"},children:i})}),v.push(t)})}}let f=(e,s)=>{let t={Week:"",Matchup:s,rowType:"average"};a.slice(2).forEach(a=>{if(!e[a]||0===e[a].length){t[a]="N/A";return}let n=e[a].reduce((e,a)=>e+a,0),l="L3 Average"===s?n/Math.min(e[a].length,3):n/e[a].length;t[a]=r.jsx("span",{style:{fontWeight:"bold"},children:l.toFixed(2)})}),v.push(t)};f(y,"L3 Average"),f(y,"Overall Average"),h(v)}catch(e){console.error("Error fetching data:",e.message),alert("An unexpected error occurred. Please try again.")}finally{v(!1)}},_=e=>{let a=[...m],s=a[e];if("parent"!==s.rowType)return;let r=e+1;for(;r<a.length&&"child"===a[r].rowType;)a[r].isHidden=!a[r].isHidden,r++;s.Matchup=s.Matchup.includes("▼")?s.Matchup.replace("▼","▲"):s.Matchup.replace("▲","▼"),h(a)};return r.jsx("div",{className:"flex-grow",children:(0,r.jsxs)("div",{className:"space-y-8",children:[(0,r.jsxs)("div",{className:"flex items-center justify-center space-x-2",children:[r.jsx(o.Z,{className:"w-8 h-8 text-blue-400"}),r.jsx("h1",{className:"text-4xl font-bold text-center text-blue-400",children:"Defense Analysis"})]}),(0,r.jsxs)(n.Zb,{className:"bg-gray-800 border-blue-400",children:[r.jsx(n.Ol,{children:(0,r.jsxs)(n.ll,{className:"text-blue-400 flex items-center space-x-2",children:[r.jsx(d.Z,{className:"w-6 h-6"}),r.jsx("span",{children:"Compare Defenses"})]})}),r.jsx(n.aY,{children:(0,r.jsxs)("div",{className:"space-y-4",children:[(0,r.jsxs)("div",{className:"flex items-center justify-between space-x-4",children:[(0,r.jsxs)("div",{className:"flex-1",children:[r.jsx("label",{className:"block text-sm font-medium text-gray-400 mb-1",children:"Team"}),(0,r.jsxs)(l.Ph,{onValueChange:a,children:[r.jsx(l.i4,{className:"bg-gray-700 text-gray-100 border border-gray-600 w-full rounded px-4 py-2 shadow-lg",children:r.jsx(l.ki,{placeholder:"Select a team"})}),r.jsx(l.Bw,{className:"bg-gray-700 border border-gray-600 rounded shadow-lg",children:[{name:"49ers",value:"SF"},{name:"Bears",value:"CHI"},{name:"Bengals",value:"CIN"},{name:"Bills",value:"BUF"},{name:"Broncos",value:"DEN"},{name:"Browns",value:"CLE"},{name:"Buccaneers",value:"TB"},{name:"Cardinals",value:"ARI"},{name:"Chargers",value:"LAC"},{name:"Chiefs",value:"KC"},{name:"Colts",value:"IND"},{name:"Commanders",value:"WAS"},{name:"Cowboys",value:"DAL"},{name:"Dolphins",value:"MIA"},{name:"Eagles",value:"PHI"},{name:"Falcons",value:"ATL"},{name:"Giants",value:"NYG"},{name:"Jaguars",value:"JAC"},{name:"Jets",value:"NYJ"},{name:"Lions",value:"DET"},{name:"Packers",value:"GB"},{name:"Panthers",value:"CAR"},{name:"Patriots",value:"NE"},{name:"Raiders",value:"LV"},{name:"Rams",value:"LAR"},{name:"Ravens",value:"BAL"},{name:"Saints",value:"NO"},{name:"Seahawks",value:"SEA"},{name:"Steelers",value:"PIT"},{name:"Texans",value:"HOU"},{name:"Titans",value:"TEN"},{name:"Vikings",value:"MIN"}].map(e=>r.jsx(l.Ql,{value:e.value,className:"px-4 py-2 text-gray-100 cursor-pointer hover:bg-gray-600",children:e.name},e.value))})]})]}),r.jsx("div",{className:"relative text-gray-400 font-bold text-lg",style:{top:"6px"},children:"vs."}),(0,r.jsxs)("div",{className:"flex-1",children:[r.jsx("label",{className:"block text-sm font-medium text-gray-400 mb-1",children:"Position"}),(0,r.jsxs)(l.Ph,{onValueChange:u,children:[r.jsx(l.i4,{className:"bg-gray-700 text-gray-100 border border-gray-600 w-full rounded px-4 py-2 shadow-lg",children:r.jsx(l.ki,{placeholder:"Select a position"})}),r.jsx(l.Bw,{className:"bg-gray-700 border border-gray-600 rounded shadow-lg",children:[{name:"Running Back",value:"RB"},{name:"Wide Receiver",value:"WR"},{name:"Tight End",value:"TE"},{name:"Quarterback",value:"QB"}].map(e=>r.jsx(l.Ql,{value:e.value,className:"px-4 py-2 text-gray-100 cursor-pointer hover:bg-gray-600",children:e.name},e.value))})]})]})]}),r.jsx(i.z,{onClick:b,className:"w-full bg-blue-600 hover:bg-blue-700 text-white",children:"Fetch Stats"})]})})]}),y&&(0,r.jsxs)(n.Zb,{className:"bg-gradient-to-b from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg",children:[r.jsx(n.Ol,{children:r.jsx(n.ll,{className:"text-blue-400 text-2xl font-bold flex items-center",children:"Defense Comparison Results"})}),r.jsx(n.aY,{children:x?r.jsx("div",{className:"flex justify-center items-center py-10",children:r.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-t-4 border-blue-400 border-solid"})}):r.jsx("div",{className:"overflow-x-auto",children:(0,r.jsxs)("table",{className:"w-full text-sm text-left text-gray-300",children:[r.jsx("thead",{className:"text-xs uppercase bg-gray-700 text-gray-400",children:r.jsx("tr",{children:p.map(e=>r.jsx("th",{scope:"col",className:"px-6 py-3",children:e},e))})}),r.jsx("tbody",{children:m.map((e,a)=>r.jsx("tr",{className:`border-b ${"child"===e.rowType&&e.isHidden?"hidden":""} ${"child"===e.rowType?"bg-gray-900":"bg-gray-800"} border-gray-700`,onClick:()=>"parent"===e.rowType&&_(a),style:{cursor:"parent"===e.rowType?"pointer":"default"},children:p.map(a=>r.jsx("td",{className:`px-6 py-4 ${"child"===e.rowType?"pl-12 text-left":""}`,children:void 0!==e[a]?e[a]:"N/A"},a))},a))})]})})})]})]})})}},51650:(e,a,s)=>{"use strict";s.r(a),s.d(a,{default:()=>r});let r=(0,s(45347).createProxy)(String.raw`/mnt/c/Users/zesty/OneDrive/Desktop/Complete/StatsX/my-app/app/defense-analysis/page.tsx#default`)}};var a=require("../../webpack-runtime.js");a.C(e);var s=e=>a(a.s=e),r=a.X(0,[379,206,564,219,859,806],()=>s(58879));module.exports=r})();