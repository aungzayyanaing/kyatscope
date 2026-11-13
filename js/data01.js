
/* ===== Embedded rates snapshot — 2026-10-30 =====
   Market values for USD, THB, CNY, JPY, KRW, VND and EUR below are
   the EgCurrency visible Buy/Sell blocks verified on 2026-10-30
   (browser check 19:51–19:59 MMT), NOT the site's embedded JSON —
   the two disagreed on 6 of 7 pair levels and 5 of 7 change % that
   day, and the visible block is the rate a visitor actually sees.
   unit = the foreign amount the quoted price covers
   (JPY, HKD and PKR quoted per 100, KRW, VND, IDR and LAK per 1000, others per 1) */
var DATA = [];
DATA.push({ code:"USD", name:"အမေရိကန် ဒေါ်လာ", en:"US Dollar", sym:"$", icon:"us", ctry:"United States", kw:"အမေရိကန် America USA", unit:1,
    market:{buy:4826.66, sell:4778.39, chg:33.33, pct:0.70},
    bank:{buy:2105.25, sell:2094.75, chg:0, pct:0} });
DATA.push({ code:"THB", name:"ထိုင်း ဘတ်", en:"Thai Baht", sym:"฿", icon:"th", ctry:"Thailand", kw:"ထိုင်း", unit:1,
    market:{buy:143.18, sell:141.75, chg:1.03, pct:0.72},
    bank:{buy:62.3455, sell:62.0345, chg:0, pct:0} });
DATA.push({ code:"CNY", name:"တရုတ် ယွမ်", en:"Chinese Yuan", sym:"¥", icon:"cn", ctry:"China", kw:"တရုတ်", unit:1,
    market:{buy:726.91, sell:719.64, chg:6.11, pct:0.85},
    bank:{buy:315.7775, sell:314.2025, chg:0, pct:0} });
DATA.push({ code:"JPY", name:"ဂျပန် ယန်း", en:"Japanese Yen", sym:"¥", icon:"jp", ctry:"Japan", kw:"ဂျပန်", unit:100,
    market:{buy:2806, sell:2778, chg:98, pct:3.62},
    bank:{buy:1334.8889, sell:1328.2311, chg:0, pct:0} });
DATA.push({ code:"KRW", name:"ကိုရီးယား ဝမ်", en:"South Korean Won", sym:"₩", icon:"kr", ctry:"South Korea", kw:"ကိုရီးယား Korea", unit:1000,
    market:{buy:3620, sell:3580, chg:40, pct:1.12},
    bank:{buy:1571.7195, sell:1563.8805, chg:0, pct:0} });
DATA.push({ code:"VND", name:"ဗီယက်နမ် ဒေါင်", en:"Vietnamese Dong", sym:"₫", icon:"vn", ctry:"Vietnam", kw:"ဗီယက်နမ်", unit:1000,
    market:{buy:180, sell:180, chg:0, pct:0},
    bank:{buy:81.5033, sell:81.0968, chg:0, pct:0} });
DATA.push({ code:"SGD", name:"စင်ကာပူ ဒေါ်လာ", en:"Singapore Dollar", sym:"S$", unit:1, icon:"sg", ctry:"Singapore", kw:"စင်ကာပူ",
    market:{buy:3736.98, sell:3699.61, chg:26.04, pct:0.7},
    bank:{buy:1642.2253, sell:1634.0347, chg:0, pct:0} });
DATA.push({ code:"MYR", name:"မလေးရှား ရင်းဂစ်", en:"Malaysian Ringgit", sym:"RM", unit:1, icon:"my", ctry:"Malaysia", kw:"မလေးရှား",
    market:{buy:1181.07, sell:1169.26, chg:13.99, pct:1.2},
    bank:{buy:516.3677, sell:513.7923, chg:0, pct:0} });
DATA.push({ code:"EUR", name:"ယူရို", en:"Euro", sym:"€", unit:1, icon:"eu", ctry:"Eurozone — Germany, France, Italy, Spain, Netherlands", kw:"ဥရောပ ဂျာမနီ ပြင်သစ် အီတလီ စပိန် Europe",
    market:{buy:5362.96, sell:5309.33, chg:37.04, pct:0.7},
    bank:{buy:2342.622, sell:2330.9381, chg:0, pct:0} });
DATA.push({ code:"GBP", name:"ဗြိတိန် ပေါင် စတာလင်", en:"British Pound Sterling", sym:"£", unit:1, icon:"gb", ctry:"United Kingdom", kw:"အင်္ဂလန် ဗြိတိန် UK England",
    market:{buy:6293.86, sell:6230.92, chg:125.03, pct:2.03},
    bank:{buy:2798.8296, sell:2784.8704, chg:0, pct:0} });
