'use client';
import {useState} from 'react';
import {connectors,hex8,identifiers} from './sff8024-data';
import {registerHref} from './mechanism-data';

type Kind='enum-id'|'ascii'|'oui'|'power-class'|'power'|'length'|'enum-connector'|'attenuation'|'lane-map'|'topology'|'technology'|'mci'|'reserved'|'checksum'|'custom';
type Region={address:string;title:string;format:string;role:string;impact:string;sample:string;kind:Kind};
const regions:Region[]=[
 {address:'00h:128',title:'Identifier 副本',format:'SFF-8024 枚举 · U8',role:'模块形态识别',impact:'应与 Lower:0 一致；主机据此识别模块类型。',sample:'18',kind:'enum-id'},
 {address:'00h:129–144',title:'Vendor Name',format:'16 字节 ASCII',role:'厂商身份',impact:'可能进入主机资产信息或厂商兼容策略；CMIS 不规定白名单行为。',sample:'4E 41 44 44 4F 44 20 20 20 20 20 20 20 20 20 20',kind:'ascii'},
 {address:'00h:145–147',title:'Vendor OUI',format:'24-bit IEEE OUI',role:'厂商身份',impact:'已指定时应与 Vendor Name 对应同一公司；不按 ASCII。',sample:'00 1B 21',kind:'oui'},
 {address:'00h:148–163',title:'Vendor Part Number',format:'16 字节 ASCII',role:'产品型号',impact:'改变后主机看到的 PN 会变化；具体兼容识别取决于主机实现。',sample:'41 43 43 2D 38 30 30 47 20 20 20 20 20 20 20 20',kind:'ascii'},
 {address:'00h:164–165',title:'Vendor Revision',format:'2 字节 ASCII',role:'产品修订标识',impact:'与二进制固件版本及 CMIS Revision 使用不同编码。',sample:'41 31',kind:'ascii'},
 {address:'00h:166–181',title:'Vendor Serial Number',format:'16 字节 ASCII',role:'单件追溯',impact:'改变序列号身份；没有标准化控制效果。',sample:'31 32 33 34 35 36 37 38 20 20 20 20 20 20 20 20',kind:'ascii'},
 {address:'00h:182–189',title:'Date Code',format:'8 字节 ASCII · YYMMDDLL',role:'制造日期与批次',impact:'需要同时检查数字字符和实际日期合法性。',sample:'32 36 30 39 31 30 41 31',kind:'ascii'},
 {address:'00h:190–199',title:'CLEI Code',format:'10 字节 ASCII',role:'设备识别',impact:'可选；不支持时应全部为 20h 空格。',sample:'20 20 20 20 20 20 20 20 20 20',kind:'ascii'},
 {address:'00h:200',title:'Module Power Class',format:'Bit[7:5] 枚举 + Reserved',role:'形态相关功耗等级',impact:'主机可以参考，但 CMIS 建议优先依据 MaxPower。',sample:'60',kind:'power-class'},
 {address:'00h:201',title:'Maximum Power',format:'U8 × 0.25 W',role:'最大功耗声明',impact:'用于主机在允许 High Power Mode 前进行功耗准入。',sample:'28',kind:'power'},
 {address:'00h:202',title:'Cable Assembly Link Length',format:'2-bit 倍率 + 6-bit 基础值',role:'固定线缆长度',impact:'参与线缆识别和链路策略；00h 未定义，FFh 表示大于 6300 m。',sample:'19',kind:'length'},
 {address:'00h:203',title:'Connector Type',format:'SFF-8024 枚举 · U8',role:'媒体连接器类型',impact:'主机可据此区分可分离连接器与固定线缆。',sample:'23',kind:'enum-connector'},
 {address:'00h:204–208',title:'Copper Cable Attenuation',format:'每字节 U8 · 1 dB/LSB',role:'指定频点衰减声明',impact:'主机可能据此选择 SerDes 增益或均衡策略；CMIS 不规定主机算法。',sample:'03 04 07 0D 18',kind:'attenuation'},
 {address:'00h:209',title:'Reserved',format:'固定为 00h',role:'保留',impact:'不能作为第六个衰减值或厂商功能。',sample:'00',kind:'reserved'},
 {address:'00h:210',title:'Media Lane Unsupported',format:'8-bit Lane 位图',role:'近端 Media Lane 能力声明',impact:'1 表示不支持该 Lane；不等同于关闭 Lane 的控制命令。',sample:'00',kind:'lane-map'},
 {address:'00h:211',title:'Far-end Configuration',format:'Bit[4:0] 拓扑枚举',role:'固定远端 breakout 拓扑',impact:'描述物理分支关系；不会动态改变线缆连接。',sample:'03',kind:'topology'},
 {address:'00h:212',title:'Media Interface Technology',format:'CMIS 枚举 · U8',role:'激光器或铜缆技术',impact:'可参与介质识别；15h–FFh 为 Reserved。',sample:'12',kind:'technology'},
 {address:'00h:213',title:'SPI MCI Flow Control',format:'1-bit 模式 + 7-bit 参数',role:'SPI 管理事务流控',impact:'只对 SPIMCI 有效，并与 Lower:27 的 SPI 速度联合计算。',sample:'05',kind:'mci'},
 {address:'00h:214–220',title:'Reserved',format:'7 字节固定 00h',role:'保留',impact:'CMIS 没有给出普通或厂商语义。',sample:'00 00 00 00 00 00 00',kind:'reserved'},
 {address:'00h:221',title:'Custom Static Information',format:'厂商定义 · 1 字节',role:'静态厂商信息',impact:'计入 Page Checksum；没有厂商字段表时只能保留原始值。',sample:'00',kind:'custom'},
 {address:'00h:222',title:'Page Checksum',format:'sum(128…221) & FFh',role:'静态数据完整性',impact:'必须与完整覆盖区一起验证；不覆盖 223–255。',sample:'00',kind:'checksum'},
 {address:'00h:223–255',title:'Custom Non-volatile Information',format:'厂商定义 · 33 字节',role:'持久化厂商/转售商信息',impact:'复位和掉电后保留；ASCII 只能作为预览，不能据此推定结构。',sample:'00 00 00 00',kind:'custom'},
];
function parse(region:Region,raw:string){const parts=raw.trim().split(/[\s,;]+/).filter(Boolean);if(!parts.length||parts.some(x=>!/^(?:0x)?[0-9a-f]{1,2}h?$/i.test(x)))return ['请输入以空格分隔的 00–FF 十六进制字节。'];const bytes=parts.map(x=>parseInt(x.replace(/^0x/i,'').replace(/h$/i,''),16));const v=bytes[0];const ascii=bytes.map(x=>x>=32&&x<=126?String.fromCharCode(x):x===0?'␀':'·').join('');
 if(region.kind==='ascii')return [`ASCII：${JSON.stringify(ascii)}`,`去除右侧 20h 填充：${JSON.stringify(ascii.replace(/ +$/,''))}`,`输入 ${bytes.length} 字节；规定长度见数据格式。`];
 if(region.kind==='oui')return [`OUI：${bytes.slice(0,3).map(hex8).join('-')}`,bytes.slice(0,3).every(x=>x===0)?'全零：OUI 未指定。':'这是 24-bit 公司标识，不按 ASCII 解码。'];
 if(region.kind==='power-class')return [`Power Class ${(v>>5)+1}`,`Reserved[4:0] = ${v&31}${v&31?'，非零不符合规定。':'，符合规定。'}`];
 if(region.kind==='power')return [`MaxPower = ${v} × 0.25 W = ${(v*.25).toFixed(2)} W`,'这是最大功耗声明，不是实时功耗设置。'];
 if(region.kind==='length'){if(v===255)return ['FFh：线缆长度大于 6300 m。'];const mult=[.1,1,10,100][v>>6],base=v&63;return [`倍率 ×${mult}；基础值 ${base} m`,base?`实际长度 ${base*mult} m`:'基础值 0：长度未定义。'];}
 if(region.kind==='attenuation')return bytes.map((x,i)=>`${['5','7','12.9','25.8','53.125'][i]||'?'} GHz：${x===0?'数据不可用':x+' dB'}`);
 if(region.kind==='lane-map')return [`不支持的 Media Lane：${Array.from({length:8},(_,i)=>v&(1<<i)?i+1:0).filter(Boolean).join('、')||'无'}`,'位值 1 是不支持声明。'];
 if(region.kind==='topology'){const code=v&31;return [`拓扑编码 ${hex8(code)}；Reserved[7:5]=${v>>5}`,code===0?'可分离介质或拓扑未定义':code===31?'Custom：需厂商定义':code>=28?'Reserved':code===27?'远端含 16-Lane connector':`CMIS Table 8-38 的 Lane 分组方案 ${code}`];}
 if(region.kind==='technology'){const names=['850 nm VCSEL','1310 nm VCSEL','1550 nm VCSEL','1310 nm FP laser','1310 nm DFB laser','1550 nm DFB laser','1310 nm EML','1550 nm EML','Others','1490 nm DFB laser','Passive copper unequalized','Passive copper equalized','Near/far limiting EQ','Far limiting EQ','Near limiting EQ','Linear active EQ (deprecated)','C-band tunable','L-band tunable','Near/far linear EQ','Far linear EQ','Near linear EQ'];return [v<=20?names[v]:'Reserved（15h–FFh）'];}
 if(region.kind==='mci'){const n=v&127;return v&128?[`Speed-dependent：D=${(n*.2).toFixed(1)} μs`,'dummy byte 数还需 Lower:27 的 SPI 速度。']:[`Static：N=2+${n}=${n+2} dummy bytes`];}
 if(region.kind==='enum-id'){const x=identifiers.find(x=>x.code===v);return [x?`${hex8(v)} · ${x.name}`:'当前 SFF-8024 列表未命中该值。'];}
 if(region.kind==='enum-connector'){const x=connectors.find(x=>x.code===v);return [x?`${hex8(v)} · ${x.name}`:'当前 SFF-8024 列表未命中该值。'];}
 if(region.kind==='checksum')return [`读回校验字节：${hex8(v)}`,'仅凭这一字节不能验证；还需要 00h:128–221 的完整数据。'];
 if(region.kind==='custom')return [`Raw：${bytes.map(hex8).join(' ')}`,`ASCII 辅助预览：${JSON.stringify(ascii)}`,'CMIS 未定义这些字节的内部字段或控制副作用。'];
 return [`Raw：${bytes.map(hex8).join(' ')}`,bytes.every(x=>x===0)?'全部为 00h，符合 Reserved 要求。':'含非零 Reserved 数据，不应解释为功能。'];
}
export function AdministrativeWorkbench(){const [selected,setSelected]=useState(0);const region=regions[selected];const [raw,setRaw]=useState(region.sample);const choose=(i:number)=>{setSelected(i);setRaw(regions[i].sample)};return <section className="admin-workbench"><nav><h2>Page 00h 区域</h2>{regions.map((x,i)=><button className={i===selected?'selected':''} onClick={()=>choose(i)} key={x.address}><code>{x.address.replace('00h:','')}</code><span>{x.title}</span></button>)}</nav><article><div className="admin-region-head"><div><span>{region.role}</span><h2>{region.title}</h2><code>{region.address}</code></div><a href={registerHref(region.address)}>逐位查看 →</a></div><div className="admin-meta"><div><span>数据格式</span><b>{region.format}</b></div><div><span>字段性质</span><b>RO / Static</b></div><div><span>可能影响</span><b>{region.impact}</b></div></div><label className="admin-input">输入读回十六进制字节<textarea value={raw} onChange={e=>setRaw(e.target.value.toUpperCase())} spellCheck={false}/></label><div className="admin-result"><span>当前值解释</span>{parse(region,raw).map((x,i)=><p key={i}><i>{i?'→':'i'}</i>{x}</p>)}</div><p className="source-line">CMIS 5.3 · §8.3 · Tables 8-26–8-41</p></article></section>}
