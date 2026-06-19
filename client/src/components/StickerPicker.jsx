import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STICKERS = {
  cute: [
    { name: 'Cute Cat', path: '/stickers/cute/cat.png' },
    { name: 'Playful Dog', path: '/stickers/cute/dog.png' },
    { name: 'Happy Panda', path: '/stickers/cute/panda.png' },
    { name: 'Cute Teddy', path: '/stickers/cute/teddy.png' },
    { name: 'Magical Unicorn', path: '/stickers/cute/unicorn.png' },
    { name: 'Cute Rabbit', path: '/stickers/cute/rabbit.png' },
    { name: 'Cute Monkey', path: '/stickers/cute/monkey.png' },
    { name: 'Cute Ghost', path: '/stickers/cute/ghost.png' },
    { name: 'Cute Pig', path: '/stickers/cute/pig.png' },
    { name: 'Cute Frog', path: '/stickers/cute/frog.png' },
    { name: 'Cute Chicken', path: '/stickers/cute/chicken.png' },
    { name: 'Cute Alien', path: '/stickers/cute/alien.png' },
    { name: 'Cute Fox', path: '/stickers/cute/fox.png' },
    { name: 'Cute Koala', path: '/stickers/cute/koala.png' },
    { name: 'Cute Lion', path: '/stickers/cute/lion.png' },
  ],
  love: [
    { name: 'Heart Eyes', path: '/stickers/love/heart_eyes.png' },
    { name: 'Gift Heart', path: '/stickers/love/heart_ribbon.png' },
    { name: 'Love Heart', path: '/stickers/love/red_heart.png' },
    { name: 'Blow Kiss', path: '/stickers/love/kiss.png' },
    { name: 'Growing Heart', path: '/stickers/love/growing_heart.png' },
    { name: 'Two Hearts', path: '/stickers/love/two_hearts.png' },
    { name: 'Heart Arrow', path: '/stickers/love/heart_arrow.png' },
    { name: 'Revolving Hearts', path: '/stickers/love/revolving_hearts.png' },
    { name: 'Sparkling Heart', path: '/stickers/love/sparkling_heart.png' },
    { name: 'Broken Heart', path: '/stickers/love/broken_heart.png' },
    { name: 'Love Letter', path: '/stickers/love/love_letter.png' },
    { name: 'Face with Hearts', path: '/stickers/love/face_hearts.png' },
  ],
  funny: [
    { name: 'Zany Face', path: '/stickers/funny/zany.png' },
    { name: 'Tears of Joy', path: '/stickers/funny/joy.png' },
    { name: 'Mindblown', path: '/stickers/funny/mindblown.png' },
    { name: 'Wink Tongue', path: '/stickers/funny/tongue.png' },
    { name: 'Party Popper', path: '/stickers/funny/party.png' },
    { name: 'ROFL Laughing', path: '/stickers/funny/rofl.png' },
    { name: 'Sweat Smile', path: '/stickers/funny/sweat_smile.png' },
    { name: 'Smirk Face', path: '/stickers/funny/smirk.png' },
    { name: 'Thinking Face', path: '/stickers/funny/thinking.png' },
    { name: 'Shushing Face', path: '/stickers/funny/shushing.png' },
    { name: 'Squint Smile', path: '/stickers/funny/squint_smile.png' },
    { name: 'Wink Face', path: '/stickers/funny/wink.png' },
    { name: 'Woozy Face', path: '/stickers/funny/woozy.png' },
    { name: 'Big Grin', path: '/stickers/funny/grin_big.png' },
    { name: 'Surprise Face', path: '/stickers/funny/surprise.png' },
    { name: 'Funny Clown', path: '/stickers/funny/clown.png' },
  ],
  sad: [
    // Cry / Sad
    { name: 'Sad Crying', path: '/stickers/sad/cry.png' },
    { name: 'Loudly Cry', path: '/stickers/sad/loud_cry.png' },
    { name: 'Pleading Face', path: '/stickers/sad/pleading.png' },
    { name: 'Holding Back Tears', path: '/stickers/sad/holding_back_tears.png' },
    { name: 'Frowning Sad', path: '/stickers/sad/frown.png' },
    { name: 'Disappointed Sad', path: '/stickers/sad/disappointed.png' },
    { name: 'Sad Relieved', path: '/stickers/sad/sad_relieved.png' },
    { name: 'Persevering Sad', path: '/stickers/sad/persevering.png' },
    { name: 'Worried Sad', path: '/stickers/sad/worried.png' },
    { name: 'Fearful Sad', path: '/stickers/sad/fearful.png' },
    { name: 'Downcast Sad', path: '/stickers/sad/downcast.png' },
    { name: 'Confounded Sad', path: '/stickers/sad/confounded.png' },
    { name: 'Astonished Sad', path: '/stickers/sad/astonished.png' },
    
    // Shy / Embarrassed
    { name: 'Shy Blush', path: '/stickers/sad/flushed.png' },
    { name: 'Shy Peeking', path: '/stickers/sad/peeking_eye.png' },
    { name: 'Shy Grimacing', path: '/stickers/sad/grimacing.png' },
    { name: 'Shy Anxious', path: '/stickers/sad/anxious.png' },
    
    // Dull / Sleepy / Sick
    { name: 'Pensive Dull', path: '/stickers/sad/pensive.png' },
    { name: 'Confused Dull', path: '/stickers/sad/confused.png' },
    { name: 'Sleepy Dull', path: '/stickers/sad/sleepy.png' },
    { name: 'Melting Dull', path: '/stickers/sad/melting.png' },
    { name: 'Neutral Dull', path: '/stickers/sad/neutral.png' },
    { name: 'Expressionless Dull', path: '/stickers/sad/expressionless.png' },
    { name: 'Sleeping Dull', path: '/stickers/sad/sleeping.png' },
    { name: 'Yawning Dull', path: '/stickers/sad/yawning.png' },
    { name: 'Tired Dull', path: '/stickers/sad/tired.png' },
    { name: 'Drooling Dull', path: '/stickers/sad/drooling.png' },
    { name: 'Weary Dull', path: '/stickers/sad/weary.png' },
    { name: 'Sneezing Sick', path: '/stickers/sad/sneezing.png' },
    { name: 'Vomiting Sick', path: '/stickers/sad/vomiting.png' },
    { name: 'Mask Sick', path: '/stickers/sad/mask.png' }
  ],
  telugu: [
    // Pawan Kalyan
    { name: 'Pawan Kalyan Action', path: '/stickers/telugu/pk_1.gif' },
    { name: 'Pawan Kalyan Style', path: '/stickers/telugu/pk_2.gif' },
    { name: 'Pawan Kalyan Attitude', path: '/stickers/telugu/pk_3.gif' },
    
    // Mahesh Babu
    { name: 'Mahesh Babu Smile', path: '/stickers/telugu/mahesh_1.gif' },
    { name: 'Mahesh Babu Reaction', path: '/stickers/telugu/mahesh_2.gif' },
    { name: 'Mahesh Babu Classy', path: '/stickers/telugu/mahesh_3.gif' },
    
    // Prabhas
    { name: 'Prabhas Darling', path: '/stickers/telugu/prabhas_1.gif' },
    { name: 'Prabhas Handsome', path: '/stickers/telugu/prabhas_2.gif' },
    { name: 'Prabhas Action', path: '/stickers/telugu/prabhas_3.gif' },
    
    // Jr NTR
    { name: 'Jr NTR Pride', path: '/stickers/telugu/ntr_1.gif' },
    { name: 'Jr NTR Angry', path: '/stickers/telugu/ntr_2.gif' },
    { name: 'Jr NTR Dance', path: '/stickers/telugu/ntr_3.gif' },
    
    // Allu Arjun
    { name: 'Allu Arjun Swag', path: '/stickers/telugu/allu_arjun_1.gif' },
    { name: 'Allu Arjun Thumbs', path: '/stickers/telugu/allu_arjun_2.gif' },
    { name: 'Allu Arjun Style', path: '/stickers/telugu/allu_arjun_3.gif' },
    
    // Ram Charan
    { name: 'Ram Charan Style', path: '/stickers/telugu/ram_charan_1.gif' },
    { name: 'Ram Charan Smile', path: '/stickers/telugu/ram_charan_2.gif' },
    { name: 'Ram Charan Action', path: '/stickers/telugu/ram_charan_3.gif' },
    
    // Chiranjeevi
    { name: 'Chiranjeevi Grace', path: '/stickers/telugu/chiranjeevi_1.gif' },
    { name: 'Chiranjeevi Laugh', path: '/stickers/telugu/chiranjeevi_2.gif' },
    { name: 'Chiranjeevi Dance', path: '/stickers/telugu/chiranjeevi_3.gif' },
    
    // Balakrishna
    { name: 'Balayya Punch', path: '/stickers/telugu/balayya_1.gif' },
    { name: 'Balayya Smile', path: '/stickers/telugu/balayya_2.gif' },
    { name: 'Balayya Style', path: '/stickers/telugu/balayya_3.gif' },
    
    // Venkatesh
    { name: 'Venkatesh Funny', path: '/stickers/telugu/venky_1.gif' },
    { name: 'Venkatesh Smile', path: '/stickers/telugu/venky_2.gif' },
    { name: 'Venkatesh Laugh', path: '/stickers/telugu/venky_3.gif' },
    
    // Nani
    { name: 'Nani Natural', path: '/stickers/telugu/nani_1.gif' },
    { name: 'Nani Smile', path: '/stickers/telugu/nani_2.gif' },
    { name: 'Nani Reaction', path: '/stickers/telugu/nani_3.gif' },
    
    // Brahmanandam (12 stickers)
    { name: 'Brahmi Laughing', path: '/stickers/telugu/brahmi_1.gif' },
    { name: 'Brahmi Shocked', path: '/stickers/telugu/brahmi_2.gif' },
    { name: 'Brahmi Comedy', path: '/stickers/telugu/brahmi_3.gif' },
    { name: 'Brahmi Dance', path: '/stickers/telugu/brahmi_4.gif' },
    { name: 'Brahmi Attarintiki', path: '/stickers/telugu/brahmi_5.gif' },
    { name: 'Brahmi Sandeep', path: '/stickers/telugu/brahmi_6.gif' },
    { name: 'Brahmi Blush', path: '/stickers/telugu/brahmi_7.gif' },
    { name: 'Brahmi Star Tamil', path: '/stickers/telugu/brahmi_8.gif' },
    { name: 'Brahmi Venky', path: '/stickers/telugu/brahmi_9.gif' },
    { name: 'Brahmi Crown', path: '/stickers/telugu/brahmi_10.gif' },
    { name: 'Brahmi Serious', path: '/stickers/telugu/brahmi_11.gif' },
    { name: 'Brahmi Fun', path: '/stickers/telugu/brahmi_12.gif' },
    
    // Sunil (4 stickers)
    { name: 'Sunil Funny', path: '/stickers/telugu/sunil_1.gif' },
    { name: 'Sunil Expression', path: '/stickers/telugu/sunil_2.gif' },
    { name: 'Sunil Laugh', path: '/stickers/telugu/sunil_3.gif' },
    { name: 'Sunil Shock', path: '/stickers/telugu/sunil_4.gif' },
    
    // MS Narayana (4 stickers)
    { name: 'MS Narayana Drink', path: '/stickers/telugu/ms_1.gif' },
    { name: 'MS Narayana Romantic', path: '/stickers/telugu/ms_2.gif' },
    { name: 'MS Narayana Shock', path: '/stickers/telugu/ms_3.gif' },
    { name: 'MS Narayana Fun', path: '/stickers/telugu/ms_4.gif' },
    
    // Ali (4 stickers)
    { name: 'Ali Reaction', path: '/stickers/telugu/ali_1.gif' },
    { name: 'Ali Smile', path: '/stickers/telugu/ali_2.gif' },
    { name: 'Ali Comedy', path: '/stickers/telugu/ali_3.gif' },
    { name: 'Ali Laugh', path: '/stickers/telugu/ali_4.gif' },
    
    // Babu Mohan (4 stickers)
    { name: 'Telugu Trend 1', path: 'https://media.tenor.com/P2RKA-XwThMAAAAC/balakrishna-telugu-funny.gif' },
    { name: 'Telugu Trend 2', path: 'https://media.tenor.com/OzJypj6wgPAAAAAC/bhibatsam-tiger-harischandra-prasad.gif' },
    { name: 'Telugu Trend 3', path: 'https://media.tenor.com/zdOX0tFOmaYAAAAC/gopi-pelli.gif' },
    { name: 'Telugu Trend 4', path: 'https://media.tenor.com/OsaLkWY44xcAAAAC/tuss-raghubabu.gif' },
    { name: 'Telugu Trend 5', path: 'https://media.tenor.com/h90-EJSCUJIAAAAC/tired-upset.gif' },
    { name: 'Telugu Trend 6', path: 'https://media.tenor.com/OeXWuC-XFsMAAAAC/bhibatsam-chirutha.gif' },
    { name: 'Telugu Trend 7', path: 'https://media.tenor.com/b1GzkcMZM8oAAAAC/ali-comedy-telugu.gif' },
    { name: 'Telugu Trend 8', path: 'https://media.tenor.com/FjlpzdnUDNcAAAAC/cinema-bandi-telugu.gif' },
    { name: 'Telugu Trend 9', path: 'https://media.tenor.com/1VxAOS5xaEgAAAAC/brahmi-adhurs.gif' },
    { name: 'Telugu Trend 10', path: 'https://media.tenor.com/Rk4mrK_DkGcAAAAC/thokkathotakura-dharmavarapu.gif' },
    { name: 'Telugu Trend 11', path: 'https://media.tenor.com/uUzQ8-tnRM8AAAAC/bhibatsam-brahmanandam.gif' },
    { name: 'Telugu Trend 12', path: 'https://media.tenor.com/_xUqamZLWuEAAAAC/bhibatsam-krishna.gif' },
    { name: 'Telugu Trend 13', path: 'https://media.tenor.com/2JOXUZwgqWIAAAAC/chi-pora-telugu-memes.gif' },
    { name: 'Telugu Trend 14', path: 'https://media.tenor.com/XvFAY0IVPZ8AAAAC/bhibatsam-brahmanandam.gif' },
    { name: 'Telugu Trend 15', path: 'https://media.tenor.com/AAW-Okn78mMAAAAC/telugu-comedy-ali.gif' },
    { name: 'Telugu Trend 16', path: 'https://media.tenor.com/U-R01wCvDcgAAAAC/ha-ha-ha.gif' },
    { name: 'Telugu Trend 17', path: 'https://media.tenor.com/LLBYYrbdtWEAAAAC/telugu-comedy.gif' },
    { name: 'Telugu Trend 18', path: 'https://media.tenor.com/vHjuyXRbEl8AAAAC/thokkathotakura-thotakura.gif' },
    { name: 'Telugu Trend 19', path: 'https://media.tenor.com/cIFkGcCJwcoAAAAC/bhibatsam-khaleja.gif' },
    { name: 'Telugu Trend 20', path: 'https://media.tenor.com/m36Ua5y9UUIAAAAC/telugu-comedy.gif' },
    { name: 'Telugu Trend 21', path: 'https://media.tenor.com/OJKVWOuCUpMAAAAC/ali-comedy.gif' },
    { name: 'Telugu Trend 22', path: 'https://media.tenor.com/udVXcMm2kSoAAAAC/allu-arjun-telugu.gif' },
    { name: 'Telugu Trend 23', path: 'https://media.tenor.com/Bxm-B-FwhKIAAAAC/poi-podukoo.gif' },
    { name: 'Telugu Trend 24', path: 'https://media.tenor.com/n_DKREG4-wkAAAAC/flashman-flash-man.gif' },
    { name: 'Telugu Trend 25', path: 'https://media.tenor.com/v8eLAP3imFUAAAAC/thaggaledhu-pichi.gif' },
    { name: 'Telugu Trend 26', path: 'https://media.tenor.com/1W24otBaZF4AAAAC/sivaji-the-boss-sivaji.gif' },
    { name: 'Telugu Trend 27', path: 'https://media.tenor.com/m2RVUYF6FvkAAAAC/dharmavarapu-thokkathotakura.gif' },
    { name: 'Telugu Trend 28', path: 'https://media.tenor.com/7zzDG_WJhXwAAAAC/telugu-brahmi.gif' },
    { name: 'Telugu Trend 29', path: 'https://media.tenor.com/77rBdLATxGMAAAAC/telugu-comedy-actors-bigbosstelugu.gif' },
    { name: 'Telugu Trend 30', path: 'https://media.tenor.com/w6A-Kfg5VdcAAAAC/bandla-ganesh-telugu-memes.gif' },
    { name: 'Telugu Trend 31', path: 'https://media.tenor.com/9aw9_QvF0xgAAAAC/ready-telugu-thokkath0takura.gif' },
    { name: 'Telugu Trend 32', path: 'https://media.tenor.com/v9TQUmorZhwAAAAC/allu-arjun-telugu.gif' },
    { name: 'Telugu Trend 33', path: 'https://media.tenor.com/8cTIblAGRc4AAAAC/thokkathotakura-thokkath0takura.gif' },
    { name: 'Telugu Trend 34', path: 'https://media.tenor.com/vzC7WgnH1sIAAAAC/sunil-telugu-andharivadu-comedy-chala-worst-ga-janaala-talk.gif' },
    { name: 'Telugu Trend 35', path: 'https://media.tenor.com/1Ru9xCNhzLIAAAAC/bhibatsam-telugu-comedy.gif' },
    { name: 'Telugu Trend 36', path: 'https://media.tenor.com/1MwIAM8TaF8AAAAC/telugu-comedy.gif' },
    { name: 'Telugu Trend 37', path: 'https://media.tenor.com/L-oFo7zYWzUAAAAC/iamhemuk-xhk.gif' },
    { name: 'Telugu Trend 38', path: 'https://media.tenor.com/ip0CST6ca2oAAAAC/ashtachamma-thotakura.gif' },
    { name: 'Telugu Trend 39', path: 'https://media.tenor.com/AcMWEjMIXPIAAAAC/bhibatsam-pellam-oorelithe.gif' },
    { name: 'Telugu Trend 40', path: 'https://media.tenor.com/stwgJVcmA6QAAAAC/funny-memes-telugu-telugu-dialogues.gif' },
    { name: 'Telugu Trend 41', path: 'https://media.tenor.com/wXRz1Y_DTvIAAAAC/raviteja-bhibatsam.gif' },
    { name: 'Telugu Trend 42', path: 'https://media.tenor.com/X2E_gEWSGA0AAAAC/shivaji-meme-shivaji-telugu-meme.gif' },
    { name: 'Telugu Trend 43', path: 'https://media.tenor.com/LqGia8Y6rW4AAAAC/aggipettemacha-aggi.gif' },
    { name: 'Telugu Trend 44', path: 'https://media.tenor.com/RtXA2Dgc9EUAAAAC/keeda-cola-surender-evadu.gif' },
    { name: 'Telugu Trend 45', path: 'https://media.tenor.com/nYn9WAn9ZXQAAAAC/memes-memes-telugu.gif' },
    { name: 'Telugu Trend 46', path: 'https://media.tenor.com/iYnZEcr_QcQAAAAC/bhibatsam-dil-raju.gif' },
    { name: 'Telugu Trend 47', path: 'https://media.tenor.com/cnky6bVHpksAAAAC/pawan-kalyan.gif' },
    { name: 'Telugu Trend 48', path: 'https://media.tenor.com/qpXTOE1tGi4AAAAC/brahmi-telugu.gif' },
    { name: 'Telugu Trend 49', path: 'https://media.tenor.com/IqhRNSf7KFQAAAAC/they-call-him-og-pawan-kalyan.gif' },
    { name: 'Telugu Trend 50', path: 'https://media.tenor.com/4d9CFupTYB0AAAAC/telugu-singing-jambalakidi.gif' },
    { name: 'Telugu Trend 51', path: 'https://media.tenor.com/oGl6lSsKyn4AAAAC/priyanka-mohan-pam.gif' },
    { name: 'Telugu Trend 52', path: 'https://media.tenor.com/gX3r39mnx4sAAAAC/gang-leader-nani.gif' },
    { name: 'Telugu Trend 53', path: 'https://media.tenor.com/cEdujrXM1bUAAAAC/telugu-telugu-memes.gif' },
    { name: 'Telugu Trend 55', path: 'https://media.tenor.com/3bqbLrsDdA0AAAAC/suvvi-suvvi-they-call-him-og.gif' },
    { name: 'Telugu Trend 56', path: 'https://media.tenor.com/wMKgfdzbbHkAAAAC/manalni-evvadra-aapedi-manalni-evadra-aapedi.gif' },
    { name: 'Telugu Trend 57', path: 'https://media.tenor.com/WIokn0mZJGkAAAAC/vellu-vella-starbucks-veshalu-veelluvellastarbucksveshalu.gif' },
    { name: 'Telugu Trend 58', path: 'https://media.tenor.com/65fnvKhREn4AAAAC/roshan-kanakala-thank-you.gif' },
    { name: 'Telugu Trend 60', path: 'https://media.tenor.com/6J6A1ci1FFsAAAAC/jr-ntr-temper-jr-ntr.gif' },
    { name: 'Telugu Trend 61', path: 'https://media.tenor.com/ypypFUDNL5kAAAAC/samajavaragamana-telugu.gif' },
    { name: 'Telugu Trend 62', path: 'https://media.tenor.com/r5AwLZ2cTcUAAAAC/tamil-shy-telugu-shy.gif' },
    { name: 'Telugu Trend 63', path: 'https://media.tenor.com/iB6ZXR9UaRsAAAAC/priyanka-mohan-kiss.gif' },
    { name: 'Telugu Trend 64', path: 'https://media.tenor.com/AerjEydLWhMAAAAC/hyderabad-revanth.gif' },
    { name: 'Telugu Trend 65', path: 'https://media.tenor.com/knJctIvDpJEAAAAC/telugu-dialogues-telugu-stories.gif' },
    { name: 'Telugu Trend 67', path: 'https://media.tenor.com/QE26UxS0ilMAAAAC/rvr-sonu-sood.gif' },
    { name: 'Telugu Trend 69', path: 'https://media.tenor.com/9WnatesXUHkAAAAC/iamhemuk-xhk.gif' },
    { name: 'Telugu Trend 71', path: 'https://media.tenor.com/e4P7_QlfjFYAAAAC/chikitu-chikitu-coolie.gif' },
    { name: 'Telugu Trend 72', path: 'https://media.tenor.com/E9Z3D4zaDC4AAAAC/movie-tamil.gif' },
    { name: 'Telugu Trend 73', path: 'https://media.tenor.com/YK_I2yWb8psAAAAC/etluntadhi-djtillu.gif' },
    { name: 'Telugu Trend 74', path: 'https://media.tenor.com/TvE7lsD4t7kAAAAC/gang-leader-nani.gif' },
    { name: 'Telugu Trend 76', path: 'https://media.tenor.com/4i6VdsQ3Zf0AAAAC/samajavaragamana-telugu.gif' },
    { name: 'Telugu Trend 77', path: 'https://media.tenor.com/d742UoUlpjYAAAAC/prakashraj-comedy.gif' },
    { name: 'Telugu Trend 78', path: 'https://media.tenor.com/r3spZLB50E4AAAAC/kcr-ktr.gif' },
    { name: 'Telugu Trend 79', path: 'https://media.tenor.com/hdY0Xngtzm8AAAAC/nani-heroes.gif' },
    { name: 'Telugu Trend 80', path: 'https://media.tenor.com/AQ8TL4LSOsoAAAAC/priyanka-mohan-kiss.gif' },
    { name: 'Telugu Trend 81', path: 'https://media.tenor.com/I_Op1ML3Ch4AAAAC/itta-ambothulaa.gif' },
    { name: 'Telugu Trend 82', path: 'https://media.tenor.com/PkMFZuTfci8AAAAC/antya-hello-guru-prema-kosame.gif' },
    { name: 'Telugu Trend 83', path: 'https://media.tenor.com/1iRvDRqAolQAAAAC/gang-leader-nani.gif' },
    { name: 'Telugu Trend 84', path: 'https://media.tenor.com/zgAT1vgW9S4AAAAC/bbc-telugu-dialogues.gif' },
    { name: 'Telugu Trend 85', path: 'https://media.tenor.com/I6UlTm25n14AAAAC/telugu-stickers-telugu-memes.gif' },
    { name: 'Telugu Trend 86', path: 'https://media.tenor.com/z4e4Vr3YQBcAAAAC/tarak-heroes.gif' },
    { name: 'Telugu Trend 87', path: 'https://media.tenor.com/-FrwFe3HaiwAAAAC/sohail-telugu.gif' },
    { name: 'Telugu Trend 88', path: 'https://media.tenor.com/IB3p7QknE6AAAAAC/paw-paw-pawpaw.gif' },
    { name: 'Telugu Trend 89', path: 'https://media.tenor.com/pPIjLZGvIRkAAAAC/dulquer-malayalam.gif' },
    { name: 'Telugu Trend 90', path: 'https://media.tenor.com/rOdi0WxjCm0AAAAC/kovai-sarala-actress.gif' },
    { name: 'Telugu Trend 91', path: 'https://media.tenor.com/WL0iplMkgb8AAAAC/guntur-kaaram-kurchi.gif' },
    { name: 'Telugu Trend 92', path: 'https://media.tenor.com/pbELsUrkXl8AAAAC/telugu-brahmi.gif' },
    { name: 'Telugu Trend 94', path: 'https://media.tenor.com/wFa0JCc01-4AAAAC/gang-leader-nani.gif' },
    { name: 'Telugu Trend 95', path: 'https://media.tenor.com/GW-pW_R9VOQAAAAC/dhanush-heroes.gif' },
    { name: 'Telugu Trend 96', path: 'https://media.tenor.com/CWTkwtxA2lMAAAAC/shruti-heroines.gif' },
    { name: 'Telugu Trend 97', path: 'https://media.tenor.com/3uuFIBhvOa8AAAAC/telugu-brahmi.gif' },
    { name: 'Telugu Trend 98', path: 'https://media.tenor.com/5UAXh3jiAvQAAAAC/ayyo-gif.gif' },
    { name: 'Telugu Trend 99', path: 'https://media.tenor.com/Ux-U4coh6AoAAAAC/namaste-hi.gif' },
    { name: 'Telugu Trend 100', path: 'https://media.tenor.com/HA20kfn6taMAAAAC/priyanka-mohan-pam.gif' },

    { name: 'Babu Mohan Face', path: '/stickers/telugu/babu_1.gif' },
    { name: 'Babu Mohan Expression', path: '/stickers/telugu/babu_2.gif' },
    { name: 'Babu Mohan Comedy', path: '/stickers/telugu/babu_3.gif' },
    { name: 'Babu Mohan Laugh', path: '/stickers/telugu/babu_4.gif' },
  ]
};