DATA.push({ code:"AUD", name:"ဩစတြေးလျ ဒေါ်လာ", en:"Australian Dollar", sym:"$", unit:1, icon:"au", ctry:"Australia", kw:"ဩစတြေးလျ",
    market:{buy:3231.98, sell:3199.66, chg:-21.44, pct:-0.66},
    bank:{buy:1481.4644, sell:1474.0756, chg:0, pct:0} });
DATA.push({ code:"CZK", name:"ချက် ကိုရုနာ", en:"Czech Koruna", sym:"Kč", unit:1, icon:"cz", ctry:"Czechia (Czech Republic)", kw:"ချက်",
    market:{buy:211.28, sell:209.17, chg:0.45, pct:0.21},
    bank:{buy:96.1999, sell:95.7201, chg:0, pct:0} });
DATA.push({ code:"EGP", name:"အီဂျစ် ပေါင်", en:"Egyptian Pound", sym:"E£", unit:1, icon:"eg", ctry:"Egypt", kw:"အီဂျစ်",
    market:{buy:84.9, sell:84.05, chg:0.59, pct:0.7},
    bank:{buy:37.4734, sell:37.2865, chg:0, pct:0} });
DATA.push({ code:"NZD", name:"နယူးဇီလန် ဒေါ်လာ", en:"New Zealand Dollar", sym:"$", unit:1, icon:"nz", ctry:"New Zealand", kw:"နယူးဇီလန်",
    market:{buy:2585.58, sell:2559.73, chg:18.01, pct:0.7},
    bank:{buy:1180.4137, sell:1174.5263, chg:0, pct:0} });
DATA.push({ code:"RSD", name:"ဆားဘီးယား ဒီနာ", en:"Serbian Dinar", sym:"din.", unit:1, icon:"rs", ctry:"Serbia", kw:"ဆားဘီးယား",
    market:{buy:43.82, sell:43.38, chg:0.43, pct:0.99},
    bank:{buy:19.9397, sell:19.8403, chg:0, pct:0} });
DATA.push({ code:"BND", name:"ဘရူနိုင်း ဒေါ်လာ", en:"Brunei Dollar", sym:"B$", unit:1, icon:"bn", ctry:"Brunei", kw:"ဘရူနိုင်း",
    market:{buy:2881.52, sell:2852.71, chg:20.07, pct:0.7},
    bank:{buy:1642.2253, sell:1634.0347, chg:0, pct:0} });
DATA.push({ code:"HKD", name:"ဟောင်ကောင် ဒေါ်လာ", en:"Hong Kong Dollar", sym:"HK$", unit:100, icon:"hk", ctry:"Hong Kong", kw:"ဟောင်ကောင်",
    market:{buy:61012, sell:60402, chg:425, pct:0.7},
    bank:{buy:26835.9225, sell:26702.0775, chg:0, pct:0} });
DATA.push({ code:"SAR", name:"ဆော်ဒီ ရီယယ်", en:"Saudi Riyal", sym:"﷼", unit:1, icon:"sa", ctry:"Saudi Arabia", kw:"ဆော်ဒီ အာရေဗျ",
    market:{buy:1252.18, sell:1239.66, chg:18.41, pct:1.49},
    bank:{buy:561.009, sell:558.211, chg:0, pct:0} });
DATA.push({ code:"KHR", name:"ကမ္ဘောဒီးယား ရီရယ်", en:"Cambodian Riel", sym:"៛", unit:1, icon:"kh", ctry:"Cambodia", kw:"ကမ္ဘောဒီးယား",
    market:{buy:1.15, sell:1.14, chg:0.01, pct:0.88},
    bank:{buy:0.5153, sell:0.5127, chg:0, pct:0} });
DATA.push({ code:"IDR", name:"အင်ဒိုနီးရှား ရူပီးယား", en:"Indonesian Rupiah", sym:"Rp", unit:1000, icon:"id", ctry:"Indonesia", kw:"အင်ဒိုနီးရှား",
    market:{buy:260, sell:260, chg:0, pct:0},
    bank:{buy:115.7887, sell:115.2113, chg:0, pct:0} });
DATA.push({ code:"BDT", name:"ဘင်္ဂလားဒေ့ရှ် တာကာ", en:"Bangladeshi Taka", sym:"৳", unit:1, icon:"bd", ctry:"Bangladesh", kw:"ဘင်္ဂလားဒေ့ရှ်",
    market:{buy:36.3, sell:35.93, chg:1.53, pct:4.4},
    bank:{buy:16.9523, sell:16.8677, chg:0, pct:0} });
