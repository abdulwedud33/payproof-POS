export type Locale = 'en' | 'am' | 'om';

export interface Translations {
  appName: string;
  appSubtitle: string;
  overview: string;
  reports: string;
  branchesAndCashiers: string;
  savedAccounts: string;
  fraudAlerts: string;
  catalogProducts: string;
  salesJournal: string;
  allBranches: string;
  refresh: string;
  totalSalesToday: string;
  receiptsCompleted: string;
  fraudShieldActive: string;
  protectedThisWeek: string;
  suspiciousAttempts: string;
  doubleSpends: string;
  underpaidAttempts: string;
  reviewAlerts: string;
  exportCsv: string;
  cashVsMobileRatio: string;
  physicalCash: string;
  mobileMoney: string;
  branches: string;
  cashiers: string;
  addBranch: string;
  addCashier: string;
  registerAccount: string;
  verifiedAccounts: string;
  stockStatus: string;
  inStock: string;
  lowStock: string;
  reorder: string;
  active: string;
  inactive: string;
  resolved: string;
  open: string;
  critical: string;
  warning: string;
  info: string;
  quickSetup: string;
}

export const translations: Record<Locale, Translations> = {
  en: {
    appName: 'PayProof POS',
    appSubtitle: 'Owner Management Dashboard',
    overview: 'Overview',
    reports: 'Reports & Trends',
    branchesAndCashiers: 'Branches & Cashiers',
    savedAccounts: 'Saved Accounts',
    fraudAlerts: 'Fraud Alerts',
    catalogProducts: 'Catalog Products',
    salesJournal: 'Sales Journal',
    allBranches: 'All Branches (Consolidated)',
    refresh: 'Refresh',
    totalSalesToday: 'Total Sales Today',
    receiptsCompleted: 'Receipts Completed',
    fraudShieldActive: 'Fraud Shield Active',
    protectedThisWeek: 'Protected this week',
    suspiciousAttempts: 'suspicious attempts',
    doubleSpends: 'Double-Spends',
    underpaidAttempts: 'Underpaid Attempts',
    reviewAlerts: 'Review Alerts',
    exportCsv: 'Export CSV (Sanitized)',
    cashVsMobileRatio: 'Cash vs. Mobile Money Payment Ratio',
    physicalCash: 'Physical Cash',
    mobileMoney: 'Mobile Money',
    branches: 'Branches',
    cashiers: 'Cashiers',
    addBranch: 'Add Branch',
    addCashier: 'Add Cashier',
    registerAccount: 'Register Account',
    verifiedAccounts: 'Verified Receiving Accounts',
    stockStatus: 'Stock Status',
    inStock: 'In Stock',
    lowStock: 'Low Stock Alert',
    reorder: 'Restock Item',
    active: 'Active',
    inactive: 'Inactive',
    resolved: 'Resolved',
    open: 'Open',
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    quickSetup: 'Supermarket Setup Progress',
  },
  am: {
    appName: 'ፔይፕሩፍ ፖስ (PayProof)',
    appSubtitle: 'የባለቤት አስተዳደር ዳሽቦርድ',
    overview: 'አጠቃላይ እይታ',
    reports: 'ሪፖርቶች እና ገቢ',
    branchesAndCashiers: 'ቅርንጫፎች እና ካሼሮች',
    savedAccounts: 'የተመዘገቡ አካውንቶች',
    fraudAlerts: 'የማጭበርበር ማስጠንቀቂያዎች',
    catalogProducts: 'የእቃዎች ዝርዝር (ካታሎግ)',
    salesJournal: 'የሽያጭ መዝገብ',
    allBranches: 'ሁሉም ቅርንጫፎች (የተጠቃለለ)',
    refresh: 'አድስ (ሪፍሬሽ)',
    totalSalesToday: 'የዛሬ አጠቃላይ ሽያጭ',
    receiptsCompleted: 'የተጠናቀቁ ደረሰኞች',
    fraudShieldActive: 'የማጭበርበር መከላከያ ነቅቷል',
    protectedThisWeek: 'በዚህ ሳምንት የተጠበቀው ገቢ',
    suspiciousAttempts: 'አጠራጣሪ ሙከራዎች',
    doubleSpends: 'የተደገሙ ደረሰኞች (Double-Spend)',
    underpaidAttempts: 'ያልተሟላ ክፍያ ሙከራዎች',
    reviewAlerts: 'ማስጠንቀቂያዎችን መርምር',
    exportCsv: 'በሲኤስቪ (CSV) አውርድ',
    cashVsMobileRatio: 'የጥሬ ገንዘብ እና የሞባይል ክፍያ ንፅፅር',
    physicalCash: 'ጥሬ ገንዘብ (Cash)',
    mobileMoney: 'የሞባይል ክፍያ (ቴሌብር / CBE)',
    branches: 'ቅርንጫፎች',
    cashiers: 'ካሼሮች',
    addBranch: 'አዲስ ቅርንጫፍ መዝግብ',
    addCashier: 'አዲስ ካሼር መዝግብ',
    registerAccount: 'አካውንት መዝግብ',
    verifiedAccounts: 'የተረጋገጡ የክፍያ መቀበያ አካውንቶች',
    stockStatus: 'የእቃ ክምችት ሁኔታ',
    inStock: 'በቂ ክምችት አለ',
    lowStock: 'የክምችት እጥረት ማስጠንቀቂያ',
    reorder: 'ክምችት ጨምር',
    active: 'የነቃ',
    inactive: 'የቦዘነ',
    resolved: 'የተፈታ',
    open: 'ክፍት',
    critical: 'አስቸኳይ (Critical)',
    warning: 'ማስጠንቀቂያ',
    info: 'መረጃ',
    quickSetup: 'የሱፐርማርኬት ዝግጅት ደረጃ',
  },
  om: {
    appName: 'PayProof POS',
    appSubtitle: 'Daashboordii Abbaa Qabeenyaa',
    overview: 'Walii-gala',
    reports: 'Gabaasaa fi Bu’aa',
    branchesAndCashiers: 'Dameelee fi Kaashiyeroota',
    savedAccounts: 'Herregawwan Galmaa’an',
    fraudAlerts: 'Akeekkachiisa Hannaa',
    catalogProducts: 'Tarree Meeshaalee',
    salesJournal: 'Galmee Gurgurtaa',
    allBranches: 'Dameelee Hunda (Waliigala)',
    refresh: 'Haroomsi',
    totalSalesToday: 'Gurgurtaa Har’aa',
    receiptsCompleted: 'Nagaheewwan Xumuraman',
    fraudShieldActive: 'Ittisa Hannaa Hojjetaa Jira',
    protectedThisWeek: 'Torban kana kan baraarame',
    suspiciousAttempts: 'yaalii shakkisiisaa',
    doubleSpends: 'Nagahee Irra Deebi’ame',
    underpaidAttempts: 'Kaffaltii Hir’uu',
    reviewAlerts: 'Akeekkachiisa Qoradhu',
    exportCsv: 'CSV Baasi',
    cashVsMobileRatio: 'Qoodama Maallaqa Qulqulluu fi Mobayilii',
    physicalCash: 'Maallaqa Harkaa (Cash)',
    mobileMoney: 'Kaffaltii Mobayilii (Telebirr / CBE)',
    branches: 'Dameelee',
    cashiers: 'Kaashiyeroota',
    addBranch: 'Damee Haaraa Galmeessi',
    addCashier: 'Kaashiyera Haaraa Galmeessi',
    registerAccount: 'Herrega Galmeessi',
    verifiedAccounts: 'Herregawwan Kaffaltii Mirkanaa’an',
    stockStatus: 'Haala Qabeenyaa (Isteekii)',
    inStock: 'Isteekii Ga’aa',
    lowStock: 'Akeekkachiisa Isteekii Xiqqaate',
    reorder: 'Isteekii Dabali',
    active: 'Kan Hojjetu',
    inactive: 'Kan Dhaabbate',
    resolved: 'Kan Furame',
    open: 'Bantamaa',
    critical: 'Murteessaa (Critical)',
    warning: 'Akeekkachiisa',
    info: 'Oodeeffannoo',
    quickSetup: 'Sadarkaa Qophii Suupparmaarkeetii',
  },
};
