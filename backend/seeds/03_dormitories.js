const DORMITORIES = [
  'Ankara Erkek Öğrenci Yurdu',
  'Aydın Erkek Öğrenci Yurdu',
  'Aydın Kız Öğrenci Yurdu',
  'Bağcılar Erkek Öğrenci Yurdu',
  'Beşiktaş Kız Öğrenci Yurdu',
  'Bolu Erkek Öğrenci Yurdu',
  'Cevizlibağ Kız Öğrenci Yurdu',
  'Çengelköy Kız Öğrenci Yurdu',
  'Eyüpsultan Erkek Öğrenci Yurdu',
  'İzmir Erkek Öğrenci Yurdu',
  'Kayseri Kız Öğrenci Yurdu',
  'Konya Erkek Öğrenci Yurdu',
  'Küçükçekmece Kız Öğrenci Yurdu',
  'Şanlıurfa Kız Öğrenci Yurdu',
  'Yalova Kız Öğrenci Yurdu',
  'Zonguldak Erkek Öğrenci Yurdu',
  'Haki Aras Kız Öğrenci Yurdu',
];

// Lise (ortaöğretim) yurtları: Yurt Konaklama Bursu'nda lise eğitim bilgileri istenir
const LISE = ['Beşiktaş Kız Öğrenci Yurdu', 'Cevizlibağ Kız Öğrenci Yurdu', 'Haki Aras Kız Öğrenci Yurdu'];

// Lise yurdunun bağlı olduğu lise (MEB kurum kodu): öğrencinin okulu otomatik bu olur.
// Burada olmayan lise yurdunda öğrenci okulunu kendisi seçer.
const SCHOOLS = {
  'Beşiktaş Kız Öğrenci Yurdu': 760904, // Beşiktaş Kız Anadolu İmam Hatip Lisesi
  'Cevizlibağ Kız Öğrenci Yurdu': 762761, // İstanbul Kız Anadolu İmam Hatip Lisesi (Cevizlibağ)
  'Haki Aras Kız Öğrenci Yurdu': 762182, // Şehit Haki Aras Kız Anadolu İmam Hatip Lisesi
};

exports.seed = async (knex) => {
  await knex('dormitories')
    .insert(DORMITORIES.map((name, i) => ({ name, sort: i + 1, level: LISE.includes(name) ? 'lise' : 'universite' })))
    .onConflict('name').merge(['level']);

  for (const [name, mebCode] of Object.entries(SCHOOLS)) {
    const school = await knex('schools').where({ meb_code: mebCode }).first('id');
    if (!school) throw new Error(`${name}: ${mebCode} MEB kodlu okul bulunamadı`);
    await knex('dormitories').where({ name }).update({ school_id: school.id });
  }
};
