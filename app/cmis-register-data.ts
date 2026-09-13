import { enrichFields } from "./precise-fields";
export type Requirement = "强制" | "条件强制" | "可选" | "推荐" | "允许" | "Reserved" | "待解析";

export type FieldDef = {
  address: string;
  bits: string;
  name: string;
  access: string;
  level: Requirement;
  meaning: string;
  values?: string[];
  note?: string;
};

export type RangeDef = {
  start: number;
  end: number;
  label: string;
  access: string;
  level: Requirement;
  summary: string;
  fields?: FieldDef[];
};

export type PageDef = {
  id: string;
  page: string;
  title: string;
  category: "基础" | "能力" | "Data Path" | "诊断" | "扩展" | "VDM" | "CDB";
  bank: string;
  access: string;
  level: Requirement;
  status: "逐字段" | "范围解析";
  ref: string;
  ranges: RangeDef[];
  notes: string[];
};

const f = (address:string,bits:string,name:string,access:string,level:Requirement,meaning:string,values?:string[],note?:string):FieldDef => ({address,bits,name,access,level,meaning,values,note});
const r = (start:number,end:number,label:string,access:string,level:Requirement,summary:string,fields?:FieldDef[]):RangeDef => ({start,end,label,access,level,summary,fields});

export const pageCatalog = [
  ["Lower","Lower Memory","固定映射","RW / RO / COR","§8.2"],
  ["00h","Administrative Information","非 Banked","RO","§8.3"],
  ["01h","Advertising","非 Banked","RO","§8.4"],
  ["02h","Thresholds Information","非 Banked","RO","§8.5"],
  ["03h","User NV RAM","非 Banked","RW","§8.6"],
  ["04h","Laser Capabilities Advertising","非 Banked","RO","§8.7"],
  ["05h","Restricted OIF · CMIS-FF","规范外部定义","—","§8.8"],
  ["06h–07h","Restricted OIF · Resource Modules","规范外部定义","—","表 8-1"],
  ["08h–0Bh","Restricted OIF · CMIS-LT","规范外部定义","—","表 8-1"],
  ["0Ch–0Fh","Reserved","不得访问","—","§8.1.3.1"],
  ["10h","Lane / Data Path Configuration","每 Bank 8 Lane；最多 4 Bank","RW","§8.9"],
  ["11h","Lane / Data Path Status","每 Bank 8 Lane；最多 4 Bank","RO / COR","§8.10"],
  ["12h","Tunable Laser Control / Status","可选 Banked","Mixed","§8.11"],
  ["13h","Module Performance Diagnostics Control","可选 Banked","RW","§8.12"],
  ["14h","Diagnostics Results","可选 Banked","RO / RWW","§8.13"],
  ["15h","Timing Characteristics","可选 Banked","RO","§8.14"],
  ["16h","Network Path Control / Status","可选 Banked","RW / RO","§8.15"],
  ["17h","Feature Flags / Masks","可选 Banked","RO/COR / RW","§8.16"],
  ["18h","Lane / Data Path Configuration Extensions","可选 Banked","RW","§8.17"],
  ["19h","Lane / Data Path Status Extensions","可选 Banked","RO","§8.18"],
  ["1Ah–1Bh","Restricted OIF · Resource Modules","规范外部定义","—","§8.19"],
  ["1Ch","Normalized Applications Advertising","每 Bank 15 个 NAD","RO","§8.20"],
  ["1Dh","Host Lane Switching","可选 Banked","Mixed","§8.21"],
  ["1Eh–1Fh","Custom","厂商定义","Mixed","表 8-1"],
  ["20h–23h","VDM Observable Descriptors","可选 Banked","RW / RO","§8.22"],
  ["24h–27h","VDM Samples","可选 Banked","RO","§8.22"],
  ["28h–2Bh","VDM Thresholds","可选 Banked","RW","§8.22"],
  ["2Ch","VDM FlagQuads","可选 Banked","RO/COR","§8.22"],
  ["2Dh","VDM MaskQuads","可选 Banked","RW","§8.22"],
  ["2Eh","Reserved","不得访问","—","§8.1.3.1"],
  ["2Fh","VDM Advertisement / Dynamic Control","可选 Banked","Mixed","§8.22"],
  ["30h–3Fh","Restricted OIF · C-CMIS","规范外部定义","—","表 8-1"],
  ["40h–4Fh","Restricted OIF · C-CMIS","规范外部定义","—","表 8-1"],
  ["50h–5Fh","Restricted OIF · CMIS-LT","规范外部定义","—","表 8-1"],
  ["60h–9Eh","Reserved","不得访问","—","§8.1.3.1"],
  ["9Fh","CDB Command / Reply LPL","每 CDB 实例一个 Bank；最多 2 Bank","RW","§8.23"],
  ["A0h–AFh","CDB Extended Payload","每 CDB 实例一个 Bank；最多 2 Bank","RW","§8.24"],
  ["B0h–FFh","Custom","厂商定义","Mixed","表 8-1"],
] as const;

const commonNotes = [
  "改变 Bank 时，BankSelect(00h:126) 与 PageSelect(00h:127)必须在同一个 WRITE 事务中写入。",
  "多字节数值默认按大端序解释，除非字段定义明确规定其他字节序。",
  "Accessible Reserved 字段在初始化时为 0；主机与模块均不得把 Reserved 当作功能字段使用。",
];

const basicApplicationFields: FieldDef[] = Array.from({length:8},(_,i)=>{
  const app=i+1,start=86+i*4;
  return [
    f(`Lower:${start}`,"7–0",`HostInterfaceIDApp${app}`,"RO",app<3?"强制":"条件强制",`AppSel ${app} 的 Host Electrical Interface ID；枚举值查 SFF-8024 R4.12 Table 4-5。`),
    f(`Lower:${start+1}`,"7–0",`MediaInterfaceIDApp${app}`,"RO",app<3?"强制":"条件强制",`AppSel ${app} 的 Media Interface ID；必须先用 Lower:85 MediaType 选择 SFF-8024 的 4-6/4-7/4-8/4-9 表。`),
    f(`Lower:${start+2}`,"7–4",`HostLaneCountApp${app}`,"RO",app<3?"强制":"条件强制","0h 表示由 HostInterfaceID 隐含；1h–8h 表示 1–8 条 Host Lane；9h–Fh Reserved。"),
    f(`Lower:${start+2}`,"3–0",`MediaLaneCountApp${app}`,"RO",app<3?"强制":"条件强制","0h 表示由 MediaInterfaceID 隐含；1h–8h 表示 1–8 条 Media Lane；9h–Fh Reserved。"),
    f(`Lower:${start+3}`,"7–0",`HostLaneAssignmentOptionsApp${app}`,"RO",app<3?"强制":"条件强制","Bit 0–7 对应 Host Lane 1–8；置 1 表示该 Application 实例可从对应 Lane 开始，随后 Lane 必须连续。"),
  ];
}).flat();

const mediaLaneOptionFields: FieldDef[] = Array.from({length:15},(_,i)=>f(`01h:${176+i}`,"7–0",`MediaLaneAssignmentOptionsApp${i+1}`,"RO","强制",`AppSel ${i+1} 的 Media 起始 Lane 位图：Bit 0–7 对应 Media Lane 1–8；置 1 表示允许从该 Lane 开始。`));

const additionalApplicationFields: FieldDef[] = Array.from({length:7},(_,i)=>{
  const app=i+9,start=223+i*4;
  return [
    f(`01h:${start}`,"7–0",`HostInterfaceIDApp${app}`,"RO","条件强制",`AppSel ${app} 的 Host Electrical Interface ID；枚举值查 SFF-8024 R4.12 Table 4-5。`),
    f(`01h:${start+1}`,"7–0",`MediaInterfaceIDApp${app}`,"RO","条件强制",`AppSel ${app} 的 Media Interface ID；解释表由 Lower:85 MediaType 选择。`),
    f(`01h:${start+2}`,"7–4",`HostLaneCountApp${app}`,"RO","条件强制","0h 隐含；1h–8h 表示 1–8 条 Host Lane；9h–Fh Reserved。"),
    f(`01h:${start+2}`,"3–0",`MediaLaneCountApp${app}`,"RO","条件强制","0h 隐含；1h–8h 表示 1–8 条 Media Lane；9h–Fh Reserved。"),
    f(`01h:${start+3}`,"7–0",`HostLaneAssignmentOptionsApp${app}`,"RO","条件强制","Bit 0–7 对应 Host Lane 1–8 的合法起始位置。"),
  ];
}).flat();

