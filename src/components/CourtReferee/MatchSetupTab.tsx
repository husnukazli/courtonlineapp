import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Clock, MapPin, Award, CheckCircle2, ChevronRight } from 'lucide-react';
import { useTennisData } from '../../context/TennisDataContext';
import { MatchItem, ScoreFormatType } from '../../types/tennis';
import { CoinTossModal } from '../Common/CoinTossModal';

const SCORE_FORMATS: ScoreFormatType[] = [
  '3 Normal Set',
  '3 Kısa Set',
  '2 Normal Set, 3. Set 10 Puanlık Maç Tie-Break',
  '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  '2 Kısa Set, 3. Set 7 Puanlık Maç Tie-Break',
];

interface MatchSetupTabProps {
  onStartScoring: () => void;
}

export const MatchSetupTab: React.FC<MatchSetupTabProps> = ({ onStartScoring }) => {
  const {
    matches,
    activeMatchId,
    setActiveMatchId,
    saveMatchSetup,
    currentReferee,
  } = useTennisData();

  // Get distinct courts
  const courts = Array.from(new Set(matches.map((m) => m.Kort))).sort();

  const [selectedCourt, setSelectedCourt] = useState<string>(() => {
    const current = matches.find((m) => m.id === activeMatchId);
    return current ? current.Kort : courts[0] || 'KORT 1';
  });

  const courtMatches = matches.filter((m) => m.Kort === selectedCourt);

  const [selectedMatchId, setSelectedMatchId] = useState<string>(() => {
    if (activeMatchId && matches.some((m) => m.id === activeMatchId && m.Kort === selectedCourt)) {
      return activeMatchId;
    }
    return courtMatches[0]?.id || '';
  });

  const activeMatch = matches.find((m) => m.id === selectedMatchId) || courtMatches[0];

  // Form State
  const [durum, setDurum] = useState<MatchItem['Durum']>('Oynaniyor');
  const [kuraKazanan, setKuraKazanan] = useState<string>('Secilmedi');
  const [kuraTercih, setKuraTercih] = useState<string>('Servis');
  const [sahaTarafi, setSahaTarafi] = useState<string>('Sandalyenin Sağı');
  const [baslangicSaati, setBaslangicSaati] = useState<string>('');
  const [bitisSaati, setBitisSaati] = useState<string>('');
  const [skorFormati, setSkorFormati] = useState<string>('3 Normal Set');
  const [isCoinTossOpen, setIsCoinTossOpen] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Sync form when match changes
  useEffect(() => {
    if (activeMatch) {
      setDurum(activeMatch.Durum === 'Baslamadi' ? 'Oynaniyor' : activeMatch.Durum);
      setKuraKazanan(activeMatch.Kura_Kazanan || 'Secilmedi');
      setKuraTercih(activeMatch.Kura_Tercih || 'Servis');
      setSahaTarafi(activeMatch.Saha_Tarafi || 'Sandalyenin Sağı');
      setSkorFormati(activeMatch.Skor_Formati || '3 Normal Set');

      if (activeMatch.Baslangic_Saati && activeMatch.Baslangic_Saati !== 'Secilmedi') {
        setBaslangicSaati(activeMatch.Baslangic_Saati);
      } else {
        const now = new Date();
        const roundedMins = Math.floor(now.getMinutes() / 5) * 5;
        setBaslangicSaati(
          `${String(now.getHours()).padStart(2, '0')}:${String(roundedMins).padStart(2, '0')}`
        );
      }
      setBitisSaati(activeMatch.Bitis_Saati || '');
    }
  }, [activeMatch?.id]);

  const handleCourtChange = (court: string) => {
    setSelectedCourt(court);
    const mInCourt = matches.filter((m) => m.Kort === court);
    const firstNotStarted = mInCourt.find((m) => m.Durum === 'Baslamadi') || mInCourt[0];
    if (firstNotStarted) {
      setSelectedMatchId(firstNotStarted.id);
      setActiveMatchId(firstNotStarted.id);
    }
  };

  const handleSaveSetup = () => {
    if (!activeMatch) return;

    saveMatchSetup(activeMatch.id, {
      durum,
      kuraKazanan,
      kuraTercih,
      sahaTarafi,
      baslangicSaati,
      bitisSaati,
      skorFormati,
      ilkServisOyuncusu:
        kuraKazanan === activeMatch['Oyuncu 1']
          ? kuraTercih === 'Servis'
            ? 1
            : 2
          : kuraKazanan === activeMatch['Oyuncu 2']
          ? kuraTercih === 'Servis'
            ? 2
            : 1
          : 1,
    });

    setActiveMatchId(activeMatch.id);
    setSuccessMsg('✅ Maç Kurulumu Kaydedildi!');

    setTimeout(() => {
      setSuccessMsg('');
      onStartScoring();
    }, 600);
  };

  const handleTossConfirm = (winner: string, choice: string, side: string) => {
    setKuraKazanan(winner);
    setKuraTercih(choice);
    setSahaTarafi(side);
  };

  if (!activeMatch) {
    return (
      <div className="p-8 text-center text-slate-400">
        Seçilen kortta maç bulunmuyor.
      </div>
    );
  }

  const p1Name = activeMatch['Oyuncu 1'];
  const p2Name = activeMatch['Oyuncu 2'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Court & Match Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            1. Görevli Kort Seçimi
          </label>
          <div className="flex flex-wrap gap-2">
            {courts.map((court) => (
              <button
                key={court}
                type="button"
                onClick={() => handleCourtChange(court)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  selectedCourt === court
                    ? 'border-lime-400 bg-lime-400/20 text-lime-300 shadow-md shadow-lime-400/10'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {court}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            2. Bu Korttaki Maçlar ({courtMatches.length} Maç)
          </label>
          
          {/* Visual Mini Grid for Kort Matches */}
          <div className="grid grid-cols-1 gap-2 mb-3">
            {courtMatches.map((m) => {
              const isSelected = m.id === selectedMatchId;
              const isLive = m.Durum === 'Oynaniyor';
              const isUpcoming = m.Durum === 'Baslamadi';
              const isFinished = ['Bitti', 'Retired', 'Walkover'].includes(m.Durum);

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedMatchId(m.id);
                    setActiveMatchId(m.id);
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-lime-400 ring-2 ring-lime-400/30'
                      : isLive
                      ? 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/30'
                      : isUpcoming
                      ? 'bg-amber-950/15 border-amber-500/30 hover:bg-amber-950/25'
                      : 'bg-slate-950 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-400 shrink-0 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                      {m.Saat || '10:00'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-black text-sm text-white truncate">
                        {m['Oyuncu 1']} <span className="text-slate-500 font-normal">vs</span> {m['Oyuncu 2']}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{m.Kategori}</span>
                        {m.Skor && <span className="font-mono font-bold text-lime-400">({m.Skor})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isLive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Oynanıyor
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Başlamadı
                      </span>
                    )}
                    {isFinished && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Bitti
                      </span>
                    )}
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center text-xs font-black">
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Match Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        {/* Match Header */}
        <div className="text-center pb-4 border-b border-slate-800 space-y-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {activeMatch.Kort} • {activeMatch.Saat} • {activeMatch.Kategori}
          </div>
          <div className="text-lg sm:text-2xl font-black text-white flex items-center justify-center gap-3">
            <span className="text-emerald-400">{p1Name}</span>
            <span className="text-slate-500 text-sm font-normal">vs</span>
            <span className="text-cyan-400">{p2Name}</span>
          </div>
        </div>

        {/* Kura (Coin Toss) Section */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🪙</span>
              <div>
                <h4 className="font-bold text-sm text-white">Kura Atışı (Coin Toss)</h4>
                <p className="text-xs text-slate-400">Kule veya filede yapılan kura sonucu</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCoinTossOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow transition active:scale-95"
            >
              <span>Canlı Kura Aç</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Kura Kazanan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Kura Kazananı
              </label>
              <select
                value={kuraKazanan}
                onChange={(e) => setKuraKazanan(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium focus:border-lime-400"
              >
                <option value="Secilmedi">Seçilmedi</option>
                <option value={p1Name}>{p1Name} (O1)</option>
                <option value={p2Name}>{p2Name} (O2)</option>
              </select>
            </div>

            {/* Kura Tercihi */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Kura Tercihi
              </label>
              <select
                value={kuraTercih}
                onChange={(e) => setKuraTercih(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium focus:border-lime-400"
              >
                <option value="Servis">Servis</option>
                <option value="Karşılama">Karşılama</option>
                <option value="Kort Seçimi">Kort Seçimi</option>
                <option value="Secilmedi">Seçilmedi</option>
              </select>
            </div>

            {/* Saha Tarafi */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Saha Tarafı
              </label>
              <select
                value={sahaTarafi}
                onChange={(e) => setSahaTarafi(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium focus:border-lime-400"
              >
                <option value="Sandalyenin Sağı">Sandalyenin Sağı</option>
                <option value="Sandalyenin Solu">Sandalyenin Solu</option>
                <option value="Secilmedi">Seçilmedi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Format & Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Maç Formatı
            </label>
            <select
              value={skorFormati}
              onChange={(e) => setSkorFormati(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-lime-300 font-bold focus:border-lime-400"
            >
              {SCORE_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Maç Durumu
            </label>
            <select
              value={durum}
              onChange={(e) => setDurum(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:border-lime-400"
            >
              <option value="Baslamadi">Başlamadı</option>
              <option value="Oynaniyor">Oynanıyor (Devam)</option>
              <option value="Bitti">Bitti</option>
              <option value="Retired">Retired (Çekildi)</option>
              <option value="Walkover">Walkover (Hükmen)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Başlama Saati
            </label>
            <input
              type="text"
              value={baslangicSaati}
              onChange={(e) => setBaslangicSaati(e.target.value)}
              placeholder="09:30"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:border-lime-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Bitiş Saati (Opsiyonel)
            </label>
            <input
              type="text"
              value={bitisSaati}
              onChange={(e) => setBitisSaati(e.target.value)}
              placeholder="10:45"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:border-lime-400"
            />
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold text-center">
            {successMsg}
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleSaveSetup}
          className="w-full py-4 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black rounded-2xl shadow-xl shadow-lime-400/20 text-sm sm:text-base transition flex items-center justify-center gap-2 active:scale-98"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>Kurulumu Kaydet ve Skor Tablosuna Geç</span>
        </button>
      </div>

      {/* Coin Toss Modal */}
      <CoinTossModal
        isOpen={isCoinTossOpen}
        onClose={() => setIsCoinTossOpen(false)}
        p1Name={p1Name}
        p2Name={p2Name}
        onConfirm={handleTossConfirm}
      />
    </div>
  );
};
