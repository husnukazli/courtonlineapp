// Hayalet maçların tamamı temizlendi. Sistem artık eski verileri zorla getirmeyecek.
export const INITIAL_MATCHES: any[] = [];

// Varsayılan hakemler
export const INITIAL_REFEREES = [
  { name: 'CANAN ÇAPLIK', pin: '1212' },
  { name: 'FURKAN GÖK', pin: '1313' },
  { name: 'DERİN GÜLER', pin: '1414' },
];

// Varsayılan format hafızası
export const INITIAL_CATEGORY_FORMAT_MEMORY: Record<string, string> = {
  'Kadın 8 Yaş T': '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  'Erkek 9 Yaş T': '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  'Kadın 9 Yaş T': '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  'Erkek 10 Yaş T': '3 Kısa Set',
  'Kadın 10 Yaş T': '3 Kısa Set',
  '12 Yaş Erkek': '3 Normal Set',
  '12 Yaş Kadın': '3 Normal Set',
  '14 Yaş': '3 Normal Set',
  'Büyükler': '3 Normal Set',
};