DATA.push({ code:"INR", name:"အိန္ဒိယ ရူပီး", en:"Indian Rupee", sym:"₹", unit:1, icon:"in", ctry:"India", kw:"အိန္ဒိယ",
    market:{buy:38.33, sell:37.95, chg:-11.55, pct:-23.16},
    bank:{buy:22.1151, sell:22.0049, chg:0, pct:0} });
DATA.push({ code:"KWD", name:"ကူဝိတ် ဒီနာ", en:"Kuwaiti Dinar", sym:"د.ك", unit:1, icon:"kw", ctry:"Kuwait", kw:"ကူဝိတ်",
    market:{buy:15282.2, sell:15129.38, chg:154.81, pct:1.02},
    bank:{buy:6827.4661, sell:6793.4139, chg:0, pct:0} });
DATA.push({ code:"KES", name:"ကင်ညာ ရှီလင်", en:"Kenyan Shilling", sym:"KSh", unit:1, icon:"ke", ctry:"Kenya", kw:"ကင်ညာ",
    market:{buy:36.8, sell:36.44, chg:0.33, pct:0.9},
    bank:{buy:16.2104, sell:16.1296, chg:0, pct:0} });
DATA.push({ code:"LAK", name:"လာအို ကစ်", en:"Laotian Kip", sym:"₭", unit:1000, icon:"la", ctry:"Laos", kw:"လာအို",
    market:{buy:210, sell:210, chg:0, pct:0},
    bank:{buy:93.5332, sell:93.0667, chg:0, pct:0} });
DATA.push({ code:"BRL", name:"ဘရာဇီး ရီယယ်", en:"Brazilian Real", sym:"R", unit:1, icon:"br", ctry:"Brazil", kw:"ဘရာဇီး",
    market:{buy:879.29, sell:870.5, chg:6.13, pct:0.7},
    bank:{buy:393.371, sell:391.409, chg:0, pct:0} });
DATA.push({ code:"RUB", name:"ရုရှား ရူဘယ်", en:"Russian Ruble", sym:"₽", unit:1, icon:"ru", ctry:"Russia", kw:"ရုရှား",
    market:{buy:59.38, sell:58.79, chg:0.37, pct:0.63},
    bank:{buy:26.1352, sell:26.0048, chg:0, pct:0} });
DATA.push({ code:"NOK", name:"နော်ဝေ ခရိုနာ", en:"Norwegian Krone", sym:"kr", unit:1, icon:"no", ctry:"Norway", kw:"နော်ဝေ",
    market:{buy:500.87, sell:495.86, chg:8.64, pct:1.76},
    bank:{buy:225.5224, sell:224.3976, chg:0, pct:0} });
DATA.push({ code:"ILS", name:"အစ္စရေး ရှီကယ်", en:"Israeli New Shekel", sym:"₪", unit:1, icon:"il", ctry:"Israel", kw:"အစ္စရေး",
    market:{buy:1490.13, sell:1475.23, chg:41.96, pct:2.9},
    bank:{buy:682.502, sell:679.098, chg:0, pct:0} });
DATA.push({ code:"CHF", name:"ဆွစ် ဖရန့်", en:"Swiss Franc", sym:"CHF", unit:1, icon:"ch", ctry:"Switzerland", kw:"ဆွစ် ဆွစ်ဇာလန် Swiss",
    market:{buy:5627.45, sell:5571.17, chg:39.21, pct:0.7},
    bank:{buy:2535.9842, sell:2523.3358, chg:0, pct:0} });
DATA.push({ code:"NPR", name:"နီပေါ ရူပီး", en:"Nepalese Rupee", sym:"₨", unit:1, icon:"np", ctry:"Nepal", kw:"နီပေါ",
    market:{buy:31.39, sell:31.07, chg:0.21, pct:0.67},
    bank:{buy:13.8245, sell:13.7555, chg:0, pct:0} });
DATA.push({ code:"CAD", name:"ကနေဒါ ဒေါ်လာ", en:"Canadian Dollar", sym:"$", unit:1, icon:"ca", ctry:"Canada", kw:"ကနေဒါ",
    market:{buy:3368.54, sell:3334.86, chg:69.93, pct:2.12},
    bank:{buy:1497.5445, sell:1490.0755, chg:0, pct:0} });
DATA.push({ code:"PKR", name:"ပါကစ္စတန် ရူပီး", en:"Pakistani Rupee", sym:"₨", unit:100, icon:"pk", ctry:"Pakistan", kw:"ပါကစ္စတန်",
    market:{buy:1673, sell:1656, chg:17, pct:1.03},
    bank:{buy:760.8975, sell:757.1025, chg:0, pct:0} });
DATA.push({ code:"PHP", name:"ဖိလစ်ပိုင် ပီဆို", en:"Philippine Peso", sym:"₱", unit:1, icon:"ph", ctry:"Philippines", kw:"ဖိလစ်ပိုင်",
    market:{buy:74.82, sell:74.07, chg:0.76, pct:1.03},
    bank:{buy:32.9021, sell:32.7379, chg:0, pct:0} });
