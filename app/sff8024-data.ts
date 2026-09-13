export type SffCode = {
  code: number;
  name: string;
  family?: string;
  lanes?: number;
  modulation?: "NRZ" | "PAM4";
  note?: string;
};

export const hex8 = (value: number) => value.toString(16).padStart(2, "0").toUpperCase() + "h";

export const identifiers: SffCode[] = [
  {code:0x00,name:"Unknown / unspecified"},{code:0x01,name:"GBIC"},{code:0x02,name:"Soldered module / connector (SFF-8472)"},
  {code:0x03,name:"SFP / SFP+ / SFP28 (SFF-8472)"},{code:0x04,name:"300-pin XBI"},{code:0x05,name:"XENPAK"},{code:0x06,name:"XFP"},
  {code:0x07,name:"XFF"},{code:0x08,name:"XFP-E"},{code:0x09,name:"XPAK"},{code:0x0A,name:"X2"},{code:0x0B,name:"DWDM-SFP/SFP+ (not SFF-8472)"},
  {code:0x0C,name:"QSFP (INF-8438)"},{code:0x0D,name:"QSFP+ or later (SFF-8636/SFF-8436)"},{code:0x0E,name:"CXP or later"},
  {code:0x0F,name:"Shielded Mini Multilane HD 4X"},{code:0x10,name:"Shielded Mini Multilane HD 8X"},{code:0x11,name:"QSFP28 or later (SFF-8636)"},
  {code:0x12,name:"CXP2 / CXP28"},{code:0x13,name:"CDFP Style 1/2"},{code:0x14,name:"HD4X fanout"},{code:0x15,name:"HD8X fanout"},
  {code:0x16,name:"CDFP Style 3"},{code:0x17,name:"microQSFP"},{code:0x18,name:"QSFP-DD 8X"},{code:0x19,name:"OSFP 8X"},
  {code:0x1A,name:"SFP-DD (SFP-DD management)"},{code:0x1B,name:"DSFP"},{code:0x1C,name:"x4 MiniLink / OCuLink"},{code:0x1D,name:"x8 MiniLink"},
  {code:0x1E,name:"QSFP+ or later with CMIS"},{code:0x1F,name:"SFP-DD with CMIS"},{code:0x20,name:"SFP+ and later with CMIS"},
  {code:0x21,name:"OSFP-XD with CMIS"},{code:0x22,name:"OIF-ELSFP with CMIS"},{code:0x23,name:"CDFP x4 PCIe with CMIS"},
  {code:0x24,name:"CDFP x8 PCIe with CMIS"},{code:0x25,name:"CDFP x16 PCIe with CMIS"},
];

export const connectors: SffCode[] = [
  {code:0x00,name:"Unknown"},{code:0x01,name:"SC"},{code:0x02,name:"Fibre Channel Style 1 copper"},{code:0x03,name:"Fibre Channel Style 2 copper"},
  {code:0x04,name:"BNC/TNC"},{code:0x05,name:"FC coax headers"},{code:0x06,name:"Fiber Jack"},{code:0x07,name:"LC"},{code:0x08,name:"MT-RJ"},
  {code:0x09,name:"MU"},{code:0x0A,name:"SG"},{code:0x0B,name:"Optical pigtail"},{code:0x0C,name:"MPO 1x12"},{code:0x0D,name:"MPO 2x16"},
  {code:0x20,name:"HSSDC II"},{code:0x21,name:"Copper pigtail"},{code:0x22,name:"RJ45"},{code:0x23,name:"No separable connector"},
  {code:0x24,name:"MXC 2x16"},{code:0x25,name:"CS"},{code:0x26,name:"SN"},{code:0x27,name:"MPO 2x12"},{code:0x28,name:"MPO 1x16"},
];

export const mediaTypes: SffCode[] = [
  {code:0x00,name:"Undefined",note:"MediaInterfaceID 无适用表"},
  {code:0x01,name:"Optical interfaces: MMF",note:"SFF-8024 Table 4-6"},
  {code:0x02,name:"Optical interfaces: SMF",note:"SFF-8024 Table 4-7"},
  {code:0x03,name:"Passive / linear active copper",note:"SFF-8024 Table 4-8"},
  {code:0x04,name:"Limiting / retimed active cable",note:"SFF-8024 Table 4-9"},
  {code:0x05,name:"BASE-T",note:"SFF-8024 Table 4-10"},
];