const noYes=(off:string,on:string)=>[`0b：${off}`,`1b：${on}`];
const durationEncoding=["0000b：< 1 ms","0001b：1–5 ms","0010b：5–10 ms","0011b：10–50 ms","0100b：50–100 ms","0101b：100–500 ms","0110b：500 ms–1 s","0111b：1–5 s","1000b：5–10 s","1001b：10 s–1 min","1010b：1–5 min","1011b：5–10 min","1100b：10–50 min","1101b：≥ 50 min","1110b–1111b：Reserved"];

const revisionFields:FieldDef[]=[
  f("01h:128","7–0","ModuleInactiveFirmwareMajorRevision","RO","强制","非活动固件主版本；无第二镜像时清零。"),
  f("01h:129","7–0","ModuleInactiveFirmwareMinorRevision","RO","强制","非活动固件次版本；128–129 不计入 Page Checksum。"),
  f("01h:130","7–0","ModuleHardwareMajorRevision","RO","强制","模块硬件主版本，U8。"),
  f("01h:131","7–0","ModuleHardwareMinorRevision","RO","强制","模块硬件次版本，U8。"),
];
const linkLengthFields:FieldDef[]=[
  f("01h:132","7–6","LengthMultiplierSMF","RO","强制","SMF 基础长度的倍率。",["00b：×0.1 km","01b：×1 km","10b：×10 km","11b：倍率由 01h:137.7–6 指定"]),
  f("01h:132","5–0","BaseLengthSMF","RO","强制","SMF 基础长度；与 Bits 7–6 的倍率相乘。"),
  f("01h:133","7–0","LengthOM5","RO","强制","OM5 最大长度，单位 2 m；00h 表示不支持/未声明。"),
  f("01h:134","7–0","LengthOM4","RO","强制","OM4 最大长度，单位 2 m；00h 表示不支持/未声明。"),
  f("01h:135","7–0","LengthOM3","RO","强制","OM3 最大长度，单位 2 m；00h 表示不支持/未声明。"),
  f("01h:136","7–0","LengthOM2","RO","强制","OM2 最大长度，单位 1 m；00h 表示不支持/未声明。"),
  f("01h:137","7–6","LengthMultiplierSMF2","RO","强制","LengthMultiplierSMF=11b 时使用的扩展倍率。",["00b：×50 km","01b：×100 km","10b：×200 km","11b：×500 km"]),
  f("01h:137","5–0","Reserved","RO","Reserved","必须为 0。"),
];
const supportedPageFields:FieldDef[]=[
  f("01h:142","7","NetworkPathPagesSupported","RO","强制","Page 16h 及 Page 17h 的 NP 部分支持声明。",noYes("不支持 Network Path Pages","支持 Page 16h/17h NP 功能")),
  f("01h:142","6","VDMPagesSupported","RO","强制","VDM Page 20h–2Fh 的入口声明；细节查 Page 2Fh。",noYes("不支持 VDM Pages","支持 VDM Pages")),
  f("01h:142","5","DiagnosticPagesSupported","RO","强制","Page 13h–14h 诊断功能声明。",noYes("不支持诊断 Pages","支持 Page 13h–14h")),
  f("01h:142","4","CoherentPagesSupported","RO","强制","C-CMIS Page 30h–4Fh 的入口声明。",noYes("不支持 C-CMIS Pages","支持 C-CMIS Pages；细节由外部规范定义")),
  f("01h:142","3","CmisFfSupported","RO","强制","Page 05h CMIS-FF 功能声明。",noYes("不支持 CMIS-FF","支持 Page 05h CMIS-FF")),
  f("01h:142","2","Page03hSupported","RO","强制","User NV RAM Page 03h 声明。",noYes("不支持 Page 03h","支持 Page 03h")),
  f("01h:142","1–0","BanksSupported","RO","强制","10h–2Fh 中按 8 Lane 分 Bank 的页面支持数量。",["00b：仅 Bank 0 · 8 Lane","01b：Bank 0–1 · 16 Lane","10b：Bank 0–3 · 32 Lane","11b：Reserved"]),
];
const durationFields:FieldDef[]=[
  f("01h:143","7–5","ModSelWaitTimeExponent","RO","强制","ModSel 等待时间指数 e；总时间=m×2^e μs。"),
  f("01h:143","4–0","ModSelWaitTimeMantissa","RO","强制","ModSel 等待时间尾数 m；00h 表示无数据。"),
  f("01h:144","7–4","MaxDurationDPDeinit","RO","强制","DPDeinit 最长持续时间。",durationEncoding),
  f("01h:144","3–0","MaxDurationDPInit","RO","强制","DPInit 最长持续时间。",durationEncoding),
];
const characteristicFields:FieldDef[]=[
  f("01h:145","7","CoolingImplemented","RO","强制","发射器是否采用制冷器件。",noYes("Uncooled transmitter","Cooled transmitter")),
  f("01h:145","6–5","TxInputClockingCapabilities","RO","强制","Host Tx Lane 的同步时钟分组。",["00b：Lane 1–8 同步","01b：Lane 1–4、5–8 两组","10b：1–2、3–4、5–6、7–8 四组","11b：各 Lane 可异步"]),
  f("01h:145","4","ePPSSupported","RO","强制","Enhanced PPS 定时信号支持。",noYes("不支持 ePPS","支持 ePPS")),
  f("01h:145","3","TimingPage15hSupported","RO","强制","Page 15h 时延特性支持。",noYes("不支持 Page 15h","支持 Page 15h")),
  f("01h:145","2","Aux3MonObservable","RO","强制","Aux3 监控量选择。",["0b：Laser Temperature","1b：Vcc2"]),
  f("01h:145","1","Aux2MonObservable","RO","强制","Aux2 监控量选择。",["0b：Laser Temperature","1b：TEC Current"]),
  f("01h:145","0","Aux1MonObservable","RO","强制","Aux1 监控量选择；这里包含标准字段中的 Custom 含义。",["0b：Custom Aux1 observable","1b：TEC Current"]),
  f("01h:146","7–0","ModuleTempMax","RO","条件强制","允许的最高模块温度，S8，单位 1 °C；Max=Min=0 表示未指定。"),
  f("01h:147","7–0","ModuleTempMin","RO","条件强制","允许的最低模块温度，S8，单位 1 °C。"),
  f("01h:148–149","15–0","PropagationDelay","RO","条件强制","不可分离 AOC 传播时延，U16，单位 10 ns；0 表示未指定。"),
  f("01h:150","7–0","OperatingVoltageMin","RO","条件强制","最低工作电压，U8，单位 20 mV；0 表示未指定。"),
  f("01h:151","7","OpticalDetectorType","RO","强制","光探测器类型。",["0b：PIN","1b：APD"]),
  f("01h:151","6–5","RxOutputEqType","RO","强制","Rx 输出均衡时保持不变的幅度定义。",["00b：保持 p-p / 未实现 / 无信息","01b：保持稳态幅度","10b：保持 p-p 与稳态幅度平均值","11b：Reserved"]),
  f("01h:151","4","RxPowerMeasurementType","RO","强制","Rx 光功率监控类型。",["0b：OMA","1b：Average power"]),
  f("01h:151","3","RxLOSType","RO","强制","Rx LOS 判据。",["0b：响应 OMA","1b：响应 Pav"]),
  f("01h:151","2","RxLOSIsFast","RO","强制","Rx LOS 响应时序。",noYes("常规时序","Fast mode 时序")),
  f("01h:151","1","TxDisableIsFast","RO","强制","Tx Disable 响应时序。",noYes("常规时序","Fast mode 时序")),
  f("01h:151","0","TxDisableIsModuleWide","RO","强制","Tx Disable 的作用粒度。",["0b：逐 Lane 控制","1b：任一 Lane 置位将禁用全部 Tx Lane"]),
  f("01h:152","7–0","CDRPowerSavedPerLane","RO","条件强制","每 Lane CDR bypass 的最小省电量，单位 0.01 W。"),
  f("01h:153","7","RxOutputLevel3Supported","RO","条件强制","Rx Amplitude Code 3 支持。",noYes("不支持 Code 3","支持 Code 3")),
  f("01h:153","6","RxOutputLevel2Supported","RO","条件强制","Rx Amplitude Code 2 支持。",noYes("不支持 Code 2","支持 Code 2")),
  f("01h:153","5","RxOutputLevel1Supported","RO","条件强制","Rx Amplitude Code 1 支持。",noYes("不支持 Code 1","支持 Code 1")),
  f("01h:153","4","RxOutputLevel0Supported","RO","条件强制","Rx Amplitude Code 0 支持。",noYes("不支持 Code 0","支持 Code 0")),
  f("01h:153","3–0","TxInputEqMax","RO","条件强制","Host-controlled Tx Input EQ 最大支持代码。",["0h：No equalization","1h–Ch：1–12 dB","Dh–Fh：Custom，具体 dB/算法由厂商定义"]),
  f("01h:154","7–4","RxOutputEqPostCursorMax","RO","条件强制","Rx Output EQ Post-cursor 最大支持代码。",["0h–7h：0–7 dB","8h–Ah：Reserved","Bh–Fh：Custom"]),
  f("01h:154","3–0","RxOutputEqPreCursorMax","RO","条件强制","Rx Output EQ Pre-cursor 最大支持代码。",["0h–7h：0–3.5 dB，步进 0.5 dB","8h–Ah：Reserved","Bh–Fh：Custom"]),
];
const controlAdvertisementFields:FieldDef[]=[
  f("01h:155","7","WavelengthIsControllable","RO","强制","是否支持主动波长控制。",noYes("不支持波长控制","支持主动波长控制")),
  f("01h:155","6","TransmitterIsTunable","RO","强制","是否为可调谐发射器；置 1 同时声明 Page 04h/12h。",noYes("不可调谐","可调谐，支持 Page 04h/12h")),
  f("01h:155","5–4","SquelchMethodTx","RO","强制","Tx 自动 Squelch 的功率定义。",["00b：不支持 Tx Squelch","01b：降低 OMA","10b：降低 Pav","11b：Host 选择 OMA 或 Pav"]),
  f("01h:155","3","ForcedSquelchTxSupported","RO","强制","OutputSquelchForceTx 支持。",noYes("不支持强制 Tx Squelch","支持强制 Tx Squelch")),
  f("01h:155","2","AutoSquelchDisableTxSupported","RO","强制","AutoSquelchDisableTx 支持。",noYes("不可关闭自动 Tx Squelch","可关闭自动 Tx Squelch")),
  f("01h:155","1","OutputDisableTxSupported","RO","强制","OutputDisableTx 支持。",noYes("不支持 Host 禁用 Tx 输出","支持 Host 禁用 Tx 输出")),
  f("01h:155","0","InputPolarityFlipTxSupported","RO","强制","InputPolarityFlipTx 支持。",noYes("不支持 Tx 输入极性翻转","支持 Tx 输入极性翻转")),
  f("01h:156","7","BankBroadcastSupported","RO","强制","BankBroadcastEnable 支持。",noYes("不支持 Bank Broadcast","支持 Bank Broadcast")),
  f("01h:156","6–3","Reserved","RO","Reserved","必须为 0。"),
  f("01h:156","2","AutoSquelchDisableRxSupported","RO","强制","AutoSquelchDisableRx 支持。",noYes("不可关闭自动 Rx Squelch","可关闭自动 Rx Squelch")),
  f("01h:156","1","OutputDisableRxSupported","RO","强制","OutputDisableRx 支持。",noYes("不支持 Host 禁用 Rx 输出","支持 Host 禁用 Rx 输出")),
  f("01h:156","0","OutputPolarityFlipRxSupported","RO","强制","OutputPolarityFlipRx 支持。",noYes("不支持 Rx 输出极性翻转","支持 Rx 输出极性翻转")),
];
const flagAdvertisementFields:FieldDef[]=[
  f("01h:157","7–4","Reserved","RO","Reserved","必须为 0。"),f("01h:157","3","AdaptiveInputEqFailFlagTxSupported","RO","强制","Tx Adaptive Input EQ Fail Flag 支持。",noYes("不支持","支持")),f("01h:157","2","CDRLOLFlagTxSupported","RO","强制","Tx CDR LOL Flag 支持。",noYes("不支持","支持")),f("01h:157","1","LOSFlagTxSupported","RO","强制","Tx LOS Flag 支持。",noYes("不支持","支持")),f("01h:157","0","FailureFlagTxSupported","RO","强制","Tx Failure Flag 支持。",noYes("不支持","支持")),
  f("01h:158","7–3","Reserved","RO","Reserved","必须为 0。"),f("01h:158","2","CDRLOLFlagRxSupported","RO","强制","Rx CDR LOL Flag 支持。",noYes("不支持","支持")),f("01h:158","1","LOSFlagRxSupported","RO","强制","Rx LOS Flag 支持。",noYes("不支持","支持")),f("01h:158","0","Reserved","RO","Reserved","必须为 0。"),
];
const monitorAdvertisementFields:FieldDef[]=[
  f("01h:159","7–6","Reserved","RO","Reserved","必须为 0。"),f("01h:159","5","CustomMonSupported","RO","强制","Custom Monitor 支持声明；其单位与语义由厂商定义。",noYes("不支持 Custom Monitor","支持 Custom Monitor，需厂商字段表")),f("01h:159","4","Aux3MonSupported","RO","强制","Aux3 Monitor 支持。",noYes("不支持","支持")),f("01h:159","3","Aux2MonSupported","RO","强制","Aux2 Monitor 支持。",noYes("不支持","支持")),f("01h:159","2","Aux1MonSupported","RO","强制","Aux1 Monitor 支持。",noYes("不支持","支持")),f("01h:159","1","VccMonSupported","RO","强制","3.3 V Monitor 支持。",noYes("不支持","支持")),f("01h:159","0","TempMonSupported","RO","强制","温度 Monitor 支持。",noYes("不支持","支持")),
  f("01h:160","7–5","Reserved","RO","Reserved","必须为 0。"),f("01h:160","4–3","TxBiasCurrentScalingFactor","RO","强制","Tx Bias 基础 2 μA 步进的倍率。",["00b：×1","01b：×2","10b：×4","11b：Reserved"]),f("01h:160","2","RxOpticalPowerMonSupported","RO","强制","Rx 光功率监控支持。",noYes("不支持","支持")),f("01h:160","1","TxOpticalPowerMonSupported","RO","强制","Tx 光功率监控支持。",noYes("不支持","支持")),f("01h:160","0","TxBiasMonSupported","RO","强制","Tx Bias 监控支持。",noYes("不支持","支持")),
];
const siAdvertisementFields:FieldDef[]=[
  f("01h:161","7","Reserved","RO","Reserved","必须为 0。"),f("01h:161","6–5","TxInputEqRecallBuffersSupported","RO","强制","Tx Input EQ Store/Recall 缓冲数量。",["00b：不支持 Store/Recall","01b：1 个 Buffer","10b：2 个 Buffer","11b：Reserved"]),f("01h:161","4","TxInputEqFreezeSupported","RO","强制","Tx Input EQ Freeze 支持。",noYes("不支持","支持")),f("01h:161","3","TxInputAdaptiveEqSupported","RO","强制","Adaptive Tx Input EQ 支持。",noYes("不支持","支持")),f("01h:161","2","TxInputEqHostControlSupported","RO","强制","Host-controlled Tx Input EQ Target 支持。",noYes("不支持","支持")),f("01h:161","1","TxCDRBypassControlSupported","RO","强制","Tx CDR Bypass 控制支持。",noYes("不支持","支持")),f("01h:161","0","TxCDRSupported","RO","强制","Tx CDR 支持。",noYes("不支持","支持")),
  f("01h:162","7","VersatileControlSetSupported","RO","强制","CMIS-VCS 支持。",noYes("不支持 CMIS-VCS","支持 CMIS-VCS；Page 18h/19h 扩展按外部规范")),f("01h:162","6","UnidirReconfigSupported","RO","强制","Tx/Rx 独立重配置支持。",noYes("不支持单向重配置","支持 ApplyImmediateTx/Rx 与 Page 19h")),f("01h:162","5","StagedSet1Supported","RO","强制","第二套 Staged Control Set 支持。",noYes("不支持 SCS1","支持 SCS1")),f("01h:162","4–3","RxOutputEqControlSupported","RO","强制","Host 控制 Rx Output EQ 的范围。",["00b：不支持","01b：仅 Pre-cursor","10b：仅 Post-cursor","11b：Pre/Post 均支持"]),f("01h:162","2","RxOutputAmplitudeControlSupported","RO","强制","Rx Output Amplitude 控制支持。",noYes("不支持","支持")),f("01h:162","1","RxCDRBypassControlSupported","RO","强制","Rx CDR Bypass 控制支持。",noYes("不支持","支持")),f("01h:162","0","RxCDRSupported","RO","强制","Rx CDR 支持。",noYes("不支持","支持")),
];
const cdbAdvertisementFields:FieldDef[]=[
  f("01h:163","7–6","CdbInstancesSupported","RO","强制","CDB 实例数及 Page 9Fh/A0h–AFh Bank 数。",["00b：不支持 CDB","01b：1 个实例 · Bank 0","10b：2 个实例 · Bank 0–1","11b：Reserved"]),f("01h:163","5","CdbBackgroundModeSupported","RO","条件强制","命令执行期间是否仍允许访问管理内存。",noYes("不支持 Background Mode","支持 Background Mode")),f("01h:163","4","CdbAutoPagingSupported","RO","条件强制","EPL 跨页自动递增和回绕。",noYes("不支持 Auto Paging","支持 A0h–AFh Auto Paging")),f("01h:163","3–0","CdbMaxPagesEPL","RO","条件强制","支持的 EPL Page 数及最大 EPL 字节数。",["0h：0 Page · 0 B","1h：A0h · 128 B","2h：A0h–A1h · 256 B","3h：A0h–A2h · 384 B","4h：A0h–A3h · 512 B","5h：A0h–A7h · 1024 B","6h：A0h–ABh · 1536 B","7h：A0h–AFh · 2048 B","8h–Fh：Reserved"]),
  f("01h:164","7–0","CdbReadWriteLengthExtension","RO","条件强制","EPL 最大单次 READ/WRITE 长度=8×(1+i) B；LPL 上限封顶 128 B。"),f("01h:165","7","CdbCommandTriggerMethod","RO","条件强制","CDB 命令触发方法。",["0b：单独写 9Fh:129 或两字节 CMDID 触发","1b：任意包含 9Fh:129 的完整 WRITE 在 STOP 时触发"]),f("01h:165","6–5","Reserved","RO","Reserved","必须为 0。"),f("01h:165","4–0","CdbExtMaxBusyTime","RO","条件强制","扩展 Busy Time 编码；Method=1 时 TCDBB=max(1,X)×160 ms。"),f("01h:166","7","CdbMaxBusySpecMethod","RO","条件强制","最大 CDB Busy Time 的编码来源。",["0b：使用 01h:166.6–0","1b：使用 01h:165.4–0"]),f("01h:166","6–0","CdbMaxBusyTime","RO","条件强制","Method=0 时 TCDBB=(80−min(80,X)) ms。"),
];
const additionalDurationFields:FieldDef[]=[
  f("01h:167","7–4","MaxDurationModulePwrDn","RO","强制","ModulePwrDn 最长持续时间。",durationEncoding),f("01h:167","3–0","MaxDurationModulePwrUp","RO","强制","ModulePwrUp 最长持续时间。",durationEncoding),f("01h:168","7–4","MaxDurationDPTxTurnOff","RO","强制","DPTxTurnOff 最长持续时间。",durationEncoding),f("01h:168","3–0","MaxDurationDPTxTurnOn","RO","强制","DPTxTurnOn 最长持续时间。",durationEncoding),f("01h:169","7–4","Reserved","RO","Reserved","必须为 0。"),f("01h:169","3–0","MaxDurationBPC","RO","强制","Page/Bank Change ACCESS hold-off 的缩放指数；实际最大值=tBPC/2^i。"),
];
const miscellaneousAdvertisementFields:FieldDef[]=[
  f("01h:251","7–6","ScratchPadSupported","RO","强制","Page 13h:184–191 Host Scratchpad 支持状态。",["00b：Unknown（仅 5.2 及更早）","01b：Not supported","10b：Supported","11b：Reserved"]),f("01h:251","5–4","PasswordEntrySupported","RO","强制","传统 Password Entry 支持状态。",["00b：Unknown（仅 5.2 及更早）","01b：Not supported","10b：Supported","11b：Reserved"]),f("01h:251","3–2","PasswordEntryResultSupported","RO","强制","Password Entry Result 支持状态。",["00b：Unknown（仅 5.2 及更早）","01b：Not supported","10b：Supported","11b：Reserved"]),f("01h:251","1–0","FullPageReadSupported","RO","强制","128-byte Full Page READ 支持状态。",["00b：Unknown（仅 5.2 及更早）","01b：Not supported","10b：Supported","11b：Reserved"]),f("01h:252","7","HostLaneSwitchingSupported","RO","强制","Page 1Dh Host Lane Switching 支持。",noYes("不支持","支持 Page 1Dh")),f("01h:252","6","LinkTrainingSupported","RO","强制","CMIS-LT Page 50h–53h 支持。",noYes("不支持 CMIS-LT","支持 CMIS-LT")),f("01h:252","5–0","Reserved","RO","Reserved","必须为 0。"),f("01h:253–254","7–0","Reserved","RO","Reserved","必须为 0。"),
];