DATA.push({ code:"DKK", name:"ဒိန်းမတ် ခရိုနာ", en:"Danish Krone", sym:"kr", unit:1, icon:"dk", ctry:"Denmark", kw:"ဒိန်းမတ်",
    market:{buy:689.24, sell:682.35, chg:-9.29, pct:-1.33},
    bank:{buy:313.4116, sell:311.8484, chg:0, pct:0} });
DATA.push({ code:"ZAR", name:"တောင်အာဖရိက ရန်း", en:"South African Rand", sym:"R", unit:1, icon:"za", ctry:"South Africa", kw:"တောင်အာဖရိက",
    market:{buy:275.54, sell:272.78, chg:8.39, pct:3.14},
    bank:{buy:126.4453, sell:125.8147, chg:0, pct:0} });
DATA.push({ code:"LKR", name:"သီရိလင်္ကာ ရူပီး", en:"Sri Lankan Rupee", sym:"Rs", unit:1, icon:"lk", ctry:"Sri Lanka", kw:"သီရိလင်္ကာ",
    market:{buy:13.84, sell:13.71, chg:0.48, pct:3.59},
    bank:{buy:6.3358, sell:6.3042, chg:0, pct:0} });
DATA.push({ code:"SEK", name:"ဆွီဒင် ခရိုနာ", en:"Swedish Krona", sym:"kr", unit:1, icon:"se", ctry:"Sweden", kw:"ဆွီဒင်",
    market:{buy:471.73, sell:467.01, chg:3.29, pct:0.7},
    bank:{buy:211.5776, sell:210.5224, chg:0, pct:0} });
DATA.push({ code:"WST", name:"ဆာမိုအာ တာလာ", en:"Samoan Tala", sym:"WS$", unit:1, icon:"ws", ctry:"Samoa", kw:"ဆာမိုအာ",
    bank:{buy:811.7897, sell:731.8939, chg:-2.5064, pct:-0.31} });
DATA.push({ code:"SBD", name:"ဆိုလိုမွန် ကျွန်း ဒေါ်လာ", en:"Solomon Islands Dollar", sym:"SI", unit:1, icon:"sb", ctry:"Solomon Islands", kw:"ဆိုလိုမွန်",
    bank:{buy:288.7911, sell:237.3408, chg:-0.2785, pct:-0.1} });
DATA.push({ code:"MOP", name:"မကာအို ပါတာကာ", en:"Macanese Pataca", sym:"MOP", unit:1, icon:"mo", ctry:"Macau", kw:"မကာအို",
    bank:{buy:259.5187, sell:259.5187, chg:-0.239, pct:-0.09} });
DATA.push({ code:"PGK", name:"ပါပူအာ နယူးဂီနီ ကီနာ", en:"Papua New Guinean Kina", sym:"K", unit:1, icon:"pg", ctry:"Papua New Guinea", kw:"ပါပူအာ",
    bank:{buy:566.4426, sell:464.046, chg:-0.557, pct:-0.1} });
DATA.push({ code:"NGN", name:"နိုင်ဂျီးရီးယား နိုင်းရာ", en:"Nigerian Naira", sym:"₦", unit:1, icon:"ng", ctry:"Nigeria", kw:"နိုင်ဂျီးရီးယား",
    bank:{buy:1.5562, sell:1.5628, chg:0, pct:0} });
DATA.push({ code:"AED", name:"ယူအေအီး ဒီဟမ်", en:"UAE Dirham", sym:"د.إ", unit:1, icon:"ae", ctry:"United Arab Emirates", kw:"ဒူဘိုင်း UAE အာရပ် Dubai",
    bank:{buy:589.7925, sell:549.77, chg:0, pct:0} });
DATA.push({ code:"VUV", name:"ဗနူအာတူ ဗာတူ", en:"Vanuatu Vatu", sym:"VT", unit:1, icon:"vu", ctry:"Vanuatu", kw:"ဗနူအာတူ",
    bank:{buy:18.0216, sell:17.4491, chg:0, pct:0} });
DATA.push({ code:"HUF", name:"ဟန်ဂေရီ ဖိုရင့်", en:"Hungarian Forint", sym:"Ft", unit:1, icon:"hu", ctry:"Hungary", kw:"ဟန်ဂေရီ",
    bank:{buy:6.3777, sell:6.3777, chg:0.0086, pct:0.13} });
DATA.push({ code:"PLN", name:"ပိုလန် ဇွာတီ", en:"Polish Złoty", sym:"zł", unit:1, icon:"pl", ctry:"Poland", kw:"ပိုလန်",
    bank:{buy:549.9675, sell:512.7658, chg:-0.3804, pct:-0.07} });