export const hostInterfaces: SffCode[] = [
  {code:0x00,name:"Undefined"},{code:0x05,name:"25GAUI C2M",family:"Ethernet",lanes:1,modulation:"NRZ"},
  {code:0x08,name:"LAUI-2 C2M",family:"Ethernet",lanes:2,modulation:"NRZ"},{code:0x09,name:"50GAUI-2 C2M",family:"Ethernet",lanes:2,modulation:"NRZ"},
  {code:0x0A,name:"50GAUI-1 C2M",family:"Ethernet",lanes:1,modulation:"PAM4"},{code:0x0B,name:"CAUI-4 C2M",family:"Ethernet",lanes:4,modulation:"NRZ"},
  {code:0x41,name:"CAUI-4 without FEC",family:"Ethernet",lanes:4,modulation:"NRZ"},{code:0x42,name:"CAUI-4 with RS(528,514)",family:"Ethernet",lanes:4,modulation:"NRZ"},
  {code:0x0C,name:"100GAUI-4 C2M",family:"Ethernet",lanes:4,modulation:"NRZ"},{code:0x0D,name:"100GAUI-2 C2M",family:"Ethernet",lanes:2,modulation:"PAM4"},
  {code:0x4B,name:"100GAUI-1-S",family:"Ethernet",lanes:1,modulation:"PAM4"},{code:0x4C,name:"100GAUI-1-L",family:"Ethernet",lanes:1,modulation:"PAM4"},
  {code:0x0E,name:"200GAUI-8 C2M",family:"Ethernet",lanes:8,modulation:"NRZ"},{code:0x0F,name:"200GAUI-4 C2M",family:"Ethernet",lanes:4,modulation:"PAM4"},
  {code:0x4D,name:"200GAUI-2-S",family:"Ethernet",lanes:2,modulation:"PAM4"},{code:0x4E,name:"200GAUI-2-L",family:"Ethernet",lanes:2,modulation:"PAM4"},
  {code:0x80,name:"200GAUI-1 (IEEE 802.3 Annex 176E)",family:"Ethernet",lanes:1,modulation:"PAM4"},
  {code:0x10,name:"400GAUI-16 C2M",family:"Ethernet",lanes:16,modulation:"NRZ"},{code:0x11,name:"400GAUI-8 C2M",family:"Ethernet",lanes:8,modulation:"PAM4"},
  {code:0x4F,name:"400GAUI-4-S",family:"Ethernet",lanes:4,modulation:"PAM4"},{code:0x50,name:"400GAUI-4-L",family:"Ethernet",lanes:4,modulation:"PAM4"},
  {code:0x81,name:"400GAUI-2 (IEEE 802.3 Annex 176E)",family:"Ethernet",lanes:2,modulation:"PAM4"},
  {code:0x51,name:"800GAUI-8-S",family:"Ethernet",lanes:8,modulation:"PAM4"},{code:0x52,name:"800GAUI-8-L",family:"Ethernet",lanes:8,modulation:"PAM4"},
  {code:0x82,name:"800GAUI-4 (IEEE 802.3 Annex 176E)",family:"Ethernet",lanes:4,modulation:"PAM4"},
  {code:0x55,name:"1.6TAUI-16-S",family:"Ethernet",lanes:16,modulation:"PAM4"},{code:0x56,name:"1.6TAUI-16-L",family:"Ethernet",lanes:16,modulation:"PAM4"},
  {code:0x83,name:"1.6TAUI-8 (IEEE 802.3 Annex 176E)",family:"Ethernet",lanes:8,modulation:"PAM4"},
  {code:0x2C,name:"InfiniBand SDR",family:"InfiniBand"},{code:0x2D,name:"InfiniBand DDR",family:"InfiniBand"},{code:0x2E,name:"InfiniBand QDR",family:"InfiniBand"},
  {code:0x2F,name:"InfiniBand FDR",family:"InfiniBand"},{code:0x30,name:"InfiniBand EDR",family:"InfiniBand"},{code:0x31,name:"InfiniBand HDR",family:"InfiniBand"},
  {code:0x32,name:"InfiniBand NDR",family:"InfiniBand"},{code:0xA0,name:"InfiniBand XDR placeholder",family:"InfiniBand"},
  {code:0x70,name:"PCIe 4.0",family:"PCIe"},{code:0x71,name:"PCIe 5.0",family:"PCIe"},{code:0x72,name:"PCIe 6.0",family:"PCIe"},
  {code:0x73,name:"PCIe 7.0 placeholder",family:"PCIe"},{code:0x74,name:"CEI-112G-LINEAR-PAM4",family:"OIF",modulation:"PAM4"},
];

