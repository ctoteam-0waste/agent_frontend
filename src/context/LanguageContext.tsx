import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'hi' | 'kn' | 'mr' | 'te';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    kn: string;
    mr: string;
    te: string;
  };
}

const translations: Translations = {
  // Dashboard General
  welcome: { en: 'Welcome to the fleet,', hi: 'फ्लीट में आपका स्वागत है,', kn: 'ಫ್ಲೀಟ್‌ಗೆ ಸುಸ್ವಾಗತ,', mr: 'फ्लीटमध्ये आपले स्वागत आहे,', te: 'ఫ్లీట్‌కు స్వాగతం,' },
  goodMorning: { en: 'Good morning,', hi: 'सुप्रभात,', kn: 'ಶುಭೋದಯ,', mr: 'शुभ प्रभात,', te: 'శుభోదయం,' },
  goodAfternoon: { en: 'Good afternoon,', hi: 'नमस्कार,', kn: 'ಶುಭ ಮಧ್ಯಾಹ್ನ,', mr: 'शुभ दुपार,', te: 'శుభ మధ్యాహ్నం,' },
  goodEvening: { en: 'Good evening,', hi: 'शुभ संध्या,', kn: 'ಶುಭ ಸಂಜೆ,', mr: 'शुभ संध्याकाळ,', te: 'శుభ సాయంత్రం,' },
  onlineStatus: { en: 'You are ONLINE', hi: 'आप ऑनलाइन हैं', kn: 'ನೀವು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ', mr: 'तुम्ही ऑनलाइन आहात', te: 'మీరు ఆన్‌లైన్‌లో ఉన్నారు' },
  offlineStatus: { en: 'You are OFFLINE', hi: 'आप ऑफ़लाइन हैं', kn: 'ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ', mr: 'तुम्ही ऑफलाइन आहात', te: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు' },
  onlineSub: { en: 'Accepting pickup requests', hi: 'पिकअप अनुरोध स्वीकार कर रहे हैं', kn: 'ಪಿಕಪ್ ವಿನಂತಿಗಳನ್ನು ಸ್ವೀಕರಿಸಲಾಗುತ್ತಿದೆ', mr: 'पिकअप विनंत्या स्वीकारत आहे', te: 'పికప్ అభ్యర్థనలను అంగీకరిస్తున్నాము' },
  offlineSub: { en: 'Go online to start earning', hi: 'कमाना शुरू करने के लिए ऑनलाइन जाएं', kn: 'ಗಳಿಸಲು ಆನ್‌ಲೈನ್‌ಗೆ ಹೋಗಿ', mr: 'कमाई सुरू करण्यासाठी ऑनलाइन जा', te: 'సంపాదించడానికి ఆన్‌లైన్‌కి వెళ్లండి' },
  
  // New Agent Banner
  readyMission: { en: 'Ready for your first mission? 🚀', hi: 'अपने पहले मिशन के लिए तैयार हैं? 🚀', kn: 'ನಿಮ್ಮ ಮೊದಲ ಮಿಷನ್‌ಗೆ ಸಿದ್ಧರಿದ್ದೀರಾ? 🚀', mr: 'तुमच्या पहिल्या मिशनसाठी तयार आहात? 🚀', te: 'మీ మొదటి మిషన్ కోసం సిద్ధంగా ఉన్నారా? 🚀' },
  bannerSub: { en: 'Turn on your status to ONLINE and wait for nearby pickup requests.', hi: 'अपना स्टेटस ऑनलाइन करें और नज़दीकी पिकअप का इंतज़ार करें।', kn: 'ನಿಮ್ಮ ಸ್ಥಿತಿಯನ್ನು ಆನ್‌ಲೈನ್‌ಗೆ ಬದಲಾಯಿಸಿ ಮತ್ತು ಕಾಯಿರಿ.', mr: 'तुमचा स्टेटस ऑनलाइन करा आणि पिकअपची प्रतीक्षा करा.', te: 'మీ స్థితిని ఆన్‌లైన్‌కి మార్చండి మరియు వేచి ఉండండి.' },
  goOnlineBtn: { en: 'Go online now', hi: 'अभी ऑनलाइन जाएं', kn: 'ಈಗ ಆನ್‌ಲೈನ್‌ಗೆ ಹೋಗಿ', mr: 'आता ऑनलाइन जा', te: 'ఇప్పుడు ఆన్‌లైన్‌కి వెళ్లండి' },
  goToQueue: { en: 'Go to pickup queue', hi: 'पिकअप कतार में जाएं', kn: 'ಪಿಕಪ್ ಕ್ಯೂಗೆ ಹೋಗಿ', mr: 'पिकअप रांगेत जा', te: 'పికప్ క్యూకు వెళ్లండి' },

  // Sections
  trainingHub: { en: 'Agent training hub', hi: 'एजेंट ट्रेनिंग हब', kn: 'ಏಜೆಂಟ್ ತರಬೇತಿ ಕೇಂದ್ರ', mr: 'एजंट प्रशिक्षण केंद्र', te: 'ఏజెంట్ శిక్షణ కేంద్రం' },
  todaySummary: { en: "Today's summary", hi: 'आज का सारांश', kn: 'ಇಂದಿನ ಸಾರಾಂಶ', mr: 'आजचा सारांश', te: 'నేటి సారాంశం' },
  quickActions: { en: 'Quick actions', hi: 'त्वरित कार्रवाई', kn: 'ತ್ವರಿತ ಕ್ರಿಯೆಗಳು', mr: 'त्वरित कृती', te: 'త్వరిత చర్యలు' },
  performance: { en: 'Your performance', hi: 'आपका प्रदर्शन', kn: 'ನಿಮ್ಮ ಸಾಧನೆ', mr: 'तुमची कामगिरी', te: 'మీ పనితీరు' },

  // Stats
  pickupsDone: { en: 'Pickups done', hi: 'पूरे किए गए पिकअप', kn: 'ಪೂರ್ಣಗೊಂಡ ಪಿಕಪ್‌ಗಳು', mr: 'पूर्ण झालेले पिकअप', te: 'పూర్తయిన పికప్‌లు' },
  earnings: { en: 'Earnings (₹)', hi: 'कमाई (₹)', kn: 'ಗಳಿಕೆ (₹)', mr: 'कमाई (₹)', te: 'సంపాదన (₹)' },
  kgCollected: { en: 'Kg collected', hi: 'किलो जमा किया', kn: 'ಕೆಜಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ', mr: 'किलो गोळा केले', te: 'కిలోలు సేకరించబడ్డాయి' },
  activeStreak: { en: 'Active streak', hi: 'सक्रिय स्ट्रीक', kn: 'ಸಕ್ರಿಯ ಸ್ಟ್ರೀಕ್', mr: 'सक्रिय स्ट्रीक', te: 'యాక్టివ్ స్ట్రీక్' },
  yourRating: { en: 'Your rating', hi: 'आपकी रेटिंग', kn: 'ನಿಮ್ಮ ರೇಟಿಂಗ್', mr: 'तुमचे रेटिंग', te: 'మీ రేటింగ్' },
  totalPickups: { en: 'Total pickups', hi: 'कुल पिकअप', kn: 'ಒಟ್ಟು ಪಿಕಪ್‌ಗಳು', mr: 'एकूण पिकअप', te: 'మొత్తం పికప్‌లు' },
  locked: { en: 'Locked', hi: 'लॉक है', kn: 'ಲಾಕ್ ಆಗಿದೆ', mr: 'लॉक केले आहे', te: 'లాక్ చేయబడింది' },
  lockedNote: { en: 'Complete your first pickup to unlock performance metrics.', hi: 'मेट्रिक्स अनलॉक करने के लिए अपना पहला पिकअप पूरा करें।', kn: 'ಅನ್‌ಲಾಕ್ ಮಾಡಲು ನಿಮ್ಮ ಮೊದಲ ಪಿಕಪ್ ಪೂರ್ಣಗೊಳಿಸಿ.', mr: 'अनलॉक करण्यासाठी तुमचे पहिले पिकअप पूर्ण करा.', te: 'అన్‌లాక్ చేయడానికి మీ మొదటి పికప్‌ను పూర్తి చేయండి.' },

  // Profile Settings
  appSettings: { en: 'App settings', hi: 'ऐप सेटिंग्स', kn: 'ಅಪ್ಲಿಕೇಶನ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು', mr: 'अ‍ॅप सेटिंग्ज', te: 'యాప్ సెట్టింగ్‌లు' },
  
  // Earnings & Wallet
  myWallet: { en: 'My wallet', hi: 'मेरा वॉलेट', kn: 'ನನ್ನ ವಾಲೆಟ್', mr: 'माझे पाकीट', te: 'నా వాలెట్' },
  totalEarnings: { en: 'Total earnings', hi: 'कुल कमाई', kn: 'ಒಟ್ಟು ಗಳಿಕೆ', mr: 'एकूण कमाई', te: 'మొత్తం సంపాదన' },
  thisMonth: { en: 'This month', hi: 'इस महीने', kn: 'ಈ ತಿಂಗಳು', mr: 'या महिन्यात', te: 'ఈ నెలలో' },
  avgRating: { en: 'Avg rating', hi: 'औसत रेटिंग', kn: 'ಸರಾಸರಿ ರೇಟಿಂಗ್', mr: 'सरासरी रेटिंग', te: 'సగటు రేటింగ్' },
  recentTxns: { en: 'Recent transactions', hi: 'हाल ही के लेन-देन', kn: 'ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು', mr: 'अलीकडील व्यवहार', te: 'ఇటీవలి లావాదేవీలు' },
  txnType: { en: 'Pickup completed', hi: 'पिकअप पूरा हुआ', kn: 'ಪಿಕಪ್ ಪೂರ್ಣಗೊಂಡಿದೆ', mr: 'पिकअप पूर्ण', te: 'పికప్ పూర్తయింది' },
  
  // Training Slider
  slider1Title: { en: 'The pickup queue', hi: 'पिकअप कतार', kn: 'ಪಿಕಪ್ ಕ್ಯೂ', mr: 'पिकअप रांग', te: 'పికప్ క్యూ' },
  slider1Desc: { en: 'Accept incoming requests and navigate to user locations effortlessly.', hi: 'इनकमिंग अनुरोधों को स्वीकार करें और आसानी से नेविगेट करें।', kn: 'ವಿನಂತಿಗಳನ್ನು ಸ್ವೀಕರಿಸಿ ಮತ್ತು ನ್ಯಾವಿಗೇಟ್ ಮಾಡಿ.', mr: 'विनंत्या स्वीकारा आणि नेव्हिगेट करा.', te: 'అభ్యర్థనలను అంగీకరించండి మరియు నావిగేట్ చేయండి.' },
  slider2Title: { en: '4-step flow', hi: '4-चरण प्रक्रिया', kn: '4-ಹಂತದ ಹರಿವು', mr: '4-चरण प्रवाह', te: '4-దశల ప్రవాహం' },
  slider2Desc: { en: 'Accept → Reach → Weigh Waste → Complete. Simple & fast.', hi: 'स्वीकारें → पहुंचें → तौलें → पूरा करें। आसान और तेज।', kn: 'ಸ್ವೀಕರಿಸಿ → ತಲುಪಿ → ತೂಕ ಮಾಡಿ → ಪೂರ್ಣಗೊಳಿಸಿ.', mr: 'स्वीकारा → पोहोचा → मोजा → पूर्ण करा.', te: 'అంగీకరించండి → చేరుకోండి → బరువు చేయండి → పూర్తి చేయండి.' },
  slider3Title: { en: 'Waste categories 101', hi: 'कचरा श्रेणियां 101', kn: 'ತ್ಯಾಜ್ಯ ವಿಭಾಗಗಳು 101', mr: 'कचरा श्रेणी 101', te: 'వ్యర్థాల వర్గాలు 101' },
  slider3Desc: { en: 'Learn how to identify and weigh Plastic, Metal, and E-waste.', hi: 'प्लास्टिक, धातु और ई-कचरे को पहचानना और तौलना सीखें।', kn: 'ಪ್ಲಾಸ್ಟಿಕ್, ಲೋಹ ಮತ್ತು ಇ-ತ್ಯಾಜ್ಯವನ್ನು ಗುರುತಿಸಲು ಕಲಿಯಿರಿ.', mr: 'प्लास्टिक, धातू आणि ई-कचरा ओळखायला शिका.', te: 'ప్లాస్టిక్, మెటల్ మరియు ఇ-వ్యర్థాలను గుర్తించడం నేర్చుకోండి.' },
  slider4Title: { en: 'Earnings & payouts', hi: 'कमाई और भुगतान', kn: 'ಗಳಿಕೆ ಮತ್ತು ಪಾವತಿಗಳು', mr: 'कमाई आणि पेआउट', te: 'సంపాదన మరియు చెల్లింపులు' },
  slider4Desc: { en: 'Your money is tracked in real-time. Fast and transparent.', hi: 'आपके पैसे रियल-टाइम में ट्रैक किए जाते हैं। तेज़ और पारदर्शी।', kn: 'ನಿಮ್ಮ ಹಣವನ್ನು ನೈಜ ಸಮಯದಲ್ಲಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಲಾಗುತ್ತದೆ.', mr: 'तुमचे पैसे रिअल-टाइममध्ये ट्रॅक केले जातात.', te: 'మీ డబ్బు నిజ సమయంలో ట్రాక్ చేయబడుతుంది.' },
  slider5Title: { en: 'Badges & streaks', hi: 'बैज और स्ट्रीक्स', kn: 'ಬ್ಯಾಡ್ಜ್‌ಗಳು ಮತ್ತು ಸ್ಟ್ರೀಕ್ಸ್', mr: 'बॅजेस आणि स्ट्रीक्स', te: 'బ్యాడ్జ్‌లు మరియు స్ట్రీక్స్' },
  slider5Desc: { en: 'Maintain high ratings and active streaks to unlock bonus zones.', hi: 'बोनस ज़ोन अनलॉक करने के लिए उच्च रेटिंग बनाए रखें।', kn: 'ಬೋನಸ್ ಅನ್‌ಲಾಕ್ ಮಾಡಲು ರೇಟಿಂಗ್ ಕಾಪಾಡಿಕೊಳ್ಳಿ.', mr: 'बोनस अनलॉक करण्यासाठी रेटिंग राखून ठेवा.', te: 'బోనస్ అన్‌లాక్ చేయడానికి రేటింగ్‌ని నిర్వహించండి.' },

  // Training Modal Strings
  close: { en: 'Close', hi: 'बंद करें', kn: 'ಮುಚ್ಚು', mr: 'बंद करा', te: 'మూసివేయు' },
  queueTitle: { en: 'The pickup queue flow', hi: 'पिकअप कतार प्रक्रिया', kn: 'ಪಿಕಪ್ ಕ್ಯೂ ಹರಿವು', mr: 'पिकअप रांग प्रवाह', te: 'పికప్ క్యూ ప్రవాహం' },
  qStep1: { en: 'Notification arrives', hi: 'नोटिफिकेशन आता है', kn: 'ಸೂಚನೆ ಬರುತ್ತದೆ', mr: 'सूचना येते', te: 'నోటిఫికేషన్ వస్తుంది' },
  qStep2: { en: 'Accept job within 30s', hi: '30 सेकंड में जॉब स्वीकारें', kn: '30 ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಕೆಲಸವನ್ನು ಸ್ವೀಕರಿಸಿ', mr: '30 सेकंदात जॉब स्वीकारा', te: '30 సెకన్లలో ఉద్యోగాన్ని అంగీకరించండి' },
  qStep3: { en: 'Follow map to location', hi: 'लोकेशन तक मैप फॉलो करें', kn: 'ನಕ್ಷೆಯನ್ನು ಅನುಸರಿಸಿ', mr: 'नकाशा फॉलो करा', te: 'మ్యాప్‌ని అనుసరించండి' },
  
  jobFlowTitle: { en: 'The 4-step job flow', hi: '4-चरण जॉब प्रक्रिया', kn: '4-ಹಂತದ ಕೆಲಸದ ಹರಿವು', mr: '4-चरण जॉब प्रवाह', te: '4-దశల ఉద్యోగ ప్రవాహం' },
  jStep1: { en: '1. Reached location', hi: '1. लोकेशन पर पहुंचे', kn: '1. ಸ್ಥಳ ತಲುಪಿದೆ', mr: '1. पोहोचलो', te: '1. స్థానానికి చేరుకున్నారు' },
  jStep2: { en: '2. Verify & weigh', hi: '2. जांचें और तौलें', kn: '2. ಪರಿಶೀಲಿಸಿ ಮತ್ತು ತೂಕ ಮಾಡಿ', mr: '2. तपासा आणि मोजा', te: '2. ధృవీకరించండి మరియు బరువు చేయండి' },
  jStep3: { en: '3. Enter details', hi: '3. जानकारी दर्ज करें', kn: '3. ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ', mr: '3. तपशील भरा', te: '3. వివరాలను నమోదు చేయండి' },
  jStep4: { en: '4. Mark complete', hi: '4. पूरा मार्क करें', kn: '4. ಪೂರ್ಣಗೊಂಡಿದೆ ಎಂದು ಗುರುತಿಸಿ', mr: '4. पूर्ण चिन्हांकित करा', te: '4. పూర్తి అయినట్లు గుర్తించండి' },

  wasteTitle: { en: 'Waste categories', hi: 'कचरा श्रेणियां', kn: 'ತ್ಯಾಜ್ಯ ವಿಭಾಗಗಳು', mr: 'कचरा श्रेणी', te: 'వ్యర్థాల వర్గాలు' },
  plastic: { en: 'Plastic (PET, HDPE)', hi: 'प्लास्टिक', kn: 'ಪ್ಲಾಸ್ಟಿಕ್', mr: 'प्लास्टिक', te: 'ప్లాస్టిక్' },
  ewaste: { en: 'E-Waste (Wires, PCBs)', hi: 'ई-कचरा', kn: 'ಇ-ತ್ಯಾಜ್ಯ', mr: 'ई-कचरा', te: 'ఇ-వ్యర్థాలు' },
  metal: { en: 'Metal (Aluminium, Iron)', hi: 'धातु', kn: 'ಲೋಹ', mr: 'धातू', te: 'మెటల్' },

  badgeTitle: { en: 'Badges & rewards', hi: 'बैज और इनाम', kn: 'ಬ್ಯಾಡ್ಜ್‌ಗಳು ಮತ್ತು ಬಹುಮಾನಗಳು', mr: 'बॅजेस आणि बक्षिसे', te: 'బ్యాడ్జ్‌లు మరియు బహుమతులు' },
  bBronze: { en: 'Eco Warrior', hi: 'इको वारियर', kn: 'ಪರಿಸರ ಯೋಧ', mr: 'इको योद्धा', te: 'ఎకో వారియర్' },
  bSilver: { en: 'Planet Saver', hi: 'प्लैनेट सेवर', kn: 'ಗ್ರಹದ ರಕ್ಷಕ', mr: 'ग्रह रक्षक', te: 'ప్లానెట్ సేవర్' },
  bGold: { en: 'Green Guardian', hi: 'ग्रीन गार्जियन', kn: 'ಹಸಿರು ರಕ್ಷಕ', mr: 'ग्रीन गार्डियन', te: 'గ్రీన్ గార్డియన్' },
  bPlat: { en: 'Karma Champion', hi: 'कर्म चैंपियन', kn: 'ಕರ್ಮ ಚಾಂಪಿಯನ್', mr: 'कर्म चॅम्पियन', te: 'కర్మ ఛాంపియన్' },
  giftHamper: { en: 'Gift hamper', hi: 'गिफ्ट हैम्पर', kn: 'ಉಡುಗೊರೆ ಪೆಟ್ಟಿಗೆ', mr: 'गिफ्ट हॅम्पर', te: 'గిఫ్ట్ హ్యాంపర్' },
  
  // Navigation & Tab Labels
  tabHome: { en: 'Home', hi: 'होम', kn: 'ಹೋಮ್', mr: 'होम', te: 'హోమ్' },
  tabQueue: { en: 'Queue', hi: 'कतार', kn: 'ಕ್ಯೂ', mr: 'रांग', te: 'క్యూ' },
  tabEarnings: { en: 'Earnings', hi: 'कमाई', kn: 'ಗಳಿಕೆಗಳು', mr: 'कमाई', te: 'సంపాదన' },
  tabProfile: { en: 'Profile', hi: 'प्रोफाइल', kn: 'ಪ್ರೊಫೈಲ್', mr: 'प्रोफाइल', te: 'ప్రొఫైల్' },

  // Queue Screen
  nearbyPickups: { en: 'NEARBY PICKUPS', hi: 'नज़दीकी पिकअप', kn: 'ಹತ್ತಿರದ ಪಿಕಪ್‌ಗಳು', mr: 'जवळचे पिकअप', te: 'సమీప పికప్‌లు' },
  pickupQueue: { en: 'Pickup queue', hi: 'पिकअप कतार', kn: 'ಪಿಕಪ್ ಕ್ಯೂ', mr: 'पिकअप रांग', te: 'పికప్ క్యూ' },
  viewAndAccept: { en: 'View & accept', hi: 'देखें और स्वीकारें', kn: 'ನೋಡಿ ಮತ್ತು ಸ್ವೀಕರಿಸಿ', mr: 'पहा आणि स्वीकारा', te: 'చూసి అంగీకరించండి' },
  noPickups: { en: 'No pickups available', hi: 'कोई पिकअप उपलब्ध नहीं है', kn: 'ಯಾವುದೇ ಪಿಕಪ್‌ಗಳು ಲಭ್ಯವಿಲ್ಲ', mr: 'कोणतेही पिकअप उपलब्ध नाही', te: 'పికప్‌లు అందుబాటులో లేవు' },
  goOnlineWait: { en: 'Go online and wait for new pickup requests nearby.', hi: 'ऑनलाइन जाएं और नज़दीकी नए पिकअप अनुरोधों का इंतज़ार करें।', kn: 'ಆನ್‌ಲೈನ್‌ಗೆ ಹೋಗಿ ಮತ್ತು ಹತ್ತಿರದ ಪಿಕಪ್ ವಿನಂತಿಗಳಿಗಾಗಿ ಕಾಯಿರಿ.', mr: 'ऑनलाइन जा आणि जवळपासच्या नवीन पिकअप विनंत्यांची प्रतीक्षा करा.', te: 'ఆన్‌లైన్‌కి వెళ్లి సమీపంలోని కొత్త పికప్ అభ్యర్థనల కోసం వేచి ఉండండి.' },

  // Dashboard - Premium banner & quick actions
  inQueue: { en: 'In queue', hi: 'कतार में', kn: 'ಕ್ಯೂನಲ್ಲಿ', mr: 'रांगेत', te: 'క్యూలో' },
  availableNow: { en: 'Available now', hi: 'अभी उपलब्ध', kn: 'ಈಗ ಲಭ್ಯವಿದೆ', mr: 'आता उपलब्ध', te: 'ఇప్పుడు అందుబాటులో ఉంది' },
  totalCompleted: { en: 'Total completed', hi: 'कुल पूर्ण', kn: 'ಒಟ್ಟು ಪೂರ್ಣಗೊಂಡಿದೆ', mr: 'एकूण पूर्ण', te: 'మొత్తం పూర్తయింది' },
  unlocksSoon: { en: 'unlocks soon!', hi: 'जल्द अनलॉक होगा!', kn: 'ಶೀಘ್ರದಲ್ಲೇ ಅನ್‌ಲಾಕ್ ಆಗುತ್ತದೆ!', mr: 'लवकरच अनलॉक होईल!', te: 'త్వరలో అన్‌లాక్ అవుతుంది!' },
  completeMorePickups: { en: 'Complete {n} more pickups', hi: '{n} और पिकअप पूरे करें', kn: '{n} ಹೆಚ್ಚು ಪಿಕಪ್‌ಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ', mr: '{n} आणखी पिकअप पूर्ण करा', te: '{n} మరిన్ని పికప్‌లను పూర్తి చేయండి' },
  pickupsCompleteExclaim: { en: 'Pickups complete!', hi: 'पिकअप पूरे हो गए!', kn: 'ಪಿಕಪ್‌ಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ!', mr: 'पिकअप पूर्ण झाले!', te: 'పికప్‌లు పూర్తయ్యాయి!' },
  maintainRating: { en: 'and maintain a {n}+ rating', hi: 'और {n}+ रेटिंग बनाए रखें', kn: 'ಮತ್ತು {n}+ ರೇಟಿಂಗ್ ಕಾಪಾಡಿಕೊಳ್ಳಿ', mr: 'आणि {n}+ रेटिंग राखा', te: 'మరియు {n}+ రేటింగ్‌ను నిర్వహించండి' },
  earnGiftHamper: { en: 'to earn your company gift hamper.', hi: 'अपना कंपनी गिफ्ट हैम्पर पाने के लिए।', kn: 'ನಿಮ್ಮ ಕಂಪನಿ ಉಡುಗೊರೆ ಪೆಟ್ಟಿಗೆಯನ್ನು ಗಳಿಸಲು.', mr: 'तुमचे कंपनी गिफ्ट हॅम्पर मिळवण्यासाठी.', te: 'మీ కంపెనీ గిఫ్ట్ హ్యాంపర్‌ను పొందడానికి.' },
  viewPickupQueue: { en: 'View pickup queue', hi: 'पिकअप कतार देखें', kn: 'ಪಿಕಪ್ ಕ್ಯೂ ನೋಡಿ', mr: 'पिकअप रांग पहा', te: 'పికప్ క్యూను చూడండి' },
  pickupsWaitingNearby: { en: '{n} pickups waiting nearby', hi: '{n} पिकअप पास में इंतज़ार कर रहे हैं', kn: '{n} ಪಿಕಪ್‌ಗಳು ಹತ್ತಿರದಲ್ಲಿ ಕಾಯುತ್ತಿವೆ', mr: '{n} पिकअप जवळ वाट पाहत आहेत', te: '{n} పికప్‌లు సమీపంలో వేచి ఉన్నాయి' },
  noPickupsRightNow: { en: 'No pickups available right now', hi: 'अभी कोई पिकअप उपलब्ध नहीं है', kn: 'ಈಗ ಯಾವುದೇ ಪಿಕಪ್ ಲಭ್ಯವಿಲ್ಲ', mr: 'सध्या कोणतेही पिकअप उपलब्ध नाही', te: 'ప్రస్తుతం పికప్‌లు అందుబాటులో లేవు' },

  // Dashboard - Activity hub modal
  activityHub: { en: 'Activity hub', hi: 'गतिविधि केंद्र', kn: 'ಚಟುವಟಿಕೆ ಕೇಂದ್ರ', mr: 'क्रियाकलाप केंद्र', te: 'కార్యాచరణ కేంద్రం' },
  notificationsCount: { en: '{n} notifications', hi: '{n} सूचनाएं', kn: '{n} ಸೂಚನೆಗಳು', mr: '{n} सूचना', te: '{n} నోటిఫికేషన్‌లు' },
  latestUpdates: { en: 'Your latest updates', hi: 'आपके नवीनतम अपडेट', kn: 'ನಿಮ್ಮ ಇತ್ತೀಚಿನ ಅಪ್‌ಡೇಟ್‌ಗಳು', mr: 'तुमचे नवीनतम अपडेट्स', te: 'మీ తాజా అప్‌డేట్‌లు' },
  clearAll: { en: 'Clear all', hi: 'सभी हटाएं', kn: 'ಎಲ್ಲವನ್ನೂ ತೆರವುಗೊಳಿಸಿ', mr: 'सर्व साफ करा', te: 'అన్నీ తీసివేయండి' },
  justNow: { en: 'Just now', hi: 'अभी अभी', kn: 'ಇದೀಗ', mr: 'आत्ताच', te: 'ఇప్పుడే' },
  minAgo: { en: '{n} min ago', hi: '{n} मिनट पहले', kn: '{n} ನಿಮಿಷಗಳ ಹಿಂದೆ', mr: '{n} मिनिटांपूर्वी', te: '{n} నిమిషాల క్రితం' },
  hrAgo: { en: '{n} hr ago', hi: '{n} घंटे पहले', kn: '{n} ಗಂಟೆಗಳ ಹಿಂದೆ', mr: '{n} तासांपूर्वी', te: '{n} గంటల క్రితం' },
  dayAgo: { en: '{n} day ago', hi: '{n} दिन पहले', kn: '{n} ದಿನಗಳ ಹಿಂದೆ', mr: '{n} दिवसांपूर्वी', te: '{n} రోజుల క్రితం' },
  noNotificationsYet: { en: 'No notifications yet', hi: 'अभी तक कोई सूचना नहीं', kn: 'ಇನ್ನೂ ಯಾವುದೇ ಸೂಚನೆಗಳಿಲ್ಲ', mr: 'अद्याप कोणतीही सूचना नाही', te: 'ఇంకా నోటిఫికేషన్‌లు లేవు' },
  acceptPickupsActivity: { en: 'Accept pickups to see activity here', hi: 'गतिविधि देखने के लिए पिकअप स्वीकारें', kn: 'ಚಟುವಟಿಕೆ ನೋಡಲು ಪಿಕಪ್‌ಗಳನ್ನು ಸ್ವೀಕರಿಸಿ', mr: 'क्रियाकलाप पाहण्यासाठी पिकअप स्वीकारा', te: 'కార్యాచరణను చూడటానికి పికప్‌లను అంగీకరించండి' },

  // My Jobs (Earnings) Screen
  myJobsTitle: { en: 'My jobs', hi: 'मेरे काम', kn: 'ನನ್ನ ಕೆಲಸಗಳು', mr: 'माझी कामे', te: 'నా పనులు' },
  total: { en: 'Total', hi: 'कुल', kn: 'ಒಟ್ಟು', mr: 'एकूण', te: 'మొత్తం' },
  ratingLabel: { en: 'Rating', hi: 'रेटिंग', kn: 'ರೇಟಿಂಗ್', mr: 'रेटिंग', te: 'రేటింగ్' },
  completedPickups: { en: 'Completed pickups', hi: 'पूर्ण किए गए पिकअप', kn: 'ಪೂರ್ಣಗೊಂಡ ಪಿಕಪ್‌ಗಳು', mr: 'पूर्ण झालेले पिकअप', te: 'పూర్తయిన పికప్‌లు' },
  loadingJobs: { en: 'Loading jobs...', hi: 'काम लोड हो रहे हैं...', kn: 'ಕೆಲಸಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', mr: 'कामे लोड होत आहेत...', te: 'పనులు లోడ్ అవుతున్నాయి...' },
  noCompletedPickups: { en: 'No completed pickups yet', hi: 'अभी तक कोई पूर्ण पिकअप नहीं', kn: 'ಇನ್ನೂ ಯಾವುದೇ ಪಿಕಪ್ ಪೂರ್ಣಗೊಂಡಿಲ್ಲ', mr: 'अद्याप कोणतेही पिकअप पूर्ण झाले नाही', te: 'ఇంకా పూర్తయిన పికప్‌లు లేవు' },
  finishedJobsAppearHere: { en: 'Your finished jobs will appear here', hi: 'आपके पूर्ण किए गए काम यहां दिखेंगे', kn: 'ನಿಮ್ಮ ಪೂರ್ಣಗೊಂಡ ಕೆಲಸಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ', mr: 'तुमची पूर्ण झालेली कामे इथे दिसतील', te: 'మీ పూర్తయిన పనులు ఇక్కడ కనిపిస్తాయి' },
  doneLabel: { en: 'Done', hi: 'पूर्ण', kn: 'ಮುಗಿದಿದೆ', mr: 'पूर्ण', te: 'పూర్తయింది' },
  completedStatus: { en: 'Completed', hi: 'पूर्ण हुआ', kn: 'ಪೂರ್ಣಗೊಂಡಿದೆ', mr: 'पूर्ण झाले', te: 'పూర్తయింది' },
  customerLabel: { en: 'Customer', hi: 'ग्राहक', kn: 'ಗ್ರಾಹಕ', mr: 'ग्राहक', te: 'కస్టమర్' },
  pickupAddressLabel: { en: 'Pickup address', hi: 'पिकअप पता', kn: 'ಪಿಕಪ್ ವಿಳಾಸ', mr: 'पिकअप पत्ता', te: 'పికప్ చిరునామా' },
  dateLabel: { en: 'Date', hi: 'दिनांक', kn: 'ದಿನಾಂಕ', mr: 'तारीख', te: 'తేదీ' },
  timeSlotLabel: { en: 'Time slot', hi: 'समय स्लॉट', kn: 'ಸಮಯ ಸ್ಲಾಟ್', mr: 'वेळ स्लॉट', te: 'సమయ స్లాట్' },
  bookingIdLabel: { en: 'Booking ID', hi: 'बुकिंग आईडी', kn: 'ಬುಕಿಂಗ್ ಐಡಿ', mr: 'बुकिंग आयडी', te: 'బుకింగ్ ఐడీ' },
  itemsCollected: { en: 'Items collected', hi: 'एकत्रित सामान', kn: 'ಸಂಗ್ರಹಿಸಿದ ವಸ್ತುಗಳು', mr: 'गोळा केलेल्या वस्तू', te: 'సేకరించిన వస్తువులు' },
  today: { en: 'Today', hi: 'आज', kn: 'ಇಂದು', mr: 'आज', te: 'ఈరోజు' },
  yesterday: { en: 'Yesterday', hi: 'कल', kn: 'ನಿನ್ನೆ', mr: 'काल', te: 'నిన్న' },
  addressNotAvailable: { en: 'Address not available', hi: 'पता उपलब्ध नहीं है', kn: 'ವಿಳಾಸ ಲಭ್ಯವಿಲ್ಲ', mr: 'पत्ता उपलब्ध नाही', te: 'చిరునామా అందుబాటులో లేదు' },
  notAvailable: { en: 'Not available', hi: 'उपलब्ध नहीं है', kn: 'ಲಭ್ಯವಿಲ್ಲ', mr: 'उपलब्ध नाही', te: 'అందుబాటులో లేదు' },
  mixedWaste: { en: 'Mixed waste', hi: 'मिश्रित कचरा', kn: 'ಮಿಶ್ರ ತ್ಯಾಜ್ಯ', mr: 'मिश्र कचरा', te: 'మిశ్రమ వ్యర్థాలు' },
  karmaUser: { en: 'Karma user', hi: 'कर्मा यूज़र', kn: 'ಕರ್ಮ ಬಳಕೆದಾರ', mr: 'कर्मा वापरकर्ता', te: 'కర్మ యూజర్' },
  unknownLabel: { en: 'Unknown', hi: 'अज्ञात', kn: 'ಅಜ್ಞಾತ', mr: 'अज्ञात', te: 'తెలియదు' },

  // Queue Screen
  activeJobBadge: { en: 'ACTIVE JOB', hi: 'सक्रिय काम', kn: 'ಸಕ್ರಿಯ ಕೆಲಸ', mr: 'सक्रिय काम', te: 'యాక్టివ్ జాబ్' },
  resumePickup: { en: 'Resume pickup', hi: 'पिकअप जारी रखें', kn: 'ಪಿಕಪ್ ಮುಂದುವರಿಸಿ', mr: 'पिकअप सुरू ठेवा', te: 'పికప్‌ను కొనసాగించండి' },
  yourActiveJob: { en: 'YOUR ACTIVE JOB', hi: 'आपका सक्रिय काम', kn: 'ನಿಮ್ಮ ಸಕ್ರಿಯ ಕೆಲಸ', mr: 'तुमचे सक्रिय काम', te: 'మీ యాక్టివ్ జాబ్' },
  availablePickups: { en: 'AVAILABLE PICKUPS', hi: 'उपलब्ध पिकअप', kn: 'ಲಭ್ಯವಿರುವ ಪಿಕಪ್‌ಗಳು', mr: 'उपलब्ध पिकअप', te: 'అందుబాటులో ఉన్న పికప్‌లు' },
  cancelLabel: { en: 'Cancel', hi: 'रद्द करें', kn: 'ರದ್ದುಗೊಳಿಸಿ', mr: 'रद्द करा', te: 'రద్దు చేయండి' },
  moreItems: { en: '+{n} more', hi: '+{n} और', kn: '+{n} ಹೆಚ್ಚು', mr: '+{n} अधिक', te: '+{n} మరిన్ని' },
  idLabel: { en: 'ID', hi: 'आईडी', kn: 'ಐಡಿ', mr: 'आयडी', te: 'ఐడీ' },
  pickupAcceptedTitle: { en: 'Pickup accepted!', hi: 'पिकअप स्वीकार किया गया!', kn: 'ಪಿಕಪ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ!', mr: 'पिकअप स्वीकारले!', te: 'పికప్ ఆమోదించబడింది!' },
  pickupAcceptedMsg: { en: 'You have successfully accepted this pickup task.', hi: 'आपने यह पिकअप कार्य सफलतापूर्वक स्वीकार कर लिया है।', kn: 'ನೀವು ಈ ಪಿಕಪ್ ಕಾರ್ಯವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸ್ವೀಕರಿಸಿದ್ದೀರಿ.', mr: 'तुम्ही हे पिकअप कार्य यशस्वीरित्या स्वीकारले आहे.', te: 'మీరు ఈ పికప్ టాస్క్‌ను విజయవంతంగా అంగీకరించారు.' },
  serverUnreachableTitle: { en: 'Server unreachable', hi: 'सर्वर से संपर्क नहीं हो सका', kn: 'ಸರ್ವರ್ ತಲುಪಲಾಗಲಿಲ್ಲ', mr: 'सर्व्हरशी संपर्क होऊ शकला नाही', te: 'సర్వర్‌ను చేరుకోలేకపోయింది' },
  serverUnreachableMsg: { en: 'Could not contact server to accept booking, proceeding in sandbox mode.', hi: 'बुकिंग स्वीकार करने के लिए सर्वर से संपर्क नहीं हो सका, सैंडबॉक्स मोड में आगे बढ़ रहे हैं।', kn: 'ಬುಕಿಂಗ್ ಸ್ವೀಕರಿಸಲು ಸರ್ವರ್ ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ, ಸ್ಯಾಂಡ್‌ಬಾಕ್ಸ್ ಮೋಡ್‌ನಲ್ಲಿ ಮುಂದುವರಿಯಲಾಗುತ್ತಿದೆ.', mr: 'बुकिंग स्वीकारण्यासाठी सर्व्हरशी संपर्क होऊ शकला नाही, सँडबॉक्स मोडमध्ये पुढे जात आहे.', te: 'బుకింగ్‌ను అంగీకరించడానికి సర్వర్‌ను సంప్రదించలేకపోయింది, సాండ్‌బాక్స్ మోడ్‌లో కొనసాగుతోంది.' },
  startJob: { en: 'Start job', hi: 'काम शुरू करें', kn: 'ಕೆಲಸ ಪ್ರಾರಂಭಿಸಿ', mr: 'काम सुरू करा', te: 'పనిని ప్రారంభించండి' },

  // Profile Screen
  logout: { en: 'Logout', hi: 'लॉग आउट', kn: 'ಲಾಗ್ ಔಟ್', mr: 'लॉगआउट', te: 'లాగ్ అవుట్' },
  language: { en: 'Language', hi: 'भाषा', kn: 'ಭಾಷೆ', mr: 'भाषा', te: 'భాష' },
  agentDetails: { en: 'Agent details', hi: 'एजेंट विवरण', kn: 'ಏಜೆಂಟ್ ವಿವರಗಳು', mr: 'एजंट तपशील', te: 'ఏజెంట్ వివరాలు' },
  mobileLabel: { en: 'Mobile', hi: 'मोबाइल', kn: 'ಮೊಬೈಲ್', mr: 'मोबाइल', te: 'మొబైల్' },
  notSet: { en: 'Not set', hi: 'सेट नहीं है', kn: 'ಹೊಂದಿಸಿಲ್ಲ', mr: 'सेट केलेले नाही', te: 'సెట్ చేయలేదు' },
  badgeJourney: { en: 'Badge journey', hi: 'बैज यात्रा', kn: 'ಬ್ಯಾಡ್ಜ್ ಪ್ರಯಾಣ', mr: 'बॅज प्रवास', te: 'బ్యాడ్జ్ ప్రయాణం' },
  zoneLabel: { en: 'Zone', hi: 'क्षेत्र', kn: 'ವಲಯ', mr: 'झोन', te: 'జోన్' },
  notAssigned: { en: 'Not assigned', hi: 'निर्धारित नहीं', kn: 'ನಿಯೋಜಿಸಲಾಗಿಲ್ಲ', mr: 'नियुक्त केलेले नाही', te: 'కేటాయించబడలేదు' },
  accountLabel: { en: 'Account', hi: 'खाता', kn: 'ಖಾತೆ', mr: 'खाते', te: 'ఖాతా' },
  logoutConfirm: { en: 'Are you sure you want to logout?', hi: 'क्या आप वाकई लॉग आउट करना चाहते हैं?', kn: 'ನೀವು ಖಚಿತವಾಗಿ ಲಾಗ್ ಔಟ್ ಮಾಡಲು ಬಯಸುವಿರಾ?', mr: 'तुम्हाला नक्की लॉगआउट करायचे आहे का?', te: 'మీరు ఖచ్చితంగా లాగ్ అవుట్ చేయాలనుకుంటున్నారా?' },
  badgeJourneyTitle: { en: 'Your badge journey 🏆', hi: 'आपकी बैज यात्रा 🏆', kn: 'ನಿಮ್ಮ ಬ್ಯಾಡ್ಜ್ ಪ್ರಯಾಣ 🏆', mr: 'तुमचा बॅज प्रवास 🏆', te: 'మీ బ్యాడ్జ్ ప్రయాణం 🏆' },
  currentLevel: { en: 'Current level', hi: 'वर्तमान स्तर', kn: 'ಪ್ರಸ್ತುತ ಮಟ್ಟ', mr: 'सध्याची पातळी', te: 'ప్రస్తుత స్థాయి' },
  pickupsToUnlock: { en: '{n} / 150 pickups to unlock', hi: 'अनलॉक करने के लिए {n} / 150 पिकअप', kn: 'ಅನ್‌ಲಾಕ್ ಮಾಡಲು {n} / 150 ಪಿಕಪ್‌ಗಳು', mr: 'अनलॉक करण्यासाठी {n} / 150 पिकअप', te: 'అన్‌లాక్ చేయడానికి {n} / 150 పికప్‌లు' },
  badgeRoadmap: { en: 'Badge roadmap', hi: 'बैज रोडमैप', kn: 'ಬ್ಯಾಡ್ಜ್ ರೋಡ್‌ಮ್ಯಾಪ್', mr: 'बॅज रोडमॅप', te: 'బ్యాడ్జ్ రోడ్‌మ్యాప్' },
  unlockedStatus: { en: 'Unlocked', hi: 'अनलॉक हो गया', kn: 'ಅನ್‌ಲಾಕ್ ಆಗಿದೆ', mr: 'अनलॉक झाले', te: 'అన్‌లాక్ చేయబడింది' },
  leftToUnlock: { en: '{n} left to unlock!', hi: 'अनलॉक करने के लिए {n} बाकी!', kn: 'ಅನ್‌ಲಾಕ್ ಮಾಡಲು {n} ಬಾಕಿ!', mr: 'अनलॉक करण्यासाठी {n} बाकी!', te: 'అన్‌లాక్ చేయడానికి {n} మిగిలి ఉన్నాయి!' },
  chooseLanguage: { en: 'Choose language / भाषा', hi: 'भाषा चुनें / Choose language', kn: 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ / Choose language', mr: 'भाषा निवडा / Choose language', te: 'భాషను ఎంచుకోండి / Choose language' },
  onlineLabel: { en: 'Online', hi: 'ऑनलाइन', kn: 'ಆನ್‌ಲೈನ್', mr: 'ऑनलाइन', te: 'ఆన్‌లైన్' },
  offlineLabel: { en: 'Offline', hi: 'ऑफ़लाइन', kn: 'ಆಫ್‌ಲೈನ್', mr: 'ऑफलाइन', te: 'ఆఫ్‌లైన్' },
  pickupsWord: { en: 'pickups', hi: 'पिकअप', kn: 'ಪಿಕಪ್‌ಗಳು', mr: 'पिकअप', te: 'పికప్‌లు' },
  ratingWord: { en: 'rating', hi: 'रेटिंग', kn: 'ರೇಟಿಂಗ್', mr: 'रेटिंग', te: 'రేటింగ్' },

  // JobFlowScreen
  stepAccepted: { en: 'Accepted', hi: 'स्वीकृत', kn: 'ಸ್ವೀಕರಿಸಲಾಗಿದೆ', mr: 'स्वीकारले', te: 'ఆమోదించబడింది' },
  stepReached: { en: 'Reached', hi: 'पहुंचे', kn: 'ತಲುಪಿದೆ', mr: 'पोहोचले', te: 'చేరుకున్నారు' },
  stepAddItems: { en: 'Add items', hi: 'आइटम जोड़ें', kn: 'ಐಟಂಗಳನ್ನು ಸೇರಿಸಿ', mr: 'वस्तू जोडा', te: 'వస్తువులను జోడించండి' },
  stepPickupDone: { en: 'Pickup done', hi: 'पिकअप पूरा हुआ', kn: 'ಪಿಕಪ್ ಮುಗಿದಿದೆ', mr: 'पिकअप पूर्ण झाले', te: 'పికప్ పూర్తయింది' },
  unitPiece: { en: 'piece', hi: 'पीस', kn: 'ಪೀಸ್', mr: 'पीस', te: 'పీస్' },
  unitKg: { en: 'kg', hi: 'किग्रा', kn: 'ಕೆಜಿ', mr: 'किलो', te: 'కేజీ' },
  bookingCancelledTitle: { en: 'Booking cancelled', hi: 'बुकिंग रद्द कर दी गई', kn: 'ಬುಕಿಂಗ್ ರದ್ದುಗೊಂಡಿದೆ', mr: 'बुकिंग रद्द केली', te: 'బుకింగ్ రద్దు చేయబడింది' },
  bookingCancelledMsg: { en: 'The user has cancelled this pickup.', hi: 'उपयोगकर्ता ने यह पिकअप रद्द कर दिया है।', kn: 'ಬಳಕೆದಾರರು ಈ ಪಿಕಪ್ ಅನ್ನು ರದ್ದುಗೊಳಿಸಿದ್ದಾರೆ.', mr: 'वापरकर्त्याने हे पिकअप रद्द केले आहे.', te: 'వినియోగదారు ఈ పికప్‌ను రద్దు చేశారు.' },
  reachedOfflineMsg: { en: 'Could not register reached state online. Continue in offline mode?', hi: 'ऑनलाइन पहुंचने की स्थिति दर्ज नहीं हो सकी। ऑफ़लाइन मोड में जारी रखें?', kn: 'ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ತಲುಪಿದ ಸ್ಥಿತಿಯನ್ನು ದಾಖಲಿಸಲಾಗಲಿಲ್ಲ. ಆಫ್‌ಲೈನ್ ಮೋಡ್‌ನಲ್ಲಿ ಮುಂದುವರಿಸುವುದೇ?', mr: 'ऑनलाइन पोहोचल्याची स्थिती नोंदवता आली नाही. ऑफलाइन मोडमध्ये सुरू ठेवायचे?', te: 'ఆన్‌లైన్‌లో చేరుకున్న స్థితిని నమోదు చేయలేకపోయాము. ఆఫ్‌లైన్ మోడ్‌లో కొనసాగించాలా?' },
  offlineStepLabel: { en: 'Offline step', hi: 'ऑफ़लाइन चरण', kn: 'ಆಫ್‌ಲೈನ್ ಹಂತ', mr: 'ऑफलाइन टप्पा', te: 'ఆఫ్‌లైన్ దశ' },
  weightsRequiredTitle: { en: 'Weights required ⚖️', hi: 'वज़न आवश्यक है ⚖️', kn: 'ತೂಕಗಳು ಅಗತ್ಯವಿದೆ ⚖️', mr: 'वजन आवश्यक आहे ⚖️', te: 'బరువులు అవసరం ⚖️' },
  weightsRequiredMsg: { en: 'Please enter a valid weight (greater than 0) for at least one of the item categories.', hi: 'कृपया कम से कम एक आइटम श्रेणी के लिए मान्य वज़न (0 से अधिक) दर्ज करें।', kn: 'ದಯವಿಟ್ಟು ಕನಿಷ್ಠ ಒಂದು ಐಟಂ ವರ್ಗಕ್ಕೆ ಮಾನ್ಯ ತೂಕವನ್ನು (0 ಕ್ಕಿಂತ ಹೆಚ್ಚು) ನಮೂದಿಸಿ.', mr: 'कृपया किमान एका आयटम श्रेणीसाठी वैध वजन (0 पेक्षा जास्त) प्रविष्ट करा.', te: 'దయచేసి కనీసం ఒక వస్తువుల వర్గానికి చెల్లుబాటు అయ్యే బరువు (0 కంటే ఎక్కువ) నమోదు చేయండి.' },
  verificationFailedTitle: { en: 'Verification failed', hi: 'सत्यापन विफल हुआ', kn: 'ಪರಿಶೀಲನೆ ವಿಫಲವಾಗಿದೆ', mr: 'पडताळणी अयशस्वी झाली', te: 'ధృవీకరణ విఫలమైంది' },
  verificationFailedMsg: { en: 'Could not verify weights with the server. Proceed in offline sandbox?', hi: 'सर्वर के साथ वज़न सत्यापित नहीं हो सका। ऑफ़लाइन सैंडबॉक्स में आगे बढ़ें?', kn: 'ಸರ್ವರ್‌ನೊಂದಿಗೆ ತೂಕಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗಲಿಲ್ಲ. ಆಫ್‌ಲೈನ್ ಸ್ಯಾಂಡ್‌ಬಾಕ್ಸ್‌ನಲ್ಲಿ ಮುಂದುವರಿಸುವುದೇ?', mr: 'सर्व्हरसह वजन पडताळता आले नाही. ऑफलाइन सँडबॉक्समध्ये पुढे जायचे?', te: 'సర్వర్‌తో బరువులను ధృవీకరించలేకపోయాము. ఆఫ్‌లైన్ సాండ్‌బాక్స్‌లో కొనసాగించాలా?' },
  pickupCompleteNotifTitle: { en: 'Pickup complete 🎉', hi: 'पिकअप पूरा हुआ 🎉', kn: 'ಪಿಕಪ್ ಪೂರ್ಣಗೊಂಡಿದೆ 🎉', mr: 'पिकअप पूर्ण झाले 🎉', te: 'పికప్ పూర్తయింది 🎉' },
  pickupCompleteNotifMsg: { en: 'Job has been successfully closed and recorded.', hi: 'कार्य सफलतापूर्वक बंद और दर्ज कर दिया गया है।', kn: 'ಕೆಲಸವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಮುಚ್ಚಲಾಗಿದೆ ಮತ್ತು ದಾಖಲಿಸಲಾಗಿದೆ.', mr: 'काम यशस्वीरित्या बंद करून नोंदवले गेले आहे.', te: 'జాబ్ విజయవంతంగా మూసివేయబడింది మరియు నమోదు చేయబడింది.' },
  pickupCompleteAlertMsg: { en: 'Job has been successfully closed and recorded on the database.', hi: 'कार्य सफलतापूर्वक बंद और डेटाबेस में दर्ज कर दिया गया है।', kn: 'ಕೆಲಸವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಮುಚ್ಚಲಾಗಿದೆ ಮತ್ತು ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ದಾಖಲಿಸಲಾಗಿದೆ.', mr: 'काम यशस्वीरित्या बंद करून डेटाबेसमध्ये नोंदवले गेले आहे.', te: 'జాబ్ విజయవంతంగా మూసివేయబడి డేటాబేస్‌లో నమోదు చేయబడింది.' },
  completionFailedTitle: { en: 'Completion failed', hi: 'पूर्णता विफल हुई', kn: 'ಪೂರ್ಣಗೊಳಿಸುವಿಕೆ ವಿಫಲವಾಗಿದೆ', mr: 'पूर्णता अयशस्वी झाली', te: 'పూర్తి చేయడం విఫలమైంది' },
  completionFailedMsg: { en: 'Could not close job online. Close locally in offline mode?', hi: 'कार्य ऑनलाइन बंद नहीं हो सका। ऑफ़लाइन मोड में स्थानीय रूप से बंद करें?', kn: 'ಕೆಲಸವನ್ನು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಮುಚ್ಚಲಾಗಲಿಲ್ಲ. ಆಫ್‌ಲೈನ್ ಮೋಡ್‌ನಲ್ಲಿ ಸ್ಥಳೀಯವಾಗಿ ಮುಚ್ಚುವುದೇ?', mr: 'काम ऑनलाइन बंद करता आले नाही. ऑफलाइन मोडमध्ये स्थानिक पातळीवर बंद करायचे?', te: 'జాబ్‌ను ఆన్‌లైన్‌లో మూసివేయలేకపోయాము. ఆఫ్‌లైన్ మోడ్‌లో స్థానికంగా మూసివేయాలా?' },
  closeLocally: { en: 'Close locally', hi: 'स्थानीय रूप से बंद करें', kn: 'ಸ್ಥಳೀಯವಾಗಿ ಮುಚ್ಚಿ', mr: 'स्थानिक पातळीवर बंद करा', te: 'స్థానికంగా మూసివేయండి' },
  stepUpdateErrorTitle: { en: 'Step update error', hi: 'चरण अपडेट त्रुटि', kn: 'ಹಂತ ಅಪ್‌ಡೇಟ್ ದೋಷ', mr: 'टप्पा अपडेट त्रुटी', te: 'దశ నవీకరణ లోపం' },
  stepUpdateErrorMsg: { en: 'An unexpected error occurred during step processing.', hi: 'चरण संसाधित करते समय एक अप्रत्याशित त्रुटि हुई।', kn: 'ಹಂತ ಪ್ರಕ್ರಿಯೆಯ ಸಮಯದಲ್ಲಿ ಅನಿರೀಕ್ಷಿತ ದೋಷ ಸಂಭವಿಸಿದೆ.', mr: 'टप्पा प्रक्रिया करताना अनपेक्षित त्रुटी आली.', te: 'దశ ప్రాసెసింగ్ సమయంలో ఊహించని లోపం సంభవించింది.' },
  reachedAction: { en: 'I have reached', hi: 'मैं पहुंच गया हूं', kn: 'ನಾನು ತಲುಪಿದ್ದೇನೆ', mr: 'मी पोहोचलो आहे', te: 'నేను చేరుకున్నాను' },
  confirmAddItemsAction: { en: 'Confirm & add items', hi: 'पुष्टि करें और आइटम जोड़ें', kn: 'ಖಚಿತಪಡಿಸಿ ಮತ್ತು ಐಟಂಗಳನ್ನು ಸೇರಿಸಿ', mr: 'पुष्टी करा आणि वस्तू जोडा', te: 'నిర్ధారించి వస్తువులను జోడించండి' },
  markPickupDoneAction: { en: 'Mark pickup done', hi: 'पिकअप पूर्ण के रूप में चिह्नित करें', kn: 'ಪಿಕಪ್ ಮುಗಿದಿದೆ ಎಂದು ಗುರುತಿಸಿ', mr: 'पिकअप पूर्ण म्हणून चिन्हांकित करा', te: 'పికప్ పూర్తయినట్లు గుర్తించండి' },
  completePickupAction: { en: 'Complete pickup', hi: 'पिकअप पूरा करें', kn: 'ಪಿಕಪ್ ಪೂರ್ಣಗೊಳಿಸಿ', mr: 'पिकअप पूर्ण करा', te: 'పికప్ పూర్తి చేయండి' },
  activePickupTitle: { en: 'Active pickup', hi: 'सक्रिय पिकअप', kn: 'ಸಕ್ರಿಯ ಪಿಕಪ್', mr: 'सक्रिय पिकअप', te: 'యాక్టివ్ పికప్' },
  communicatingServer: { en: 'Communicating with server...', hi: 'सर्वर से संपर्क हो रहा है...', kn: 'ಸರ್ವರ್‌ನೊಂದಿಗೆ ಸಂವಹನ ನಡೆಯುತ್ತಿದೆ...', mr: 'सर्व्हरशी संवाद साधत आहे...', te: 'సర్వర్‌తో సంభాషిస్తోంది...' },
  itemsToCollect: { en: 'Items to collect', hi: 'एकत्र करने योग्य आइटम', kn: 'ಸಂಗ್ರಹಿಸಬೇಕಾದ ಐಟಂಗಳು', mr: 'गोळा करायच्या वस्तू', te: 'సేకరించవలసిన వస్తువులు' },
  notesOptional: { en: 'Notes (optional)', hi: 'टिप्पणियां (वैकल्पिक)', kn: 'ಟಿಪ್ಪಣಿಗಳು (ಐಚ್ಛಿಕ)', mr: 'टिपा (पर्यायी)', te: 'గమనికలు (ఐచ్ఛికం)' },
  wasteObservationsPlaceholder: { en: 'Any observations about the waste...', hi: 'कचरे के बारे में कोई टिप्पणी...', kn: 'ತ್ಯಾಜ್ಯದ ಬಗ್ಗೆ ಯಾವುದೇ ಅವಲೋಕನಗಳು...', mr: 'कचऱ्याबद्दल काही निरीक्षणे...', te: 'వ్యర్థాల గురించి ఏవైనా పరిశీలనలు...' },
  mapLoading: { en: 'Loading live map…', hi: 'लाइव मैप लोड हो रहा है…', kn: 'ಲೈವ್ ನಕ್ಷೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ…', mr: 'लाइव्ह नकाशा लोड होत आहे…', te: 'లైవ్ మ్యాప్ లోడ్ అవుతోంది…' },
  mapLoadingSub: { en: 'Showing live route to the pickup', hi: 'पिकअप तक का लाइव रूट दिखा रहे हैं', kn: 'ಪಿಕಪ್‌ಗೆ ಲೈವ್ ಮಾರ್ಗವನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ', mr: 'पिकअपपर्यंतचा थेट मार्ग दाखवत आहे', te: 'పికప్‌కు లైవ్ రూట్ చూపిస్తోంది' },
  itemsVerified: { en: 'Items verified', hi: 'आइटम सत्यापित', kn: 'ಐಟಂಗಳು ಪರಿಶೀಲಿಸಲಾಗಿದೆ', mr: 'वस्तू पडताळल्या', te: 'వస్తువులు ధృవీకరించబడ్డాయి' },
  reviewFinalItems: { en: 'Please review the final collected items before closing the job.', hi: 'कार्य बंद करने से पहले कृपया अंतिम संग्रहित आइटम की समीक्षा करें।', kn: 'ಕೆಲಸವನ್ನು ಮುಚ್ಚುವ ಮೊದಲು ದಯವಿಟ್ಟು ಅಂತಿಮ ಸಂಗ್ರಹಿಸಿದ ಐಟಂಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.', mr: 'काम बंद करण्यापूर्वी कृपया अंतिम गोळा केलेल्या वस्तूंचे पुनरावलोकन करा.', te: 'జాబ్‌ను మూసివేయడానికి ముందు దయచేసి చివరిగా సేకరించిన వస్తువులను సమీక్షించండి.' },
  finalSummary: { en: 'Final summary', hi: 'अंतिम सारांश', kn: 'ಅಂತಿಮ ಸಾರಾಂಶ', mr: 'अंतिम सारांश', te: 'తుది సారాంశం' },
  agentNotesLabel: { en: 'Agent notes:', hi: 'एजेंट टिप्पणियां:', kn: 'ಏಜೆಂಟ್ ಟಿಪ್ಪಣಿಗಳು:', mr: 'एजंट टिपा:', te: 'ఏజెంట్ గమనికలు:' },
  totalWeight: { en: 'Total weight', hi: 'कुल वज़न', kn: 'ಒಟ್ಟು ತೂಕ', mr: 'एकूण वजन', te: 'మొత్తం బరువు' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, count?: number) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem('agentLanguage').then(savedLang => {
      if (savedLang) setLanguageState(savedLang as Language);
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('agentLanguage', lang);
  };

  const t = (key: string, count?: number): string => {
    if (!translations[key]) return key;
    const str = translations[key][language] || translations[key]['en'];
    return count !== undefined ? str.replace('{n}', String(count)) : str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