DATA.push({ code:"ETB", name:"အီသီယိုးပီးယား ဘီရ်", en:"Ethiopian Birr", sym:"Br", unit:1, icon:"et", ctry:"Ethiopia", kw:"အီသီယိုးပီးယား",
    bank:{buy:13.014, sell:12.9497, chg:0.0238, pct:0.18} });
DATA.push({ code:"TOP", name:"တောင်ဂါ ပါအန်ဂါ", en:"Tongan Paʻanga", sym:"T$", unit:1, icon:"to", ctry:"Tonga", kw:"တောင်ဂါ",
    bank:{buy:952.9826, sell:794.8676, chg:0, pct:0} });
DATA.push({ code:"XAF", name:"ဗဟိုအာဖရိက CFA ဖရန့်", en:"Central African CFA Franc", sym:"FCFA", unit:1, icon:"cm", ctry:"Cameroon — Central Africa (CEMAC)", kw:"ကင်မရွန်း ဗဟိုအာဖရိက CFA",
    bank:{buy:3.5693, sell:3.5512, chg:-0.0038, pct:-0.11} });
DATA.push({ code:"TJS", name:"တာဂျစ် ဆိုမိုနီ", en:"Tajikistani Somoni", sym:"ЅМ", unit:1, icon:"tj", ctry:"Tajikistan", kw:"တာဂျစ်ကစ္စတန်",
    bank:{buy:227.908, sell:227.908, chg:0, pct:0} });
DATA.push({ code:"MXN", name:"မက္ကဆီကို ပီဆို", en:"Mexican Peso", sym:"$", unit:1, icon:"mx", ctry:"Mexico", kw:"မက္ကဆီကို",
    bank:{buy:111.6946, sell:112.2108, chg:-0.4449, pct:-0.4} });
DATA.push({ code:"TRY", name:"တူရကီ လီရာ", en:"Turkish Lira", sym:"₺", unit:1, icon:"tr", ctry:"Turkey (Türkiye)", kw:"တူရကီ",
    bank:{buy:42.1643, sell:42.0632, chg:0, pct:0} });
DATA.push({ code:"ISK", name:"အိုက်စလန် ခရိုနာ", en:"Icelandic Króna", sym:"kr", unit:1, icon:"is", ctry:"Iceland", kw:"အိုက်စလန်",
    bank:{buy:17.1609, sell:17.113, chg:0, pct:0} });
DATA.push({ code:"GEL", name:"ဂျော်ဂျီယာ လာရီ", en:"Georgian Lari", sym:"₾", unit:1, icon:"ge", ctry:"Georgia", kw:"ဂျော်ဂျီယာ",
    bank:{buy:810.1007, sell:810.1007, chg:0, pct:0} });
DATA.push({ code:"GNF", name:"ဂီနီ ဖရန့်", en:"Guinean Franc", sym:"FG", unit:1, icon:"gn", ctry:"Guinea", kw:"ဂီနီ",
    bank:{buy:0.238, sell:0.238, chg:0, pct:0} });
DATA.push({ code:"KYD", name:"ကေမန် ကျွန်း ဒေါ်လာ", en:"Cayman Islands Dollar", sym:"$", unit:1, icon:"ky", ctry:"Cayman Islands", kw:"ကေမန်",
    bank:{buy:2639.1872, sell:2488.2909, chg:0, pct:0} });
DATA.push({ code:"MWK", name:"မာလာဝီ ကွာချာ", en:"Malawian Kwacha", sym:"MK", unit:1, icon:"mw", ctry:"Malawi", kw:"မာလာဝီ",
    bank:{buy:1.1771, sell:1.1598, chg:0, pct:0} });
DATA.push({ code:"MZN", name:"မိုဇမ်ဘစ် မက်တီကယ်", en:"Mozambican Metical", sym:"MT", unit:1, icon:"mz", ctry:"Mozambique", kw:"မိုဇမ်ဘစ်",
    bank:{buy:33.0705, sell:32.5559, chg:-0.0472, pct:-0.14} });
DATA.push({ code:"OMR", name:"အိုမန် ရီယယ်", en:"Omani Rial", sym:"ر.ع.", unit:1, icon:"om", ctry:"Oman", kw:"အိုမန်",
    bank:{buy:5442.8356, sell:5335.0876, chg:0, pct:0} });
DATA.push({ code:"BWP", name:"ဘော့ဆွာနာ ပူလာ", en:"Botswana Pula", sym:"P", unit:1, icon:"bw", ctry:"Botswana", kw:"ဘော့ဆွာနာ",
    bank:{buy:155.506, sell:155.506, chg:-0.2792, pct:-0.18} });