const mmf: SffCode[] = [
  {code:0x00,name:"Undefined"},{code:0x02,name:"10GBASE-SR",lanes:1,modulation:"NRZ"},{code:0x03,name:"25GBASE-SR",lanes:1,modulation:"NRZ"},
  {code:0x04,name:"40GBASE-SR4",lanes:4,modulation:"NRZ"},{code:0x07,name:"50GBASE-SR",lanes:1,modulation:"PAM4"},
  {code:0x09,name:"100GBASE-SR4",lanes:4,modulation:"NRZ"},{code:0x0B,name:"100GE BiDi",lanes:2,modulation:"PAM4"},
  {code:0x0C,name:"100GBASE-SR2",lanes:2,modulation:"PAM4"},{code:0x0D,name:"100GBASE-SR1",lanes:1,modulation:"PAM4"},
  {code:0x1D,name:"100GBASE-VR1",lanes:1,modulation:"PAM4"},{code:0x0E,name:"200GBASE-SR4",lanes:4,modulation:"PAM4"},
  {code:0x1B,name:"200GBASE-SR2",lanes:2,modulation:"PAM4"},{code:0x1E,name:"200GBASE-VR2",lanes:2,modulation:"PAM4"},
  {code:0x10,name:"400GBASE-SR8",lanes:8,modulation:"PAM4"},{code:0x11,name:"400GBASE-SR4",lanes:4,modulation:"PAM4"},
  {code:0x1F,name:"400GBASE-VR4",lanes:4,modulation:"PAM4"},{code:0x1A,name:"400GBASE-SR4.2 (BiDi)",lanes:8,modulation:"PAM4"},
  {code:0x12,name:"800GBASE-SR8",lanes:8,modulation:"PAM4"},{code:0x20,name:"800GBASE-VR8",lanes:8,modulation:"PAM4"},
  {code:0x21,name:"800G-VR4.2",lanes:8,modulation:"PAM4"},{code:0x22,name:"800G-SR4.2",lanes:8,modulation:"PAM4"},
  {code:0x23,name:"1.6T-VR8.2",lanes:16,modulation:"PAM4"},{code:0x24,name:"1.6T-SR8.2",lanes:16,modulation:"PAM4"},
].map(x=>({...x,family:"MMF"} as SffCode));

