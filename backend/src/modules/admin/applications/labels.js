const GRADE_LABELS = {
  hazirlik: 'Hazırlık', yl: 'Yüksek Lisans', dr: 'Doktora',
  ...Object.fromEntries(['1', '2', '3', '4', '5', '6', '9', '10', '11', '12'].map((g) => [g, `${g}. Sınıf`])),
};
module.exports = { GRADE_LABELS };