DATA.push({ code:"BYN", name:"ဘယ်လာရုစ် ရူဘယ်", en:"Belarusian Ruble", sym:"Br", unit:1, icon:"by", ctry:"Belarus", kw:"ဘယ်လာရုစ်",
    bank:{buy:718.3168, sell:710.9627, chg:0, pct:0} });
DATA.push({ code:"SLE", name:"ဆီရာလီယွန် လီယွန်", en:"Sierra Leonean Leone", sym:"Le", unit:1, icon:"sl", ctry:"Sierra Leone", kw:"ဆီရာလီယွန်",
    bank:{buy:92.0825, sell:92.0825, chg:0, pct:0} });
DATA.push({ code:"AMD", name:"အာမေးနီးယား ဒရမ်", en:"Armenian Dram", sym:"֏", unit:1, icon:"am", ctry:"Armenia", kw:"အာမေးနီးယား",
    bank:{buy:5.9253, sell:5.7119, chg:-0.0063, pct:-0.11} });
DATA.push({ code:"CDF", name:"ကွန်ဂို ဖရန့်", en:"Congolese Franc", sym:"FC", unit:1, icon:"cd", ctry:"DR Congo", kw:"ကွန်ဂို Congo",
    bank:{buy:0.9463, sell:0.9091, chg:0, pct:0} });
DATA.push({ code:"HTG", name:"ဟေတီ ဂူးဒ်", en:"Haitian Gourde", sym:"G", unit:1, icon:"ht", ctry:"Haiti", kw:"ဟေတီ",
    bank:{buy:16.207, sell:15.9791, chg:0, pct:0} });
DATA.push({ code:"QAR", name:"ကာတာ ရီယယ်", en:"Qatari Riyal", sym:"ر.ق", unit:1, icon:"qa", ctry:"Qatar", kw:"ကာတာ",
    bank:{buy:577.3547, sell:564.4509, chg:-1.2716, pct:-0.22} });
DATA.push({ code:"TND", name:"တူနီးရှား ဒီနာ", en:"Tunisian Dinar", sym:"د.ت", unit:1, icon:"tn", ctry:"Tunisia", kw:"တူနီးရှား",
    bank:{buy:713.7033, sell:692.9511, chg:-1.2827, pct:-0.18} });
DATA.push({ code:"BAM", name:"ဘော့စနီးယား မတ်", en:"Bosnia and Herzegovina Convertible Mark", sym:"KM", unit:1, icon:"ba", ctry:"Bosnia and Herzegovina", kw:"ဘော့စနီးယား",
    bank:{buy:1198.9866, sell:1198.9866, chg:0, pct:0} });
DATA.push({ code:"FJD", name:"ဖီဂျီ ဒေါ်လာ", en:"Fijian Dollar", sym:"FJ$", unit:1, icon:"fj", ctry:"Fiji", kw:"ဖီဂျီ",
    bank:{buy:1027.6274, sell:917.6491, chg:0, pct:0} });
DATA.push({ code:"JOD", name:"ဂျော်ဒန် ဒီနာ", en:"Jordanian Dinar", sym:"د.ا", unit:1, icon:"jo", ctry:"Jordan", kw:"ဂျော်ဒန်",
    bank:{buy:2986.4562, sell:2938.4038, chg:9.5771, pct:0.32} });
DATA.push({ code:"KGS", name:"ကာဂျစ် ဆိုမ်", en:"Kyrgyzstani Som", sym:"с", unit:1, icon:"kg", ctry:"Kyrgyzstan", kw:"ကာဂျစ္စတန်",
    bank:{buy:23.7479, sell:23.8669, chg:0, pct:0} });
DATA.push({ code:"SRD", name:"ဆူရီနမ် ဒေါ်လာ", en:"Surinamese Dollar", sym:"$", unit:1, icon:"sr", ctry:"Suriname", kw:"ဆူရီနမ်",
    bank:{buy:56.0322, sell:55.1854, chg:0, pct:0} });
DATA.push({ code:"KZT", name:"ကာဇက် တန်ဂီ", en:"Kazakhstani Tenge", sym:"₸", unit:1, icon:"kz", ctry:"Kazakhstan", kw:"ကာဇက်စတန်",
    bank:{buy:4.601, sell:4.601, chg:0, pct:0} });
DATA.push({ code:"LRD", name:"လိုက်ဘေးရီးယား ဒေါ်လာ", en:"Liberian Dollar", sym:"L$", unit:1, icon:"lr", ctry:"Liberia", kw:"လိုက်ဘေးရီးယား",
    bank:{buy:12.3734, sell:12.2864, chg:0, pct:0} });