const smf: SffCode[] = [
  {code:0x00,name:"Undefined"},{code:0x04,name:"10GBASE-LR"},{code:0x05,name:"10GBASE-ER"},{code:0x07,name:"25GBASE-LR"},{code:0x08,name:"25GBASE-ER"},
  {code:0x09,name:"40GBASE-LR4",lanes:4},{code:0x0B,name:"50GBASE-FR",lanes:1,modulation:"PAM4"},{code:0x0C,name:"50GBASE-LR",lanes:1,modulation:"PAM4"},
  {code:0x40,name:"50GBASE-ER",lanes:1,modulation:"PAM4"},{code:0x0D,name:"100GBASE-LR4",lanes:4},{code:0x0E,name:"100GBASE-ER4",lanes:4},
  {code:0x14,name:"100GBASE-DR",lanes:1,modulation:"PAM4"},{code:0x15,name:"100GBASE-FR1",lanes:1,modulation:"PAM4"},{code:0x16,name:"100GBASE-LR1",lanes:1,modulation:"PAM4"},
  {code:0x4A,name:"100G-LR1-20",lanes:1,modulation:"PAM4"},{code:0x4B,name:"100G-ER1-30",lanes:1,modulation:"PAM4"},{code:0x4C,name:"100G-ER1-40",lanes:1,modulation:"PAM4"},
  {code:0x17,name:"200GBASE-DR4",lanes:4,modulation:"PAM4"},{code:0x18,name:"200GBASE-FR4",lanes:4,modulation:"PAM4"},{code:0x19,name:"200GBASE-LR4",lanes:4,modulation:"PAM4"},
  {code:0x73,name:"200GBASE-DR1",lanes:1,modulation:"PAM4"},{code:0x74,name:"200GBASE-DR1-2",lanes:1,modulation:"PAM4"},
  {code:0x1C,name:"400GBASE-DR4",lanes:4,modulation:"PAM4"},{code:0x55,name:"400GBASE-DR4-2",lanes:4,modulation:"PAM4"},
  {code:0x75,name:"400GBASE-DR2",lanes:2,modulation:"PAM4"},{code:0x76,name:"400GBASE-DR2-2",lanes:2,modulation:"PAM4"},
  {code:0x1D,name:"400GBASE-FR4",lanes:4,modulation:"PAM4"},{code:0x43,name:"400GBASE-LR4-6",lanes:4,modulation:"PAM4"},
  {code:0x1E,name:"400G-LR4-10",lanes:4,modulation:"PAM4"},{code:0x4D,name:"400GBASE-ZR",lanes:1,modulation:"PAM4"},
  {code:0x56,name:"800GBASE-DR8",lanes:8,modulation:"PAM4"},{code:0x57,name:"800GBASE-DR8-2",lanes:8,modulation:"PAM4"},
  {code:0x77,name:"800GBASE-DR4",lanes:4,modulation:"PAM4"},{code:0x78,name:"800GBASE-DR4-2",lanes:4,modulation:"PAM4"},
  {code:0x79,name:"800GBASE-FR4-500",lanes:4,modulation:"PAM4"},{code:0x7A,name:"800GBASE-FR4",lanes:4,modulation:"PAM4"},
  {code:0x7B,name:"800GBASE-LR4",lanes:4,modulation:"PAM4"},{code:0x7F,name:"1.6TBASE-DR8",lanes:8,modulation:"PAM4"},
  {code:0x80,name:"1.6TBASE-DR8-2",lanes:8,modulation:"PAM4"},
].map(x=>({...x,family:"SMF"} as SffCode));

const passive: SffCode[] = [
  {code:0x00,name:"Undefined",family:"Passive / linear copper"},{code:0x01,name:"Copper cable",family:"Passive / linear copper"},
  {code:0xBF,name:"Passive loopback",family:"Passive / linear copper"},{code:0xC0,name:"Linear active copper loopback",family:"Passive / linear copper"},
];
const active: SffCode[] = [
  {code:0x00,name:"Undefined",family:"Active cable"},{code:0x01,name:"Active cable, BER < 1e-12",family:"Active cable"},
  {code:0x02,name:"Active cable, BER < 5e-5",family:"Active cable"},{code:0x03,name:"Active cable, BER < 2.6e-4",family:"Active cable"},
  {code:0x04,name:"Active cable, BER < 1e-6",family:"Active cable"},{code:0xBF,name:"Active loopback",family:"Active cable"},
];

export const mediaInterfacesByType: Record<number, SffCode[]> = {1:mmf,2:smf,3:passive,4:active,5:[{code:0x00,name:"Undefined",family:"BASE-T"}]};

export function lookup(items:SffCode[], code:number){return items.find(x=>x.code===code);}
export function descriptorLocation(appSel:number){
  if(appSel<1||appSel>15)return null;
  const media=`01h:${175+appSel}`;
  if(appSel<=8){const start=86+(appSel-1)*4;return{first:`Lower:${start}–${start+3}`,media,bytes:[`Lower:${start}`,`Lower:${start+1}`,`Lower:${start+2}`,`Lower:${start+3}`,media]};}
  const start=223+(appSel-9)*4;return{first:`01h:${start}–${start+3}`,media,bytes:[`01h:${start}`,`01h:${start+1}`,`01h:${start+2}`,`01h:${start+3}`,media]};
}
