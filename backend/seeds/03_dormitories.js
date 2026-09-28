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
];

exports.seed = async (knex) => {
  await knex('dormitories')
    .insert(DORMITORIES.map((name, i) => ({ name, sort: i + 1 })))
    .onConflict('name').ignore();
};