DATA.push({ code:"UYU", name:"ဥရုဂွေး ပီဆို", en:"Uruguayan Peso", sym:"$U", unit:1, icon:"uy", ctry:"Uruguay", kw:"ဥရုဂွေး",
    bank:{buy:55.0587, sell:48.9991, chg:0, pct:0} });
DATA.push({ code:"XOF", name:"အနောက်အာဖရိက CFA ဖရန့်", en:"CFA Franc BCEAO", sym:"CFA", unit:1, icon:"bf", ctry:"Senegal — West Africa (BCEAO)", kw:"ဆီနီဂေါ အနောက်အာဖရိက CFA Burkina",
    bank:{buy:3.5535, sell:3.5713, chg:0, pct:0} });
DATA.push({ code:"ARS", name:"အာဂျင်တီးနား ပီဆို", en:"Argentine Peso", sym:"$", unit:1, icon:"ar", ctry:"Argentina", kw:"အာဂျင်တီးနား",
    bank:{buy:1.3666, sell:1.3624, chg:0, pct:0} });
DATA.push({ code:"BBD", name:"ဘာဘေးဒိုး ဒေါ်လာ", en:"Barbadian Dollar", sym:"$", unit:1, icon:"bb", ctry:"Barbados", kw:"ဘာဘေးဒိုး",
    bank:{buy:1067.9003, sell:1029.8902, chg:0, pct:0} });
DATA.push({ code:"KMF", name:"ကိုမိုရို ဖရန့်", en:"Comorian Franc", sym:"CF", unit:1, icon:"km", ctry:"Comoros", kw:"ကိုမိုရို",
    bank:{buy:4.8354, sell:4.8596, chg:0, pct:0} });
DATA.push({ code:"UAH", name:"ယူကရိန်း ဟရစ်ဗ်နီးယား", en:"Ukrainian Hryvnia", sym:"₴", unit:1, icon:"ua", ctry:"Ukraine", kw:"ယူကရိန်း",
    bank:{buy:46.43, sell:46.1961, chg:0, pct:0} });
DATA.push({ code:"ALL", name:"အယ်လ်ဘေးနီးယား လက်", en:"Albanian Lek", sym:"L", unit:1, icon:"al", ctry:"Albania", kw:"အယ်လ်ဘေးနီးယား",
    bank:{buy:25.7456, sell:25.7456, chg:0, pct:0} });
DATA.push({ code:"DJF", name:"ဂျီဘူတီ ဖရန့်", en:"Djiboutian Franc", sym:"Fdj", unit:1, icon:"dj", ctry:"Djibouti", kw:"ဂျီဘူတီ",
    bank:{buy:13.0425, sell:13.0425, chg:0, pct:0} });
DATA.push({ code:"STN", name:"ဆာအိုတိုမေ ဒိုဘရာ", en:"São Tomé and Príncipe Dobra", sym:"Db", unit:1, icon:"st", ctry:"São Tomé and Príncipe", kw:"ဆာအိုတိုမေ Sao Tome",
    bank:{buy:95.2369, sell:95.7143, chg:0.1444, pct:0.15} });
DATA.push({ code:"TTD", name:"ထရီနီဒတ် ဒေါ်လာ", en:"Trinidad and Tobago Dollar", sym:"TT", unit:1, icon:"tt", ctry:"Trinidad and Tobago", kw:"ထရီနီဒတ်",
    bank:{buy:312.4399, sell:290.4555, chg:0, pct:0} });
DATA.push({ code:"AFN", name:"အာဖဂန် အာဖဂနီ", en:"Afghan Afghani", sym:"؋", unit:1, icon:"af", ctry:"Afghanistan", kw:"အာဖဂန်နစ္စတန်",
    bank:{buy:32.8095, sell:32.6661, chg:0.0222, pct:0.07} });
DATA.push({ code:"NAD", name:"နမီးဘီးယား ဒေါ်လာ", en:"Namibian Dollar", sym:"N$", unit:1, icon:"na", ctry:"Namibia", kw:"နမီးဘီးယား",
    bank:{buy:131.137, sell:122.7543, chg:0, pct:0} });
DATA.push({ code:"PYG", name:"ပါရာဂွေး ဂွာရာနီ", en:"Paraguayan Guarani", sym:"₲", unit:1, icon:"py", ctry:"Paraguay", kw:"ပါရာဂွေး",
    bank:{buy:0.3576, sell:0.3576, chg:0, pct:0} });
DATA.push({ code:"SZL", name:"ဆွာဇီ လီလာန်ဂီနီ", en:"Swazi Lilangeni", sym:"E", unit:1, icon:"sz", ctry:"Eswatini (Swaziland)", kw:"ဆွာဇီလန် အက်စ်ဝါတီနီ Swaziland",
    bank:{buy:130.2813, sell:122.0331, chg:0, pct:0} });
