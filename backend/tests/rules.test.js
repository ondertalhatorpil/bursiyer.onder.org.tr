/**
 * Kural motoru, seed ile yüklenen gerçek tanımlarla test edilir (şartname Bölüm 3 ve 4).
 */
const db = require('../src/db/knex');
const { resolveDocuments, validateExtraFields, parseJson } = require('../src/lib/rules');

let documentTypes;
let channels;

beforeAll(async () => {
  documentTypes = await db('document_types').select();
  channels = Object.fromEntries((await db('channels').select()).map((c) => [c.code, c]));
});
afterAll(() => db.destroy());

const codes = (ctx) => Object.fromEntries(resolveDocuments(documentTypes, ctx).map((d) => [d.code, d.required]));

describe('belge matrisi', () => {
  test('lise, 16 yaş, 10. sınıf: öğrenci belgesi + transkript', () => {
    expect(codes({ category: 'lise', idType: 'TC', grade: '10', age: 16 }))
      .toEqual({ ogrenci_belgesi: true, transkript: true });
  });

  test('lise hazırlık: transkript yine zorunlu', () => {
    expect(codes({ category: 'lise', idType: 'TC', grade: 'hazirlik', age: 14 }).transkript).toBe(true);
  });

  test('üniversite 1. sınıf, 19 yaş: transkript yok, YKS + adli sicil var', () => {
    expect(codes({ category: 'universite', idType: 'TC', grade: '1', age: 19 }))
      .toEqual({ ogrenci_belgesi: true, yks_yerlestirme: true, adli_sicil: true });
  });

  test('üniversite 1. sınıf, 17 yaş: adli sicil istenmez', () => {
    expect(codes({ category: 'universite', idType: 'TC', grade: '1', age: 17 }).adli_sicil).toBeUndefined();
  });

  test('üniversite 3. sınıf: transkript var, YKS yok', () => {
    const c = codes({ category: 'universite', idType: 'TC', grade: '3', age: 21 });
    expect(c.transkript).toBe(true);
    expect(c.yks_yerlestirme).toBeUndefined();
  });

  test('yüksek lisans, T.C.', () => {
    expect(codes({ category: 'yuksek_lisans', idType: 'TC', grade: 'yl', age: 25 })).toEqual({
      ogrenci_belgesi: true, transkript: true, adli_sicil: true, kimlik_fotokopisi: true,
      vesikalik: true, ales: true, yabanci_dil: false, hizmet_dokumu: true, gelir_ek_belge: false,
    });
  });

  test('doktora, YKN (uluslararası)', () => {
    expect(codes({ category: 'doktora', idType: 'YKN', grade: 'dr', age: 30 })).toEqual({
      ogrenci_belgesi: true, transkript: true, adli_sicil: true, pasaport_ikamet: true,
      vesikalik: true, ales_gre_gmat: false, yabanci_dil: false, gelir_ek_belge: false,
    });
  });
});

describe('kanal ek alanları', () => {
  const fields = (code) => parseJson(channels[code].extra_fields);

  test('Teşkilat / İstanbul: ilçe + referans zorunlu, il alanı atılır', () => {
    const r = validateExtraFields(fields('lise_teskilat'), {
      region: 'istanbul', district_id: '412', city_id: 6, reference_name: '  Ahmet   Yılmaz ',
    });
    expect(r.errors).toEqual({});
    expect(r.data).toEqual({ region: 'istanbul', district_id: 412, reference_name: 'Ahmet Yılmaz' });
    expect(r.refs).toEqual([{ key: 'district_id', type: 'district', id: 412, cityId: 34 }]);
  });

  test('Teşkilat / Anadolu: il zorunlu, İstanbul hariç kısıtı ref ile gelir', () => {
    const r = validateExtraFields(fields('lise_teskilat'), { region: 'anadolu', reference_name: 'X' });
    expect(r.errors).toEqual({ city_id: 'İl zorunludur' });
  });

  test('Teşkilat: bölge seçilmezse', () => {
    const r = validateExtraFields(fields('lise_teskilat'), { reference_name: 'X' });
    expect(r.errors.region).toBeDefined();
  });

  test('Spor lisesi: okul spor filtresiyle ref üretir', () => {
    const r = validateExtraFields(fields('lise_spor'), { school_id: 10, sport_branch: 'Güreş' });
    expect(r.refs).toEqual([{ key: 'school_id', type: 'school', id: 10, filter: { is_sports: true } }]);
  });

  test('Spor lisesi: branş listeden seçilir', () => {
    const def = fields('lise_spor').find((f) => f.key === 'sport_branch');
    expect(def).toMatchObject({ type: 'select', searchable: true });
    expect(def.options.length).toBeGreaterThanOrEqual(50);
    expect(def.options).toEqual(expect.arrayContaining(['Futbol', 'Bocce', 'Voleybol', 'Satranç', 'Diğer']));
    const r = validateExtraFields(fields('lise_spor'), { school_id: 10, sport_branch: 'Quidditch' });
    expect(r.errors.sport_branch).toMatch(/geçersiz/);
  });

  test('geçersiz seçim ve uzun metin', () => {
    const r = validateExtraFields(fields('lise_teskilat'), {
      region: 'ankara', reference_name: 'x'.repeat(200),
    });
    expect(r.errors.region).toMatch(/geçersiz/);
    expect(r.errors.reference_name).toMatch(/en fazla/);
  });

  test('ek alanı olmayan kanal (WONDER)', () => {
    expect(validateExtraFields(fields('uni_wonder') || [], { x: 1 })).toEqual({ data: {}, errors: {}, refs: [] });
  });
});