export const pageDetails: PageDef[] = [
  {
    id:"lower",page:"Lower",title:"Lower Memory",category:"基础",bank:"固定映射 · 始终可见",access:"Mixed",level:"强制",status:"逐字段",ref:"§8.2 / 表 8-4",notes:commonNotes,
    ranges:[
      r(0,2,"管理特性","RO","强制","标识、CMIS 版本、Memory Model 与基本配置能力。",[
        f("Lower:0","7–0","SFF8024Identifier","RO","强制","模块/连接器形态标识；具体编码由 SFF-8024 定义。"),
        f("Lower:1","7–0","CmisRevision","RO","强制","高半字节为主版本、低半字节为次版本；53h 表示 CMIS 5.3。"),
        f("Lower:2","7","MemoryModel","RO","强制","选择 Memory Map 模型。",["0b：Paged Memory","1b：Flat Memory，仅 Page 00h"]),
        f("Lower:2","6","SteppedConfigOnly","RO","强制","指示是否只保证分步重配置。",["0b：还支持 intervention-free 重配置","1b：仅保证基本分步配置"]),
      ]),
      r(3,3,"Global Status","RO","强制","全局模块状态与中断状态。",[
        f("Lower:3","3–1","ModuleState","RO","强制","分页模块的可观察 Module State。",["001b ModuleLowPwr","010b ModulePwrUp","011b ModuleReady","100b ModulePwrDn","101b ModuleFault","000/110/111 Reserved"]),
        f("Lower:3","0","ModuleStateChangedFlag","RO/COR","条件强制","ModuleState 变化锁存标志；读取具体 Flag 完成协议规定的清除。"),
      ]),
      r(4,7,"Flag Summary","RO","强制","快速定位含有已置位 Flag 的区域；Summary 不是具体事件本身。"),
      r(8,13,"Module-level Flags","RO/COR","强制","模块级告警、警告与状态变化 Flag；读取语义按字段定义。"),
      r(14,25,"Module-level Monitors","RO","条件强制","温度、电压与辅助监控量；需结合能力广告和单位定义。"),
      r(26,30,"Module-level Controls","RW / WO","强制","功耗、复位等模块级控制。",[
        f("Lower:26","6","LowPwrAllowRequestHW","RW","强制","允许模块把 LowPwrRequestHW 纳入 LowPwrS 求值。",["0b：忽略硬件低功耗请求","1b：允许硬件请求"]),
        f("Lower:26","4","LowPwrRequestSW","RW","强制","软件低功耗静态请求。",["0b：不请求低功耗","1b：请求/保持低功耗"]),
        f("Lower:26","3","SoftwareReset","WO/SC","强制","写 1 触发与规定保持时间的硬件 Reset 等效的软件复位。"),
      ]),
      r(31,36,"Module-level Masks","RW","强制","控制模块级 Flag 是否贡献到 Interrupt；不会阻止 Flag 置位。"),
      r(37,38,"CDB Command Status","RO","条件强制","两个 CDB 实例的命令状态摘要。"),
      r(39,40,"Active Firmware Version","RO","强制","当前运行固件主/次版本。"),
      r(41,41,"Module Fault Information","RO","条件强制","ModuleFault 的协议级原因信息。"),
      r(42,45,"Miscellaneous Status","RO","强制","其他模块状态与能力相关状态。"),
      r(46,55,"Reserved","RO","Reserved","必须按 Reserved 处理，不赋予厂商含义。"),
      r(56,63,"Extended Module Information","RO","条件强制","扩展模块信息与能力。"),
      r(64,84,"Custom Management / PCIe Coordinated Use","Mixed","允许","CMIS 不定义内部字段；PCI-SIG 已协调将该区用于 PCIe Application 的专用能力声明，普通 CMIS 模块需结合厂商或 PCI-SIG 文档。"),
      r(85,85,"Media Type","RO","强制","选择 MediaInterfaceID 的 SFF-8024 枚举表。",[f("Lower:85","7–0","MediaType","RO","强制","决定后续 MediaInterfaceID 应按哪一张 SFF-8024 表解释。",["00h Undefined","01h MMF · Table 4-6","02h SMF · Table 4-7","03h Passive/linear copper · Table 4-8","04h Active cable · Table 4-9","05h BASE-T · Table 4-10","06h–3Fh Reserved","40h–8Fh Custom","90h–FFh Reserved"])]),
      r(86,117,"Application Descriptor Bytes 1–4","RO","强制","AppSel 1–8 的前四字节；第五字节位于 01h:176–183。",basicApplicationFields),
      r(118,125,"Password Facilities","RW","可选","传统密码设施；与 CDB 密码命令区分。"),
      r(126,127,"Page Mapping","RW","条件强制","选择 Upper Memory 的 Bank 与 Page。",[
        f("Lower:126","7–0","BankSelect","RW","条件强制","选择 Bank；改变 Bank 时必须与 PageSelect 同事务写入。"),
        f("Lower:127","7–0","PageSelect","RW","条件强制","选择映射到 Upper Memory 128–255 的 Page。"),
      ]),
    ]
  },
  {
    id:"00",page:"00h",title:"Administrative Information",category:"基础",bank:"非 Banked",access:"RO",level:"强制",status:"范围解析",ref:"§8.3 / 表 8-26",notes:commonNotes,
    ranges:[
      r(128,128,"Identifier Copy","RO","强制","Lower:0 的模块形态标识镜像；按 SFF-8024 枚举解析。"),
      r(129,144,"Vendor Name","RO","强制","16 字节 ASCII，左对齐并以 20h 空格右侧填充；用于厂商身份。"),
      r(145,147,"Vendor OUI","RO","强制","3 字节 IEEE Company ID；二进制标识，不按 ASCII 解码；全零表示未指定。"),
      r(148,163,"Vendor Part Number","RO","强制","16 字节 ASCII，左对齐并以 20h 填充；全零表示未指定。"),
      r(164,165,"Vendor Revision","RO","强制","2 字节 ASCII 产品修订号；不要按 CMIS 数字版本解码。"),
      r(166,181,"Vendor Serial Number","RO","强制","16 字节 ASCII 序列号，左对齐并以 20h 填充；全零表示未指定。"),
      r(182,189,"Manufacturing Date Code","RO","强制","8 字节 ASCII：YY、MM、DD、LotCode；日期字段须检查字符和日历有效性。"),
      r(190,199,"CLEI Code","RO","可选","10 字节 ASCII；不支持时全部填 20h 空格。"),
      r(200,200,"Module Power Class","RO","强制","高 3 bit 为形态相关功耗等级，低 5 bit Reserved。"),
      r(201,201,"Maximum Power","RO","强制","U8×0.25 W，向上取整表示全寿命、全工作条件下的最坏最大功耗。"),
      r(202,202,"Cable Assembly Link Length","RO","强制","高 2 bit 选择倍率，低 6 bit 为米制基础值；可分离光介质模块应为 00h。"),
      r(203,203,"Connector Type","RO","强制","媒体侧连接器的 SFF-8024 整字节枚举。"),
      r(204,208,"Copper Cable Attenuation","RO","条件强制","铜缆指定频点的 U8 衰减，单位 1 dB；0 表示该特性不可用。"),
      r(209,209,"Reserved","RO","Reserved","该字节保留，不是第六个衰减频点。"),
      r(210,210,"Media Lane Support","RO","条件强制","逐位声明近端 Media Lane：0 支持、1 不支持；这是只读声明，不是 Lane Disable。"),
      r(211,211,"Far-end Breakout Topology","RO","条件强制","低 5 bit 描述固定线缆远端分支拓扑，高 3 bit Reserved；不用于动态切换拓扑。"),
      r(212,212,"Media Interface Technology","RO","强制","CMIS 整字节枚举，表示激光器或铜缆有源/无源技术。"),
      r(213,213,"SPI MCI Flow Control","RO","条件强制","Bit 7 选择静态字节数或随速度变化的持续时间编码，低 7 bit 为参数。"),
      r(214,220,"Reserved","RO","Reserved","7 字节保留；其中 214 也不是第二个 MCI 参数。"),
      r(221,221,"Custom Static Information","RO","允许","1 字节厂商静态信息；计入 00h:222 PageChecksum，内部语义需厂商字段表。"),
      r(222,222,"Page Checksum","RO","强制","Byte 128–221 算术和的低 8 bit；用于检查标准静态区完整性。"),
      r(223,255,"Custom Non-volatile Information","RO","允许","33 字节厂商或转售商非易失信息；复位/掉电后保留，CMIS 不规定内部格式，也不在 00h:222 校验范围内。")
    ]
  },
  {
    id:"01",page:"01h",title:"Advertising",category:"能力",bank:"非 Banked",access:"RO / Static",level:"条件强制",status:"范围解析",ref:"§8.4 / 表 8-42",notes:["Paged Memory 模块必须支持 Page 01h；所有字段只读且静态。",...commonNotes],
    ranges:[
      r(128,131,"Firmware / Hardware Revisions","RO","强制","非活动固件与硬件版本；128–129 可动态变化且有意排除在 Page Checksum 外。",revisionFields),
      r(132,137,"Supported Link Length","RO","强制","SMF/OM5/OM4/OM3/OM2 最大链路长度与倍率。",linkLengthFields),
      r(138,141,"Wavelength Information","RO","条件强制","NominalWavelength U16×0.05 nm；Tolerance U16×0.005 nm，均为大端。",[f("01h:138–139","15–0","NominalWavelength","RO","条件强制","单波长模块标称波长，U16，大端，单位 0.05 nm。"),f("01h:140–141","15–0","WavelengthTolerance","RO","条件强制","最坏条件 ±Tolerance，U16，大端，单位 0.005 nm。")]),
      r(142,142,"Supported Pages","RO","强制","各扩展 Page 与 Bank 数的入口声明。",supportedPageFields),
      r(143,144,"Durations","RO","强制","ModSel 等待时间与 DPInit/DPDeinit 最大持续时间。",durationFields),
      r(145,154,"Module Characteristics","RO","强制","时钟分组、温度、探测器、功率测量、均衡能力上限等模块特性。",characteristicFields),
      r(155,156,"Supported Controls","RO","强制","波长、Squelch、Disable、极性与 Bank Broadcast 控制支持。",controlAdvertisementFields),
      r(157,158,"Supported Flags","RO","强制","Tx/Rx LOS、CDR LOL、Failure、Adaptive EQ Flag 支持。",flagAdvertisementFields),
      r(159,160,"Supported Monitors","RO","强制","模块/Aux/Custom/Lane 监控支持与 Tx Bias 缩放。",monitorAdvertisementFields),
      r(161,162,"Signal Integrity / Configuration","RO","强制","Tx/Rx CDR、EQ、Amplitude、SCS1、单向重配置和 VCS 支持。",siAdvertisementFields),
      r(163,166,"CDB Functionality","RO","强制","实例数、Background、Auto Paging、EPL 容量、事务长度与 Busy Time。",cdbAdvertisementFields),
      r(167,169,"Additional Durations","RO","强制","Module Power、Tx Turn On/Off 与 Page/Bank Change 时间。",additionalDurationFields),
      r(170,174,"Reserved","RO","Reserved","5 字节保留，必须为 0。"),
      r(175,175,"Normalized Application Descriptors","RO","强制","NAD Bank 数与最大可广告 Application 数。",[f("01h:175","7–4","Reserved","RO","Reserved","必须为 0。"),f("01h:175","3–0","NADBanksSupported","RO","强制","0 表示不支持；n>0 表示 Page 1Ch 支持 n 个 Bank，可广告 n×15 个 NAD。")]),
      r(176,190,"Media Lane Assignment Options","RO","强制","AppSel 1–15 的第五个 Descriptor 字节。",mediaLaneOptionFields),
      r(191,222,"Custom Static Advertising","RO","允许","32 字节只读静态厂商能力声明；计入 Page 01h Checksum，字段与枚举必须由厂商文档定义。"),
      r(223,250,"Additional App Descriptor Bytes 1–4","RO","强制","AppSel 9–15 的前四字节；第五字节位于 01h:184–190。",additionalApplicationFields),
      r(251,254,"Miscellaneous Advertisements","RO","强制","Scratchpad、密码、Full Page Read、Host Lane Switching 与 CMIS-LT。",miscellaneousAdvertisementFields),
      r(255,255,"PageChecksum","RO","强制","低 8 bit 算术和，覆盖 130–254；128–129 有意排除。")]
  },
  {id:"02",page:"02h",title:"Thresholds Information",category:"能力",bank:"非 Banked",access:"RO",level:"条件强制",status:"范围解析",ref:"§8.5 / 表 8-61",notes:commonNotes,ranges:[r(128,175,"Module Monitor Thresholds","RO","条件强制","温度、电压、Aux/Custom 的 High/Low Alarm/Warning 阈值。"),r(176,199,"Lane Monitor Thresholds","RO","条件强制","Tx 光功率、激光偏置、Rx 光功率等 Lane 通用阈值。"),r(200,229,"Reserved","RO","Reserved","保留 30 字节。"),r(230,254,"Custom Dynamic Thresholds","RO","允许","25 字节厂商阈值区；可随已 Commission 的 Application 改变并计入动态 PageChecksum，单位/符号/告警关系由厂商定义。"),r(255,255,"PageChecksum","RO","强制","覆盖 128–254；Application Commission 后阈值变化时可随之变化。")]},
  {id:"03",page:"03h",title:"User NV RAM",category:"基础",bank:"非 Banked",access:"RW",level:"可选",status:"范围解析",ref:"§8.6 / 表 8-64",notes:commonNotes,ranges:[r(128,255,"User Data","RW","可选","128 字节模块用户非易失数据；CMIS 不规定应用层结构。")]},
  {id:"04",page:"04h",title:"Laser Capabilities Advertising",category:"能力",bank:"非 Banked",access:"RO",level:"可选",status:"范围解析",ref:"§8.7 / 表 8-65",notes:commonNotes,ranges:[r(128,129,"Wavelength Grids","RO","强制","广告 6.25/12.5/25/33/50/75/100/150 GHz 等网格与 Fine Tuning。"),r(130,189,"Channel Number Ranges","RO","强制","各网格支持的有符号通道范围。"),r(190,197,"Fine-Tuning Support","RO","条件强制","细调分辨率和范围。"),r(198,201,"Programmable Output Power","RO","条件强制","可编程输出功率范围。"),r(202,254,"Reserved","RO","Reserved","保留 53 字节。"),r(255,255,"PageChecksum","RO","强制","覆盖 128–254。")]},
  {
    id:"10",page:"10h",title:"Lane / Data Path Configuration",category:"Data Path",bank:"Bank 0–3 · 每 Bank 8 Lane",access:"RW / WO",level:"条件强制",status:"逐字段",ref:"§8.9 / 表 8-67–81",notes:["全局 Lane j = Bank×8 + 页内 Lane i；Bank 0/1/2/3 对应 Lane 1–8/9–16/17–24/25–32。","ApplyDPInit 是单字节 WRITE 触发；普通读改写模板不能用于该触发字节。",...commonNotes],
    ranges:[
      r(128,128,"Data Path Deinit Control","RW","强制","每 Host Lane 的静态去初始化请求。",[f("10h:128","7–0","DPDeinitLane<8:1>","RW","强制","0 请求初始化，1 请求去初始化；同一 Data Path 所有关联 Lane 必须写相同值。",["0b：DPDeinitS FALSE，允许初始化","1b：DPDeinitS TRUE，去初始化"])]),
      r(129,142,"Lane-specific Direct Controls","RW","条件强制","Tx/Rx 极性、Disable、Squelch 与自适应均衡直接控制。",[
        f("10h:129","7–0","InputPolarityFlipTx<8:1>","RW","条件强制","翻转 Host 输入的 Tx 数据极性。"),
        f("10h:130","7–0","OutputDisableTx<8:1>","RW","条件强制","Media Tx 输出静态禁用。",["0b：允许输出","1b：禁用输出"]),
        f("10h:131","7–0","AutoSquelchDisableTx<8:1>","RW","条件强制","关闭自动 Tx Squelch。"),
        f("10h:132","7–0","OutputSquelchForceTx<8:1>","RW","条件强制","强制 Tx 输出 Squelch。"),
        f("10h:133","7–0","Reserved","RO","Reserved","保留字节。"),
        f("10h:134","7–0","AdaptiveInputEqFreezeTx<8:1>","RW","条件强制","冻结自适应输入均衡。"),
        f("10h:135–136","每 Lane 2 bit","AdaptiveInputEqStoreTx<8:1>","RW","条件强制","保存自适应均衡设置。"),
        f("10h:137","7–0","OutputPolarityFlipRx<8:1>","RW","条件强制","翻转模块到 Host 的 Rx 输出极性。"),
        f("10h:138","7–0","OutputDisableRx<8:1>","RW","条件强制","Host Rx 输出静态禁用。"),
        f("10h:139","7–0","AutoSquelchDisableRx<8:1>","RW","条件强制","关闭自动 Rx Squelch。"),
        f("10h:140–142","7–0","Reserved","RO","Reserved","保留。"),
      ]),
      r(143,177,"Staged Control Set 0","RW / WO","强制","SCS0 的触发、Data Path 配置与 SI 目标。",[
        f("10h:143","7–0","SCS0::ApplyDPInitLane<8:1>","WO","强制","写 1 为相关 Host Lane 触发 Provision；必须单字节 WRITE。"),
        f("10h:144","7–0","SCS0::ApplyImmediateLane<8:1>","WO","条件强制","SteppedConfigOnly=0 时支持无需 DPInit 的立即应用。"),
        f("10h:145–152","7–4 / 3–1 / 0","SCS0::DPConfigLane<1:8>","RW","强制","每 Lane 一个字节：AppSelCode / DataPathID / ExplicitControl。",["AppSel 7–4：1–15 指向广告条目","DataPathID 3–1：Data Path 最低 Lane 索引减 1","ExplicitControl 0：0 使用默认 SI，1 使用显式 SI"]),
        f("10h:153","7–0","AdaptiveInputEqEnableTx<8:1>","RW","条件强制","SCS0 自适应输入均衡使能。"),
        f("10h:154–155","每 Lane 2 bit","AdaptiveInputEqRecallTx<8:1>","RW","条件强制","调用已保存的自适应均衡设置。"),
        f("10h:156–159","每 Lane 4 bit","HostControlledInputEqTargetTx<8:1>","RW","条件强制","Host 控制的 Tx 输入均衡目标。"),
        f("10h:160","7–0","CDREnableTx<8:1>","RW","条件强制","Tx CDR 使能。"),
        f("10h:161","7–0","CDREnableRx<8:1>","RW","条件强制","Rx CDR 使能。"),
        f("10h:162–165","每 Lane 4 bit","OutputEqPreCursorTargetRx<8:1>","RW","条件强制","Rx 输出前游标均衡目标。"),
        f("10h:166–169","每 Lane 4 bit","OutputEqPostCursorTargetRx<8:1>","RW","条件强制","Rx 输出后游标均衡目标。"),
        f("10h:170–173","每 Lane 4 bit","OutputAmplitudeTargetRx<8:1>","RW","条件强制","Rx 输出摆幅目标。"),
        f("10h:174–175","7–0","Reserved","RO","Reserved","保留。"),
        f("10h:176","7–0","ApplyImmediateTx<8:1>","WO","条件强制","UnidirReconfigSupported 时仅应用 Tx 方向。"),
        f("10h:177","7–0","ApplyImmediateRx<8:1>","WO","条件强制","UnidirReconfigSupported 时仅应用 Rx 方向。"),
      ]),
      r(178,212,"Staged Control Set 1","RW / WO","条件强制","结构与 SCS0 镜像；允许预置第二套配置。",[
        f("10h:178","7–0","SCS1::ApplyDPInitLane<8:1>","WO","条件强制","写 1 为相关 Host Lane 触发 SCS1 Provision；必须单字节 WRITE。"),
        f("10h:179","7–0","SCS1::ApplyImmediateLane<8:1>","WO","条件强制","SteppedConfigOnly=0 时以 SCS1 触发 Provision-and-Commission；必须单字节 WRITE。"),
        f("10h:180–187","7–4 / 3–1 / 0","SCS1::DPConfigLane<1:8>","RW","条件强制","每 Lane：AppSelCode / DataPathID / ExplicitControl，与 SCS0 格式相同。"),
        f("10h:188–212","—","SCS1 Signal Integrity Controls","RW","条件强制","SCS1 的 Tx/Rx SI 控制，与 153–177 的字段布局相对应。"),
      ]),
      r(213,232,"Lane-specific Masks","RW","条件强制","Page 11h Lane Flag 的中断 Mask；默认值按字段规定。"),
      r(233,239,"Reserved","RO","Reserved","保留 7 字节。"),
      r(240,255,"Custom Banked Controls","Mixed","允许","每个 Bank 独立的 16 字节厂商控制区；Lane 归属按 Bank×8 解释，访问类型、默认值、触发/静态语义均需厂商表。"),
    ]
  },
  {
    id:"11",page:"11h",title:"Lane / Data Path Status",category:"Data Path",bank:"Bank 0–3 · 每 Bank 8 Lane",access:"RO / COR",level:"条件强制",status:"逐字段",ref:"§8.10 / 表 8-82–97",notes:["DPState 按 Host Lane 报告；一个多 Lane Data Path 的所有关联 Lane 应报告相同状态。","ConfigStatus=1h 仅表示配置被接受；必须继续确认 DPState 和 OutputStatus。",...commonNotes],
    ranges:[
      r(128,131,"Data Path States","RO","强制","每 Lane 4 bit 的 DPSM 状态。",[f("11h:128–131","每 Lane 4 bit","DPStateHostLane<1:8>","RO","强制","DPSM 当前状态。",["0h Reserved","1h DPDeactivated","2h DPInit","3h DPDeinit","4h DPActivated","5h DPTxTurnOn","6h DPTxTurnOff","7h DPInitialized","8h–Fh Reserved"])]),
      r(132,133,"Lane Output Status","RO","强制","实际有效输出状态，与请求和 DPSM 状态分别观察。",[
        f("11h:132","7–0","OutputStatusRx<8:1>","RO","强制","1 表示模块正在向 Host 输出有效 Rx 信号。"),
        f("11h:133","7–0","OutputStatusTx<8:1>","RO","强制","1 表示模块正在 Media Lane 发送有效 Tx 信号。"),
      ]),
      r(134,153,"Lane Flags","RO/COR","条件强制","Tx/Rx LOS、CDR、功率、偏置和输出状态变化等 Lane Flag。",[f("11h:153","7–0","OutputStatusChangedFlagRx<8:1>","RO/COR","条件强制","Rx 输出有效状态变化锁存；对应 Mask 在 10h:232。")]),
      r(154,201,"Lane Monitors","RO","条件强制","每 Lane Tx 光功率/偏置、Rx 光功率等测量数组。"),
      r(202,205,"Configuration Status","RO","强制","最近配置命令按 Lane 的 4-bit 结果。",[f("11h:202–205","每 Lane 4 bit","ConfigStatusLane<1:8>","RO","强制","最近一次配置命令的执行状态/拒绝原因。",["0h 未定义","1h 成功","2h 未指定拒绝","3h 无效 AppSel","4h 无效 Data Path/Lane 集","5h 无效 SI","6h Lane 正在使用","7h 部分 Data Path","8h–Bh Reserved","Ch 进行中","Dh–Fh 厂商拒绝"])]),
      r(206,234,"Active Control Set","RO","强制","已 provision 的 Data Path 与 SI 设置。",[
        f("11h:206–213","7–4 / 3–1 / 0","ACS::DPConfigLane<1:8>","RO","强制","Active AppSelCode / DataPathID / ExplicitControl；可与 SCS 对比确认复制结果。"),
        f("11h:214–221","—","ACS Tx Controls","RO","条件强制","活动 Tx SI 控制。"),
        f("11h:222–234","—","ACS Rx Controls","RO","条件强制","活动 Rx SI 控制。"),
      ]),
      r(235,239,"Data Path Conditions","RO","强制","初始化待处理等条件。",[f("11h:235","7–0","DPInitPending<8:1>","RO","强制","1 表示 Active Set 可能尚未完全反映到硬件，等待 DPInit 完成。"),f("11h:236–239","7–0","Reserved","RO","Reserved","保留。")]),
      r(240,255,"Media Lane Mapping","RO","强制","Media Lane 波长/光纤映射信息。"),
    ]
  },
  {id:"12",page:"12h",title:"Tunable Laser Control / Status",category:"扩展",bank:"可选 Banked · 每 Bank 8 Media Lane",access:"Mixed",level:"可选",status:"范围解析",ref:"§8.11 / 表 8-98–99",notes:commonNotes,ranges:[r(128,135,"Grid Spacing","RW","强制","每 Media Lane 的网格选择和 FineTuningEnable。"),r(136,151,"Channel Offset Numbers","RW","强制","每 Lane 一个 S16 通道偏移。"),r(152,167,"Fine Tuning Offsets","RW","强制","每 Lane 一个 S16，单位 0.001 GHz。"),r(168,199,"Current Laser Frequencies","RO","强制","每 Lane U32，单位 0.001 GHz。"),r(200,215,"Target Output Power","RW","强制","每 Lane S16，单位 0.01 dBm。"),r(216,221,"Reserved","RO","Reserved","保留。"),r(222,230,"Status / Summary","RO","强制","调谐进行/失败等状态与 Flag Summary。"),r(231,238,"Flags","RO/COR","强制","每 Lane 调谐 Flag。"),r(239,246,"Masks","RW","强制","每 Lane Flag Mask，默认全 1。"),r(247,255,"Reserved","RO","Reserved","本页没有 Page Checksum。")]},
  {id:"13",page:"13h",title:"Performance Diagnostics Control",category:"诊断",bank:"可选 Banked",access:"RW",level:"可选",status:"范围解析",ref:"§8.12 / 表 8-100",notes:commonNotes,ranges:[r(128,142,"Diagnostics Capabilities","RO","强制","Loopback、测量、报告、Pattern Generator/Checker 能力。"),r(143,143,"Reserved","RO","Reserved","模块广告保留。"),r(144,175,"Pattern Controls","RW","强制","Host/Media Pattern Generator 与 Checker 控制。"),r(176,183,"Clock / Measurement / Loopback","RW","强制","时钟、测量和四类 Loopback 控制。"),r(184,191,"Host Scratchpad","RW","强制","自动重启检测和状态保存。"),r(192,195,"Reserved","RO","Reserved","保留。"),r(196,205,"Custom Banked Diagnostics","Mixed","允许","每个 Bank 独立的 10 字节厂商诊断控制/状态区；可能与 Lane 组相关，读写、触发、清零与单位均由厂商协议定义。"),r(206,223,"Diagnostics Masks","RW","强制","对应 14h:132–149 Flag。"),r(224,255,"User Pattern","RW","强制","32 字节 Host 定义 Pattern；属于 CMIS 标准 User Pattern，不应当成厂商 Custom 区。")]},
  {id:"14",page:"14h",title:"Diagnostics Results",category:"诊断",bank:"可选 Banked",access:"RO / RWW",level:"可选",status:"范围解析",ref:"§8.13 / 表 8-125–127",notes:["写 DiagnosticsSelector 后必须等待 tDDCS；协议没有新内容就绪确认位。",...commonNotes],ranges:[r(128,128,"DiagnosticsSelector","RWW","强制","选择 192–255 的结果视图；不支持值回退到 0。",[f("14h:128","7–0","DiagnosticsSelector","RWW","强制","选择诊断数据窗口。",["00h：全 0","01h：实时 BER","02h–05h：误码/比特计数器","06h：实时 SNR","07h–10h：Reserved","11h：门控 BER","12h–15h：门控计数器","16h–BFh：Reserved","C0h–FFh：Custom Selector，由厂商定义 192–255 内容"])]),r(129,129,"Reserved","RO","Reserved","保留 1 字节。"),r(130,131,"Custom Selector Context","Mixed","允许","2 字节厂商上下文区；通常配合 C0h–FFh Custom DiagnosticsSelector 使用，实际字段关系由厂商定义。"),r(132,139,"Diagnostics Flags","RO/COR","强制","锁存诊断 Flag。"),r(140,149,"Reserved","RO","Reserved","保留。"),r(150,191,"Unallocated in overview","RO","Reserved","表 8-125 未定义为可用诊断结果区，按保留处理。"),r(192,255,"Diagnostics Data Window","RO","强制","由 DiagnosticsSelector 选择的 64 字节结果窗口；01h–15h 按 CMIS 表 8-127，C0h–FFh 时内容由厂商定义。")]},
  {id:"15",page:"15h",title:"Timing Characteristics",category:"扩展",bank:"可选 Banked",access:"RO",level:"可选",status:"范围解析",ref:"§8.14 / 表 8-130–131",notes:commonNotes,ranges:[r(128,223,"Reserved","RO","Reserved","保留 96 字节。"),r(224,239,"Data Path Rx Latency","RO","强制","每 Host Lane 一个 U16，单位 ns；多 Lane Data Path 各 Lane 应相同。"),r(240,255,"Data Path Tx Latency","RO","强制","每 Host Lane 一个 U16，单位 ns；精度在 5.3 中未规定。")]},
  {id:"16",page:"16h",title:"Network Path Control / Status",category:"扩展",bank:"可选 Banked · 每 Bank 8 Lane",access:"Mixed",level:"可选",status:"范围解析",ref:"§8.15 / 表 8-132",notes:commonNotes,ranges:[r(128,143,"NP Staged Control Sets","RW","强制","SCS0/SCS1 Lane→NP 分配。"),r(144,159,"Reserved","RO","Reserved","保留。"),r(160,175,"NP Control","RW","强制","初始化控制与信号源选择。"),r(176,191,"Apply / Configuration Status","Mixed","强制","SCS0/SCS1 Apply 触发与最近配置状态。"),r(192,223,"Active Set / NP State","RO","强制","已 provision 配置、NPSM 状态和 NPInitPending。"),r(224,249,"Advertisements","RO","强制","NPSM 时长、选项、混合复用和应用扩展。"),r(250,255,"Reserved","RO","Reserved","保留。")]},
  {id:"17",page:"17h",title:"Feature Flags / Masks",category:"扩展",bank:"可选 Banked",access:"RO/COR / RW",level:"条件强制",status:"范围解析",ref:"§8.16 / 表 8-152–154",notes:commonNotes,ranges:[r(128,128,"Network Path Flags","RO/COR","条件强制","每 Lane 的 NPStateChangedFlag。"),r(129,191,"Reserved","RO","Reserved","保留。"),r(192,192,"Network Path Masks","RW","条件强制","每 Lane 的 NPStateChangedMask。"),r(193,255,"Reserved","RO","Reserved","保留。")]},
  {id:"18",page:"18h",title:"Configuration Extensions",category:"扩展",bank:"可选 Banked · 每 Bank 8 Lane",access:"RW",level:"条件强制",status:"范围解析",ref:"§8.17 / 表 8-155–157",notes:commonNotes,ranges:[r(128,135,"SCS0 NAD Block Index","RW","条件强制","每 Lane 低 4 bit 选择 NADBlockIndex。"),r(136,143,"SCS1 NAD Block Index","RW","条件强制","第二 Staged Set 的 NADBlockIndex。"),r(144,199,"SCS0 VCS Parameter Space","RW","条件强制","由外部 CMIS-VCS 规范定义。"),r(200,255,"SCS1 VCS Parameter Space","RW","条件强制","由外部 CMIS-VCS 规范定义。")]},
  {id:"19",page:"19h",title:"Status Extensions",category:"扩展",bank:"可选 Banked · 每 Bank 8 Lane",access:"RO",level:"可选",status:"范围解析",ref:"§8.18 / 表 8-158–161",notes:commonNotes,ranges:[r(128,135,"ACS Data Path Config Tx","RO","条件强制","方向独立重配置时的 Tx AppSel/DataPathID/ExplicitControl。"),r(136,143,"ACS Data Path Config Rx","RO","条件强制","方向独立重配置时的 Rx 配置。"),r(144,151,"ACS NAD Block Index","RO","条件强制","每 Lane Active NADBlockIndex。"),r(152,207,"ACS VCS Parameter Space","RO","条件强制","由外部 CMIS-VCS 定义。"),r(208,255,"Reserved","RO","Reserved","保留。")]},
  {id:"1c",page:"1Ch",title:"Normalized Application Descriptors",category:"能力",bank:"广告的 Bank 0–15",access:"RO / Static",level:"可选",status:"范围解析",ref:"§8.20 / 表 8-162–164",notes:["Application Number AN = 15×NADBlockIndex + AppSelCode。",...commonNotes],ranges:[r(128,247,"15 × Normalized Application Descriptor","RO","强制","每个 NAD 连续 8 字节：Host/Media Interface ID、Lane Count、Lane Options、NP Indicator。"),r(248,255,"Reserved","RO","Reserved","保留 8 字节。")]},
  {id:"1d",page:"1Dh",title:"Host Lane Switching",category:"扩展",bank:"可选 Banked · 每 Bank 8 Lane",access:"Mixed",level:"可选",status:"范围解析",ref:"§8.21 / 表 8-165–166",notes:commonNotes,ranges:[r(128,135,"Advertisement","RO","强制","最大 Commit 持续时间等能力。"),r(136,151,"Provisioning","RW","强制","每 Lane 的 Redirection 目标；合法配置必须是保持 DP 粒度的排列。"),r(152,159,"Configuration","RW","强制","EnableHostLaneRedirection。"),r(160,167,"Commands","WO/SC","强制","CommitRedirection 等命令触发。"),r(168,183,"Results","RO","强制","命令执行状态与结果。"),r(184,199,"Committed Status","RO","强制","已提交的 Host Lane Switch 配置。"),r(200,255,"Reserved","RO","Reserved","保留 56 字节。")]},
  {
    id:"9f",page:"9Fh",title:"CDB Command / Reply LPL",category:"CDB",bank:"Bank 0–1 · 对应 CDB 实例",access:"RW",level:"可选",status:"逐字段",ref:"§8.23 / 表 8-177–180",notes:["CDB 支持由 01h:163.7–6 广告；0 个实例时不得访问 CDB 页面。","写 CMDID/触发前先组装长度、负载和校验；完成后读取状态与 Reply。",...commonNotes],ranges:[
      r(128,133,"Command Header","RW","条件强制","命令 ID、EPL/LPL 长度与命令校验。",[
        f("9Fh:128–129","15–0","CMDID","RW","条件强制","16-bit CDB 命令标识。"),
        f("9Fh:130–131","15–0","EPLLength","RW","条件强制","Extended Payload 长度。"),
        f("9Fh:132","7–0","LPLLength","RW","条件强制","Local Payload 长度。"),
        f("9Fh:133","7–0","CdbChkCode","RW","条件强制","命令头和负载的校验码。"),
      ]),
      r(134,135,"Reply Header","RO / RW","条件强制","回复长度与回复校验。",[
        f("9Fh:134","7–0","RPLLength","RO","条件强制","Reply Payload 长度。"),
        f("9Fh:135","7–0","RPLChkCode","RO","条件强制","Reply Payload 校验码。"),
      ]),
      r(136,255,"Local Payload","RW","条件强制","命令 LPL 或回复 RPL 的 120 字节本地负载区。"),
    ]
  },
  {id:"a0af",page:"A0h–AFh",title:"CDB Extended Payload",category:"CDB",bank:"Bank 0–1 · 对应 CDB 实例",access:"RW",level:"可选",status:"范围解析",ref:"§8.24",notes:commonNotes,ranges:[r(128,255,"Extended Payload Segment","RW","条件强制","每页 128 字节；A0h–AFh 共 16 页，合计 2048 字节 EPL。")]},
];

enrichFields(pageDetails);

export const deepFieldCount = pageDetails.reduce((n,p)=>n+p.ranges.reduce((m,x)=>m+(x.fields?.length||0),0),0);
export const coveredRangeCount = pageDetails.reduce((n,p)=>n+p.ranges.length,0);