DATA.push({ code:"ZMW", name:"ဇမ်ဘီးယား ကွာချာ", en:"Zambian Kwacha", sym:"ZK", unit:1, icon:"zm", ctry:"Zambia", kw:"ဇမ်ဘီးယား",
    bank:{buy:104.8955, sell:103.335, chg:0, pct:0} });
DATA.push({ code:"AOA", name:"အန်ဂိုလာ ကွမ်ဇာ", en:"Angolan Kwanza", sym:"Kz", unit:1, icon:"ao", ctry:"Angola", kw:"အန်ဂိုလာ",
    bank:{buy:2.2183, sell:2.1655, chg:0, pct:0} });
DATA.push({ code:"AZN", name:"အဇာဘိုင်ဂျန် မနတ်", en:"Azerbaijani Manat", sym:"₼", unit:1, icon:"az", ctry:"Azerbaijan", kw:"အဇာဘိုင်ဂျန်",
    bank:{buy:1260.6928, sell:1206.3921, chg:-2.287, pct:-0.18} });
DATA.push({ code:"BOB", name:"ဘိုလီးဗီးယား နို", en:"Bolivian Boliviano", sym:"Bs", unit:1, icon:"bo", ctry:"Bolivia", kw:"ဘိုလီးဗီးယား",
    bank:{buy:173.2673, sell:173.2673, chg:-1.4415, pct:-0.83} });
DATA.push({ code:"CLP", name:"ချီလီ ပီဆို", en:"Chilean Peso", sym:"$", unit:1, icon:"cl", ctry:"Chile", kw:"ချီလီ",
    bank:{buy:2.1226, sell:2.1226, chg:0.0029, pct:0.14} });
DATA.push({ code:"IQD", name:"အီရတ် ဒီနာ", en:"Iraqi Dinar", sym:"د.ع", unit:1, icon:"iq", ctry:"Iraq", kw:"အီရတ်",
    bank:{buy:1.4064, sell:1.3702, chg:0, pct:0} });
DATA.push({ code:"TZS", name:"တန်ဇန်းနီးယား ရှီလင်", en:"Tanzanian Shilling", sym:"TSh", unit:1, icon:"tz", ctry:"Tanzania", kw:"တန်ဇန်းနီးယား",
    bank:{buy:0.7981, sell:0.7942, chg:0, pct:0} });
DATA.push({ code:"SHP", name:"စိန့်ဟယ်လီနာ ပေါင်", en:"Saint Helena Pound", sym:"£", unit:1, icon:"sh", ctry:"Saint Helena", kw:"စိန့်ဟယ်လီနာ",
    bank:{buy:2846.0782, sell:2677.2822, chg:0, pct:0} });
DATA.push({ code:"BSD", name:"ဘဟားမား ဒေါ်လာ", en:"Bahamian Dollar", sym:"B$", unit:1, icon:"bs", ctry:"Bahamas", kw:"ဘဟားမား",
    bank:{buy:2156.6409, sell:2047.8742, chg:0, pct:0} });
DATA.push({ code:"BZD", name:"ဘလီဇ် ဒေါ်လာ", en:"Belize Dollar", sym:"BZ$", unit:1, icon:"bz", ctry:"Belize", kw:"ဘလီဇ်",
    bank:{buy:1056.9971, sell:1043.8331, chg:0, pct:0} });
DATA.push({ code:"GHS", name:"ဂါနာ စီဒီ", en:"Ghanaian Cedi", sym:"₵", unit:1, icon:"gh", ctry:"Ghana", kw:"ဂါနာ",
    bank:{buy:182.1522, sell:179.1702, chg:-0.1503, pct:-0.08} });
DATA.push({ code:"MGA", name:"မဒါဂတ်စကာ အာရီယာရီ", en:"Malagasy Ariary", sym:"Ar", unit:1, icon:"mg", ctry:"Madagascar", kw:"မဒါဂတ်စကာ",
    bank:{buy:0.4716, sell:0.4464, chg:0.0014, pct:0.29} });
DATA.push({ code:"SDG", name:"ဆူဒန် ပေါင်", en:"Sudanese Pound", sym:"ج.س.", unit:1, icon:"sd", ctry:"Sudan", kw:"ဆူဒန်",
    bank:{buy:0.4749, sell:0.4737, chg:0, pct:0} });
DATA.push({ code:"MNT", name:"မွန်ဂိုလီးယား တုဂရစ်", en:"Mongolian Tugrik", sym:"₮", unit:1, icon:"mn", ctry:"Mongolia", kw:"မွန်ဂိုလီးယား",
    bank:{buy:0.5821, sell:0.5821, chg:-0.0016, pct:-0.28} });
