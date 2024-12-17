(()=>{var e={};e.id=910,e.ids=[910],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},78893:e=>{"use strict";e.exports=require("buffer")},84770:e=>{"use strict";e.exports=require("crypto")},17702:e=>{"use strict";e.exports=require("events")},32615:e=>{"use strict";e.exports=require("http")},35240:e=>{"use strict";e.exports=require("https")},98216:e=>{"use strict";e.exports=require("net")},55315:e=>{"use strict";e.exports=require("path")},68621:e=>{"use strict";e.exports=require("punycode")},76162:e=>{"use strict";e.exports=require("stream")},82452:e=>{"use strict";e.exports=require("tls")},17360:e=>{"use strict";e.exports=require("url")},71568:e=>{"use strict";e.exports=require("zlib")},50620:(e,s,t)=>{"use strict";t.r(s),t.d(s,{GlobalError:()=>n.a,__next_app__:()=>m,originalPathname:()=>x,pages:()=>d,routeModule:()=>p,tree:()=>c}),t(98471),t(67739),t(90996);var r=t(30170),a=t(45002),l=t(83876),n=t.n(l),i=t(66299),o={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>i[e]);t.d(s,o);let c=["",{children:["player-stats",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(t.bind(t,98471)),"/mnt/c/Users/zesty/OneDrive/Desktop/statsx/statsx/my-app/app/player-stats/page.tsx"]}]},{metadata:{icon:[async e=>(await Promise.resolve().then(t.bind(t,57481))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(t.bind(t,67739)),"/mnt/c/Users/zesty/OneDrive/Desktop/statsx/statsx/my-app/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(t.t.bind(t,90996,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(t.bind(t,57481))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],d=["/mnt/c/Users/zesty/OneDrive/Desktop/statsx/statsx/my-app/app/player-stats/page.tsx"],x="/player-stats/page",m={require:t,loadChunk:()=>Promise.resolve()},p=new r.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/player-stats/page",pathname:"/player-stats",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},70451:(e,s,t)=>{Promise.resolve().then(t.bind(t,79005))},13371:(e,s,t)=>{Promise.resolve().then(t.bind(t,39177)),Promise.resolve().then(t.t.bind(t,34080,23))},71171:(e,s,t)=>{Promise.resolve().then(t.t.bind(t,63642,23)),Promise.resolve().then(t.t.bind(t,87586,23)),Promise.resolve().then(t.t.bind(t,47838,23)),Promise.resolve().then(t.t.bind(t,58057,23)),Promise.resolve().then(t.t.bind(t,77741,23)),Promise.resolve().then(t.t.bind(t,13118,23))},79005:(e,s,t)=>{"use strict";t.r(s),t.d(s,{default:()=>y});var r=t(97247),a=t(28964),l=t(27757),n=t(70170),i=t(58053),o=t(2749),c=t(69331),d=t(90486),x=t(50511),m=t(67579),p=t(389),u=t(5271);let h=(0,t(26323).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);var g=t(12169);function y(){let[e,s]=(0,a.useState)(""),[t,y]=(0,a.useState)([]),[f,b]=(0,a.useState)([]),[j,v]=(0,a.useState)({}),[N,w]=(0,a.useState)(""),[k,_]=(0,a.useState)(!1),[P,R]=(0,a.useState)(""),[S,z]=(0,a.useState)("rushing_yards"),[A,C]=(0,a.useState)(null),[Z,E]=(0,a.useState)(!1),q=e=>e.toLowerCase().replace(/[-.`']/g,"").trim(),D=async e=>{if(!e){y([]);return}try{let{data:s}=await g.Z.from("player_list").select("player_name"),t=q(e),r=s.filter(e=>q(e.player_name).includes(t));y(r.map(e=>e.player_name))}catch(e){console.error("Error fetching suggestions:",e.message)}},I=async e=>{try{console.log("Fetching averages for player:",e);let{data:s,error:t}=await g.Z.from("player_averages").select("*").ilike("player_name",`%${e}%`);if(t)throw console.error("Error fetching player averages:",t.message),Error("Failed to fetch player averages.");if(!s||0===s.length)throw Error("No average data available for the selected player.");let r={};return s.forEach(e=>{Object.keys(e).forEach(s=>{"number"==typeof e[s]&&(r[s.replace(/^avg_/,"")]=e[s])})}),console.log("Fetched averages (normalized):",r),r}catch(e){throw console.error("Error in fetchPlayerAverages:",e.message),e}},Y=async()=>{_(!0),R("");try{let s=q(e);console.log("Normalized Player Name:",s);let t=await I(s);v(t);let{data:r,error:a}=await g.Z.from("player_stats").select("*").ilike("player_name",`%${s}%`);if(a)throw console.error("Error fetching weekly stats:",a.message),Error("Failed to fetch player stats.");if(!r||0===r.length)throw Error("No weekly stats available for the selected player.");E(!0),console.log("Weekly stats:",r),b(r.sort((e,s)=>e.week-s.week)),w(r[0]?.position_id||"")}catch(e){console.error("Error in fetchPlayerStats:",e.message),R(e.message||"Failed to fetch player stats.")}finally{_(!1)}},F=(e,s,t)=>(console.log(`Key: ${t}, Value: ${e}, Avg: ${s}`),"number"!=typeof e||"number"!=typeof s)?"text-gray-500":"passing_tds"===t?e>=2?"text-green-500":1===e?"text-yellow-500":"text-red-500":"rushing_tds"===t||"receiving_tds"===t?e>0?"text-green-500":"text-red-500":e>s+1.5?"text-green-500":1.5>=Math.abs(e-s)?"text-yellow-500":e<s-1.5?"text-red-500":"text-gray-500",O=()=>"QB"===N?[{label:"Passing Attempts",key:"passing_attempts"},{label:"Completions",key:"completions"},{label:"Passing Yards",key:"passing_yards"},{label:"Passing TDs",key:"passing_tds"},{label:"Interceptions",key:"interceptions"},{label:"Rushing Attempts",key:"rushing_attempts"},{label:"Rushing Yards",key:"rushing_yards"},{label:"Rushing TDs",key:"rushing_tds"}]:"WR"===N||"TE"===N?[{label:"Targets",key:"targets"},{label:"Receptions",key:"receptions"},{label:"Receiving Yards",key:"receiving_yards"},{label:"Receiving TDs",key:"receiving_tds"},{label:"Rushing Attempts",key:"rushing_attempts"},{label:"Rushing Yards",key:"rushing_yards"},{label:"Rushing TDs",key:"rushing_tds"}]:"RB"===N?[{label:"Rushing Attempts",key:"rushing_attempts"},{label:"Rushing Yards",key:"rushing_yards"},{label:"Rushing TDs",key:"rushing_tds"},{label:"Targets",key:"targets"},{label:"Receptions",key:"receptions"},{label:"Receiving Yards",key:"receiving_yards"},{label:"Receiving TDs",key:"receiving_tds"}]:[],$=(e,s)=>0===s?0:(e-s)/s*100,T=e=>{let s=e.toFixed(1);return e>0?`+${s}%`:`${s}%`},V=e=>e>1?"text-green-500":e<-1?"text-red-500":"text-yellow-500";return(0,r.jsxs)("div",{className:"flex-grow space-y-8",children:[(0,r.jsxs)("div",{className:"flex items-center justify-center space-x-2",children:[r.jsx(u.Z,{className:"w-8 h-8 text-blue-400"}),r.jsx("h1",{className:"text-4xl font-bold text-center text-blue-400",children:"Player Stats"})]}),(0,r.jsxs)(l.Zb,{className:"bg-gray-800 border-blue-400",children:[r.jsx(l.Ol,{children:(0,r.jsxs)(l.ll,{className:"text-blue-400 flex items-center space-x-2",children:[r.jsx(h,{className:"w-6 h-6"}),r.jsx("span",{children:"Find Player"})]})}),r.jsx(l.aY,{children:(0,r.jsxs)("form",{onSubmit:e=>{e.preventDefault(),Y()},className:"space-y-4",children:[(0,r.jsxs)("div",{className:"relative",children:[r.jsx(n.I,{type:"text",placeholder:"Enter player name",value:e,onChange:e=>{s(e.target.value),D(e.target.value)},className:"bg-gray-700 text-gray-100 border-gray-600 max-w-md"}),t.length>0&&r.jsx("ul",{className:"absolute z-10 bg-gray-700 border border-gray-600 max-w-md mt-1 rounded shadow-lg",children:t.map((e,t)=>r.jsx("li",{onClick:()=>{s(e),y([])},className:"px-4 py-2 text-gray-100 cursor-pointer hover:bg-gray-600",children:e},t))})]}),r.jsx(i.z,{type:"submit",className:"w-full bg-blue-600 hover:bg-blue-700 text-white",children:"Search"})]})})]}),Z&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[(0,r.jsxs)(l.Zb,{className:"bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg",children:[r.jsx(l.Ol,{children:r.jsx(l.ll,{className:"text-blue-400 text-2xl font-bold",children:"Performance Trend"})}),r.jsx(l.aY,{children:r.jsx("div",{className:"space-y-4 p-4",children:["RB","WR","TE"].includes(N)?r.jsx(r.Fragment,{children:["rushing_attempts","rushing_yards","receptions","receiving_yards"].map(e=>{let s={rushing_attempts:"Rushing Attempts",rushing_yards:"Rushing Yards",receptions:"Receptions",receiving_yards:"Receiving Yards"};return(0,r.jsxs)("div",{children:[(0,r.jsxs)("div",{className:"flex justify-between items-center",children:[(0,r.jsxs)("span",{className:"text-gray-300 font-semibold",children:["Average ",s[e]]}),r.jsx("span",{className:"text-blue-400 text-xl font-bold",children:(j[e]||0).toFixed(1)})]}),(0,r.jsxs)("div",{className:"flex justify-between items-center",children:[(0,r.jsxs)("span",{className:"text-gray-300 font-semibold",children:["Last 3 ",s[e]," (% diff)"]}),r.jsx("span",{className:`text-xl font-bold ${f.length>=3?V($(f.slice(-3).reduce((s,t)=>s+(t[e]||0),0)/3,j[e]||0)):"text-gray-400"}`,children:f.length>=3?T($(f.slice(-3).reduce((s,t)=>s+(t[e]||0),0)/3,j[e]||0)):"N/A"})]})]},e)})}):"QB"===N?r.jsx(r.Fragment,{children:["passing_attempts","completions","passing_yards","rushing_yards","rushing_attempts"].map(e=>{let s={passing_attempts:"Passing Attempts",completions:"Completions",passing_yards:"Passing Yards",rushing_yards:"Rushing Yards",rushing_attempts:"Rushing Attempts"};return(0,r.jsxs)("div",{children:[(0,r.jsxs)("div",{className:"flex justify-between items-center",children:[(0,r.jsxs)("span",{className:"text-gray-300 font-semibold",children:["Average ",s[e]]}),r.jsx("span",{className:"text-blue-400 text-xl font-bold",children:(j[e]||0).toFixed(1)})]}),(0,r.jsxs)("div",{className:"flex justify-between items-center",children:[(0,r.jsxs)("span",{className:"text-gray-300 font-semibold",children:["Last 3 ",s[e]," (% diff)"]}),r.jsx("span",{className:`text-xl font-bold ${f.length>=3?V($(f.slice(-3).reduce((s,t)=>s+(t[e]||0),0)/3,j[e]||0)):"text-gray-400"}`,children:f.length>=3?T($(f.slice(-3).reduce((s,t)=>s+(t[e]||0),0)/3,j[e]||0)):"N/A"})]})]},e)})}):r.jsx("p",{className:"text-gray-400 text-center",children:"Select a valid position (RB, WR, TE, QB) to see stats."})})})]}),(0,r.jsxs)(l.Zb,{className:"bg-gradient-to-bl from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg",children:[r.jsx(l.Ol,{children:r.jsx(l.ll,{className:"text-blue-400 text-2xl font-bold flex items-center",children:"Season Overview"})}),(0,r.jsxs)(l.aY,{children:[(0,r.jsxs)("div",{className:"mb-4",children:[r.jsx("label",{className:"text-gray-400",children:"Select Stat:"}),(0,r.jsxs)("select",{className:"w-full bg-gray-700 text-gray-100 border-gray-600 rounded px-4 py-2",value:S,onChange:e=>z(e.target.value),children:[r.jsx("option",{value:"receiving_yards",children:"Receiving Yards"}),r.jsx("option",{value:"rushing_yards",children:"Rushing Yards"}),r.jsx("option",{value:"receptions",children:"Receptions"}),r.jsx("option",{value:"rushing_attempts",children:"Rushing Attempts"}),r.jsx("option",{value:"passing_yards",children:"Passing Yards"}),r.jsx("option",{value:"passing_attempts",children:"Passing Attempts"}),r.jsx("option",{value:"completions",children:"Completions"})]})]}),(0,r.jsxs)("div",{className:"mb-4",children:[r.jsx("label",{className:"text-gray-400",children:"Select a Line:"}),r.jsx("input",{type:"number",className:"w-full bg-gray-700 text-gray-100 border-gray-600 rounded px-4 py-2",value:A??"",onChange:e=>C(Number(e.target.value)||0),placeholder:"Enter a value"})]}),(0,r.jsxs)(o.w,{width:300,height:200,data:f.map(e=>({week:`Week ${e.week}`,weeklyValue:e[S]||0,averageValue:j[S]?Math.round(10*j[S])/10:0,customValue:A||null})),className:"mx-auto",margin:{top:5,right:20,bottom:5,left:0},children:[r.jsx(c.q,{strokeDasharray:"3 3"}),r.jsx(d.K,{dataKey:"week",stroke:"#8884d8"}),r.jsx(x.B,{stroke:"#8884d8"}),r.jsx(m.u,{}),r.jsx(p.x,{type:"monotone",dataKey:"weeklyValue",stroke:"#82ca9d",strokeWidth:2,dot:!0,name:"Weekly Value"}),r.jsx(p.x,{type:"monotone",dataKey:"averageValue",stroke:"#8884d8",strokeWidth:2,dot:!1,name:"Average Value"}),A&&r.jsx(p.x,{type:"monotone",dataKey:"customValue",stroke:"#ff7300",strokeWidth:2,dot:!1,name:"Custom Value"})]})]})]})]}),(0,r.jsxs)(l.Zb,{className:"bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg",children:[r.jsx(l.Ol,{children:r.jsx(l.ll,{className:"text-blue-400 text-2xl font-bold flex items-center",children:"Player Statistics"})}),(0,r.jsxs)(l.aY,{children:[k&&r.jsx("p",{className:"text-gray-400",children:"Loading stats..."}),P&&r.jsx("p",{className:"text-red-500",children:P}),f.length>0&&r.jsx("div",{className:"overflow-x-auto",children:(0,r.jsxs)("table",{className:"w-full text-sm text-left text-gray-300",children:[r.jsx("thead",{className:"text-xs uppercase bg-gray-700 text-gray-400",children:(0,r.jsxs)("tr",{children:[r.jsx("th",{className:"px-6 py-3",children:"Week"}),O().map(e=>r.jsx("th",{className:"px-6 py-3",children:e.label},e.key))]})}),r.jsx("tbody",{children:f.map((e,s)=>(0,r.jsxs)("tr",{className:"border-b bg-gray-800 border-gray-700",children:[r.jsx("td",{className:"px-6 py-4 font-medium text-white whitespace-nowrap",children:e.week}),O().map(s=>r.jsx("td",{className:`px-6 py-4 ${F(e[s.key],j[s.key],s.key)}`,children:void 0!==e[s.key]?e[s.key]:"N/A"},s.key))]},s))})]})})]})]})]})]})}},12169:(e,s,t)=>{"use strict";t.d(s,{Z:()=>l});var r=t(66210);let a="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyc3RybHVkZXB1YWhwb3Z4cHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NjA5OTcsImV4cCI6MjA0NzEzNjk5N30.zi3dWGxLif4__7tSOn2-r2nS1wZI_SLBUpHGMpKMznI",l=(0,r.eI)("https://xrstrludepuahpovxpzb.supabase.co",a,{headers:{"Content-Type":"application/json",apikey:a,Authorization:`Bearer ${a}`}})},39177:(e,s,t)=>{"use strict";t.d(s,{default:()=>d});var r=t(97247),a=t(79906),l=t(35216),n=t(56460),i=t(97792),o=t(5271),c=t(34178);function d(){let e=(0,c.usePathname)(),s=s=>e===s?"text-blue-400 font-bold":"text-gray-100 hover:text-blue-400";return r.jsx("header",{className:"bg-gray-800 text-gray-100 shadow-lg border-b-2 border-blue-500",children:r.jsx("div",{className:"container mx-auto px-4 py-4",children:(0,r.jsxs)("div",{className:"flex items-center justify-between",children:[(0,r.jsxs)(a.default,{href:"/",className:"flex items-center space-x-2",children:[r.jsx(l.Z,{className:"w-8 h-8 text-blue-400"}),r.jsx("span",{className:"text-2xl font-bold text-blue-400",children:"StatsX"})]}),r.jsx("nav",{children:(0,r.jsxs)("ul",{className:"flex space-x-6",children:[r.jsx("li",{children:(0,r.jsxs)(a.default,{href:"/",className:`flex items-center space-x-1 transition-colors ${s("/")}`,children:[r.jsx(n.Z,{className:"w-5 h-5"}),r.jsx("span",{children:"Home"})]})}),r.jsx("li",{children:(0,r.jsxs)(a.default,{href:"/defense-analysis",className:`flex items-center space-x-1 transition-colors ${s("/defense-analysis")}`,children:[r.jsx(i.Z,{className:"w-5 h-5"}),r.jsx("span",{children:"Defense"})]})}),r.jsx("li",{children:(0,r.jsxs)(a.default,{href:"/player-stats",className:`flex items-center space-x-1 transition-colors ${s("/player-stats")}`,children:[r.jsx(o.Z,{className:"w-5 h-5"}),r.jsx("span",{children:"Players"})]})}),r.jsx("li",{children:(0,r.jsxs)(a.default,{href:"/player-projections",className:`flex items-center space-x-1 transition-colors ${s("/player-projections")}`,children:[r.jsx(l.Z,{className:"w-5 h-5"}),r.jsx("span",{children:"Projections"})]})})]})})]})})})}},58053:(e,s,t)=>{"use strict";t.d(s,{z:()=>c});var r=t(97247),a=t(28964),l=t(69008),n=t(87972),i=t(25008);let o=(0,n.j)("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",{variants:{variant:{default:"bg-primary text-primary-foreground shadow hover:bg-primary/90",destructive:"bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",outline:"border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",secondary:"bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",ghost:"hover:bg-accent hover:text-accent-foreground",link:"text-primary underline-offset-4 hover:underline"},size:{default:"h-9 px-4 py-2",sm:"h-8 rounded-md px-3 text-xs",lg:"h-10 rounded-md px-8",icon:"h-9 w-9"}},defaultVariants:{variant:"default",size:"default"}}),c=a.forwardRef(({className:e,variant:s,size:t,asChild:a=!1,...n},c)=>{let d=a?l.g7:"button";return r.jsx(d,{className:(0,i.cn)(o({variant:s,size:t,className:e})),ref:c,...n})});c.displayName="Button"},27757:(e,s,t)=>{"use strict";t.d(s,{Ol:()=>i,Zb:()=>n,aY:()=>c,ll:()=>o});var r=t(97247),a=t(28964),l=t(25008);let n=a.forwardRef(({className:e,...s},t)=>r.jsx("div",{ref:t,className:(0,l.cn)("rounded-xl border bg-card text-card-foreground shadow",e),...s}));n.displayName="Card";let i=a.forwardRef(({className:e,...s},t)=>r.jsx("div",{ref:t,className:(0,l.cn)("flex flex-col space-y-1.5 p-6",e),...s}));i.displayName="CardHeader";let o=a.forwardRef(({className:e,...s},t)=>r.jsx("div",{ref:t,className:(0,l.cn)("font-semibold leading-none tracking-tight",e),...s}));o.displayName="CardTitle",a.forwardRef(({className:e,...s},t)=>r.jsx("div",{ref:t,className:(0,l.cn)("text-sm text-muted-foreground",e),...s})).displayName="CardDescription";let c=a.forwardRef(({className:e,...s},t)=>r.jsx("div",{ref:t,className:(0,l.cn)("p-6 pt-0",e),...s}));c.displayName="CardContent",a.forwardRef(({className:e,...s},t)=>r.jsx("div",{ref:t,className:(0,l.cn)("flex items-center p-6 pt-0",e),...s})).displayName="CardFooter"},70170:(e,s,t)=>{"use strict";t.d(s,{I:()=>n});var r=t(97247),a=t(28964),l=t(25008);let n=a.forwardRef(({className:e,type:s,...t},a)=>r.jsx("input",{type:s,className:(0,l.cn)("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",e),ref:a,...t}));n.displayName="Input"},25008:(e,s,t)=>{"use strict";t.d(s,{cn:()=>l});var r=t(61929),a=t(35770);function l(...e){return(0,a.m6)((0,r.W)(e))}},67739:(e,s,t)=>{"use strict";t.r(s),t.d(s,{default:()=>p,metadata:()=>m});var r=t(72051),a=t(31312),l=t.n(a);t(67272);let n=(0,t(45347).createProxy)(String.raw`/mnt/c/Users/zesty/OneDrive/Desktop/statsx/statsx/my-app/components/Header.tsx#default`);var i=t(92349),o=t(62256),c=t(45479),d=t(61755);function x(){return r.jsx("footer",{className:"bg-gray-800 text-gray-100 border-t border-gray-700",children:r.jsx("div",{className:"container mx-auto px-4 py-4",children:(0,r.jsxs)("div",{className:"flex flex-wrap justify-between items-start space-y-4 md:space-y-0",children:[r.jsx("div",{className:"w-full md:w-auto mb-4 md:mb-0",children:(0,r.jsxs)("p",{className:"text-sm",children:["\xa9 ",new Date().getFullYear()," StatsX. All rights reserved."]})}),(0,r.jsxs)("div",{children:[r.jsx("h3",{className:"text-sm font-semibold mb-2 text-blue-400",children:"Quick Links"}),(0,r.jsxs)("div",{className:"flex space-x-4",children:[r.jsx(i.default,{href:"/",className:"text-sm hover:text-blue-400 transition-colors",children:"Home"}),r.jsx(i.default,{href:"/defense-analysis",className:"text-sm hover:text-blue-400 transition-colors",children:"Defense"}),r.jsx(i.default,{href:"/player-stats",className:"text-sm hover:text-blue-400 transition-colors",children:"Players"}),r.jsx(i.default,{href:"/player-projections",className:"text-sm hover:text-blue-400 transition-colors",children:"Projections"})]})]}),(0,r.jsxs)("div",{children:[r.jsx("h3",{className:"text-sm font-semibold mb-2 text-blue-400",children:"Connect With Us"}),(0,r.jsxs)("div",{className:"flex space-x-3",children:[r.jsx("a",{href:"https://github.com/alexrendlerCS",target:"_blank",rel:"noopener noreferrer",className:"hover:text-blue-400 transition-colors",children:r.jsx(o.Z,{className:"w-5 h-5"})}),r.jsx("a",{href:"https://www.linkedin.com/in/alex-rendler/",target:"_blank",rel:"noopener noreferrer",className:"hover:text-blue-400 transition-colors",children:r.jsx(c.Z,{className:"w-5 h-5"})}),r.jsx("a",{href:"mailto:alexrendler@yahoo.com",className:"hover:text-blue-400 transition-colors",children:r.jsx(d.Z,{className:"w-5 h-5"})})]})]})]})})})}let m={title:"StatsX - NFL Stat Analyzer",description:"Analyze NFL team and player statistics"};function p({children:e}){return r.jsx("html",{lang:"en",className:"dark",children:(0,r.jsxs)("body",{className:`${l().className} bg-gray-900 text-gray-100 flex flex-col min-h-screen`,children:[r.jsx(n,{}),r.jsx("main",{className:"container mx-auto px-4 py-8 flex-grow",children:e}),r.jsx(x,{})]})})}},98471:(e,s,t)=>{"use strict";t.r(s),t.d(s,{default:()=>r});let r=(0,t(45347).createProxy)(String.raw`/mnt/c/Users/zesty/OneDrive/Desktop/statsx/statsx/my-app/app/player-stats/page.tsx#default`)},57481:(e,s,t)=>{"use strict";t.r(s),t.d(s,{default:()=>a});var r=t(54564);let a=e=>[{type:"image/x-icon",sizes:"608x589",url:(0,r.fillMetadataSegment)(".",e.params,"favicon.ico")+""}]},67272:()=>{}};var s=require("../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),r=s.X(0,[379,1,946,566],()=>t(50620));module.exports=r})();