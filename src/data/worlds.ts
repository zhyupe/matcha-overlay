/* eslint-disable */

export interface IWorldData {
  region: string
  dc?: number
  name?: string
  en: string
}

export enum DC {
  陆行鸟 = 1,
  莫古力 = 6,
  猫小胖 = 7,
  豆豆柴 = 8,
}

export const Worlds: Record<number, IWorldData> = {
  23: {
    region: 'global',
    en: 'Asura',
  },
  24: {
    region: 'global',
    en: 'Belias',
  },
  28: {
    region: 'global',
    en: 'Pandaemonium',
  },
  29: {
    region: 'global',
    en: 'Shinryu',
  },
  30: {
    region: 'global',
    en: 'Unicorn',
  },
  31: {
    region: 'global',
    en: 'Yojimbo',
  },
  32: {
    region: 'global',
    en: 'Zeromus',
  },
  33: {
    region: 'global',
    en: 'Twintania',
  },
  34: {
    region: 'global',
    en: 'Brynhildr',
  },
  35: {
    region: 'global',
    en: 'Famfrit',
  },
  36: {
    region: 'global',
    en: 'Lich',
  },
  37: {
    region: 'global',
    en: 'Mateus',
  },
  39: {
    region: 'global',
    en: 'Omega',
  },
  40: {
    region: 'global',
    en: 'Jenova',
  },
  41: {
    region: 'global',
    en: 'Zalera',
  },
  42: {
    region: 'global',
    en: 'Zodiark',
  },
  43: {
    region: 'global',
    en: 'Alexander',
  },
  44: {
    region: 'global',
    en: 'Anima',
  },
  45: {
    region: 'global',
    en: 'Carbuncle',
  },
  46: {
    region: 'global',
    en: 'Fenrir',
  },
  47: {
    region: 'global',
    en: 'Hades',
  },
  48: {
    region: 'global',
    en: 'Ixion',
  },
  49: {
    region: 'global',
    en: 'Kujata',
  },
  50: {
    region: 'global',
    en: 'Typhon',
  },
  51: {
    region: 'global',
    en: 'Ultima',
  },
  52: {
    region: 'global',
    en: 'Valefor',
  },
  53: {
    region: 'global',
    en: 'Exodus',
  },
  54: {
    region: 'global',
    en: 'Faerie',
  },
  55: {
    region: 'global',
    en: 'Lamia',
  },
  56: {
    region: 'global',
    en: 'Phoenix',
  },
  57: {
    region: 'global',
    en: 'Siren',
  },
  58: {
    region: 'global',
    en: 'Garuda',
  },
  59: {
    region: 'global',
    en: 'Ifrit',
  },
  60: {
    region: 'global',
    en: 'Ramuh',
  },
  61: {
    region: 'global',
    en: 'Titan',
  },
  62: {
    region: 'global',
    en: 'Diabolos',
  },
  63: {
    region: 'global',
    en: 'Gilgamesh',
  },
  64: {
    region: 'global',
    en: 'Leviathan',
  },
  65: {
    region: 'global',
    en: 'Midgardsormr',
  },
  66: {
    region: 'global',
    en: 'Odin',
  },
  67: {
    region: 'global',
    en: 'Shiva',
  },
  68: {
    region: 'global',
    en: 'Atomos',
  },
  69: {
    region: 'global',
    en: 'Bahamut',
  },
  70: {
    region: 'global',
    en: 'Chocobo',
  },
  71: {
    region: 'global',
    en: 'Moogle',
  },
  72: {
    region: 'global',
    en: 'Tonberry',
  },
  73: {
    region: 'global',
    en: 'Adamantoise',
  },
  74: {
    region: 'global',
    en: 'Coeurl',
  },
  75: {
    region: 'global',
    en: 'Malboro',
  },
  76: {
    region: 'global',
    en: 'Tiamat',
  },
  77: {
    region: 'global',
    en: 'Ultros',
  },
  78: {
    region: 'global',
    en: 'Behemoth',
  },
  79: {
    region: 'global',
    en: 'Cactuar',
  },
  80: {
    region: 'global',
    en: 'Cerberus',
  },
  81: {
    region: 'global',
    en: 'Goblin',
  },
  82: {
    region: 'global',
    en: 'Mandragora',
  },
  83: {
    region: 'global',
    en: 'Louisoix',
  },
  85: {
    region: 'global',
    en: 'Spriggan',
  },
  90: {
    region: 'global',
    en: 'Aegis',
  },
  91: {
    region: 'global',
    en: 'Balmung',
  },
  92: {
    region: 'global',
    en: 'Durandal',
  },
  93: {
    region: 'global',
    en: 'Excalibur',
  },
  94: {
    region: 'global',
    en: 'Gungnir',
  },
  95: {
    region: 'global',
    en: 'Hyperion',
  },
  96: {
    region: 'global',
    en: 'Masamune',
  },
  97: {
    region: 'global',
    en: 'Ragnarok',
  },
  98: {
    region: 'global',
    en: 'Ridill',
  },
  99: {
    region: 'global',
    en: 'Sargatanas',
  },
  161: {
    region: 'global',
    en: 'Chocobo',
  },
  166: {
    region: 'global',
    en: 'Moogle',
  },
  1042: {
    region: 'cn',
    dc: 1,
    name: '拉诺西亚',
    en: 'LaNuoXiYa',
  },
  1043: {
    region: 'cn',
    dc: 7,
    name: '紫水栈桥',
    en: 'ZiShuiZhanQiao',
  },
  1044: {
    region: 'cn',
    dc: 1,
    name: '幻影群岛',
    en: 'HuanYingQunDao',
  },
  1045: {
    region: 'cn',
    dc: 7,
    name: '摩杜纳',
    en: 'MoDuNa',
  },
  1060: {
    region: 'cn',
    dc: 1,
    name: '萌芽池',
    en: 'MengYaChi',
  },
  1076: {
    region: 'cn',
    dc: 6,
    name: '白金幻象',
    en: 'BaiJinHuanXiang',
  },
  1081: {
    region: 'cn',
    dc: 1,
    name: '神意之地',
    en: 'ShenYiZhiDi',
  },
  1106: {
    region: 'cn',
    dc: 7,
    name: '静语庄园',
    en: 'JingYuZhuangYuan',
  },
  1113: {
    region: 'cn',
    dc: 6,
    name: '旅人栈桥',
    en: 'LvRenZhanQiao',
  },
  1121: {
    region: 'cn',
    dc: 6,
    name: '拂晓之间',
    en: 'FuXiaoZhiJian',
  },
  1166: {
    region: 'cn',
    dc: 6,
    name: '龙巢神殿',
    en: 'Longchaoshendian',
  },
  1167: {
    region: 'cn',
    dc: 1,
    name: '红玉海',
    en: 'HongYuHai',
  },
  1169: {
    region: 'cn',
    dc: 7,
    name: '延夏',
    en: 'YanXia',
  },
  1170: {
    region: 'cn',
    dc: 6,
    name: '潮风亭',
    en: 'ChaoFengTing',
  },
  1171: {
    region: 'cn',
    dc: 6,
    name: '神拳痕',
    en: 'ShenQuanHen',
  },
  1172: {
    region: 'cn',
    dc: 6,
    name: '白银乡',
    en: 'BaiYinXiang',
  },
  1173: {
    region: 'cn',
    dc: 1,
    name: '宇宙和音',
    en: 'YuZhouHeYin',
  },
  1174: {
    region: 'cn',
    dc: 1,
    name: '沃仙曦染',
    en: 'WoXianXiRan',
  },
  1175: {
    region: 'cn',
    dc: 1,
    name: '晨曦王座',
    en: 'ChenXiWangZuo',
  },
  1176: {
    region: 'cn',
    dc: 6,
    name: '梦羽宝境',
    en: 'MengYuBaoJing',
  },
  1177: {
    region: 'cn',
    dc: 7,
    name: '海猫茶屋',
    en: 'HaiMaoChaWu',
  },
  1178: {
    region: 'cn',
    dc: 7,
    name: '柔风海湾',
    en: 'RouFengHaiWan',
  },
  1179: {
    region: 'cn',
    dc: 7,
    name: '琥珀原',
    en: 'HuPoYuan',
  },
  1180: {
    region: 'cn',
    dc: 8,
    name: '太阳海岸',
    en: 'TaiYangHaiAn2',
  },
  1183: {
    region: 'cn',
    dc: 8,
    name: '银泪湖',
    en: 'YinLeiHu2',
  },
  1186: {
    region: 'cn',
    dc: 8,
    name: '伊修加德',
    en: 'YiXiuJiaDe2',
  },
  1192: {
    region: 'cn',
    dc: 8,
    name: '水晶塔',
    en: 'ShuiJingTa2',
  },
  1201: {
    region: 'cn',
    dc: 8,
    name: '红茶川',
    en: 'HongChaChuan2',
  }
}
