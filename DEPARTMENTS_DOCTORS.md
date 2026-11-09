# Bo‘limlar va shifokorlar moduli

- Hudud hisobi orqali `/departments.html` sahifasida o‘z hududidagi DPM, TTB, SHTB, OP/OSHP va boshqa faol muassasalar uchun bo‘lim nomlarini qo‘shish mumkin.
- Har bir bo‘limga shifokor F.I.Sh. va mutaxassisligi kiritiladi. Takroriy yozuv cheklanadi.
- Tizim tuman loginining boshqa hududdagi bo‘lim va shifokorlarga yozishini server darajasida taqiqlaydi.
- QR baholashda muassasa tanlanganda, uning bo‘limlari va shu bo‘limdagi shifokorlar ro‘yxati ochiladi. Hali ro‘yxat yaratilmagan muassasalarda avvalgi erkin kiritish saqlanadi.
- Feedback yuborilganda tanlangan shifokorning aynan shu muassasaga tegishliligi serverda tekshiriladi.
- `0003_departments_doctors.sql` migratsiyasi mavjud feedback yozuvlarini o‘chirmasdan jadvallarni qo‘shadi.

**Muhim:** Hozirgi tizimda tuman/shahar loginlari mavjud. Muassasaning o‘z alohida loginini yaratish va har bir DPM/TTB/SHTB uchun bir muassasa doirasida cheklash keyingi alohida ruxsatlar bosqichini talab qiladi. Ma’lumotlar bazasi migratsiyasini productionga qo‘llashdan oldin zaxira nusxa oling.