const StickerPicker = ({ onStickerSelect }) => {
  const [activeTab, setActiveTab] = useState('telugu'); // Default to Telugu as requested
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'telugu', label: 'Telugu 🎬', color: 'border-blue-500 text-blue-600' },
    { id: 'cute', label: 'Cute 🐼', color: 'border-emerald-500 text-emerald-600' },
    { id: 'love', label: 'Love 💖', color: 'border-pink-500 text-pink-600' },
    { id: 'funny', label: 'Funny 😂', color: 'border-amber-500 text-amber-600' },
    { id: 'sad', label: 'Sad/Shy 😢', color: 'border-purple-500 text-purple-600' },
  ];

  // Get displayed stickers based on active category or search query
  const getDisplayedStickers = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return STICKERS[activeTab] || [];
    }

    // Search across all categories if query is provided
    let results = [];
    Object.keys(STICKERS).forEach(cat => {
      const filtered = STICKERS[cat].filter(st => 
        st.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
      );
      results = [...results, ...filtered];
    });
    return results;
  };

  const displayedStickers = getDisplayedStickers();

  return (
    <div className="absolute bottom-full mb-3 w-80 h-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl z-50 flex flex-col p-3 border border-slate-100/90 transition-all duration-300">
      {/* Search Input */}
      <div className="relative mb-2">
        <input 
          type="text" 
          placeholder="Search stickers..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-400 focus:bg-white p-2.5 rounded-xl text-slate-800 focus:outline-none placeholder-slate-400 text-xs transition duration-200"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold bg-transparent border-none cursor-pointer"
          >
            ×
          </button>
        )}
      </div>

      {/* Categories Tabs */}
      {!searchQuery && (
        <div className="flex gap-1 border-b border-slate-100 pb-2 mb-2 justify-between">
          {categories.map(cat => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`text-[11px] font-bold px-2 py-1.5 rounded-lg border-0 cursor-pointer transition-all duration-300 relative flex items-center gap-1 ${
                  isActive 
                    ? 'bg-slate-100 text-indigo-600 font-extrabold shadow-sm' 
                    : 'bg-transparent text-slate-500 hover:bg-slate-50'
                }`}
              >
                {cat.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto pr-1">
        {displayedStickers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-10">
            <span className="text-xl mb-1">🐼</span>
            <span>No stickers found</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <AnimatePresence>
              {displayedStickers.map((sticker, idx) => (
                <motion.div
                  key={sticker.path}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                  onClick={() => onStickerSelect(sticker.path)}
                  className="w-full aspect-square bg-slate-50/70 border border-slate-100/50 rounded-xl flex items-center justify-center cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-100 hover:scale-105 hover:-translate-y-0.5 active:scale-95 shadow-sm hover:shadow-md transition-all duration-200 p-1 select-none"
                  title={sticker.name}
                >
                  <img 
                    src={sticker.path} 
                    alt={sticker.name}
                    className="w-full h-full object-contain max-h-16"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default StickerPicker;
