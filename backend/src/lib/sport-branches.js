/** Spor lisesi başvurusunda seçilen branşlar (Adım 4). Listeyi değiştirmek için migration 014'e bakın. */
const SPORT_BRANCHES = [
  'Atıcılık', 'Atletizm', 'Badminton', 'Basketbol', 'Beyzbol ve Softbol', 'Bilardo', 'Bilek Güreşi', 'Binicilik',
  'Bisiklet', 'Bocce', 'Boks', 'Buz Hokeyi', 'Buz Pateni', 'Cirit', 'Curling', 'Dağcılık', 'Dans Sporları', 'Eskrim',
  'Futbol', 'Futsal', 'Golf', 'Güreş', 'Halter', 'Hentbol', 'Hokey', 'Jimnastik', 'Judo', 'Kano', 'Karate', 'Kayak',
  'Kick Boks', 'Kürek', 'Masa Tenisi', 'Modern Pentatlon', 'Muay Thai', 'Okçuluk', 'Oryantiring', 'Paten',
  'Plaj Voleybolu', 'Ragbi', 'Satranç', 'Spor Tırmanışı', 'Squash', 'Su Topu', 'Sualtı Sporları', 'Taekwondo',
  'Tenis', 'Triatlon', 'Voleybol', 'Vücut Geliştirme ve Fitness', 'Wushu', 'Yelken', 'Yüzme', 'Diğer',
];

const sportBranchField = {
  key: 'sport_branch', type: 'select', label: 'Lisanslı Spor Branşı', required: true, searchable: true, options: SPORT_BRANCHES,
};

module.exports = { SPORT_BRANCHES, sportBranchField };
