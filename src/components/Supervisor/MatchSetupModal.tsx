import React, { useState, useEffect } from 'react';
import { MatchItem, ScoreFormatType } from '../../types/tennis';
import { useTennisData } from '../../context/TennisDataContext';
import { Play, Clock, X, CheckCircle2, Trophy, Award, Save, ArrowLeftRight, Users, User, Disc } from 'lucide-react';

const SCORE_FORMAT_OPTIONS: ScoreFormatType[] = [
  '3 Normal Set',
  '3 Kısa Set',
  '2 Normal Set, 3. Set 10 Puanlık Maç Tie-Break',
  '2 Kısa Set, 3. Set 10 Puanlık Maç Tie-Break',
  '2 Kısa Set, 3. Set 7 Puanlık Maç Tie-Break',
];

interface MatchSetupModalProps {
  match: MatchItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (matchId: string) => void;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  match,
  isOpen,
  onClose,
  onStartMatch,
}) => {
  const { saveMatchSetup, categoryFormats, categoryNoAdSettings, matches, tournamentInfo } = useTennisData();

  const [kuraKazanan, setKuraKazanan] = useState<string>('Secilmedi');
  const [kuraTercih, setKuraTercih] = useState<string>('Servis');
  const [sahaTarafi, setSahaTarafi] = useState<string>('Sandalyenin Sağı');

  const [firstServingTeam, setFirstServingTeam] = useState<1 | 2>(1);
  const [leftTeam, setLeftTeam] = useState<1 | 2>(1);

  // Çiftler için oyuncu indeksleri
  const [t1ServerIdx, setT1ServerIdx] = useState<0 | 1>(0);
  const [t2ServerIdx, setT2ServerIdx] = useState<0 | 1>(0);
  const [t1RecIdx, setT1RecIdx] = useState<0 | 1>(0);
  const [t2RecIdx, setT2RecIdx] = useState<0 | 1>(0);

  const [tbType, setTbType] = useState<'standard' | 'coman'>('standard');
  const [baslangicSaati, setBaslangicSaati] = useState<string>('');
  const [bitisSaati, setBitisSaati] = useState<string>('');
  const [skorFormati, setSkorFormati] = useState<string>('3 Normal Set');
  const [isNoAd, setIsNoAd] = useState<boolean>(false); 
  const [secilenKort, setSecilenKort] = useState<string>('');

  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [hasTossed, setHasTossed] = useState<boolean>(false);

  const distinctKortlar = Array.from(new Set(matches.map((m: any) => m.Kort).filter(Boolean))).sort() as string[];

  const p1Name = match ? match['Oyuncu 1'] : '';
  const p2Name = match ? match['Oyuncu 2'] : '';
  const isDoubles = (p1Name.includes('/') || p2Name.includes('/'));
  const t1Players = p1Name ? p1Name.split('/').map(s => s.trim()).filter(Boolean) : [];
  const t2Players = p2Name ? p2Name.split('/').map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    if (match) {
      const savedKazanan = match.Kura_Kazanan || 'Secilmedi';
      const savedTercih = match.Kura_Tercih || 'Servis';
      const savedSaha = match.Saha_Tarafi || 'Sandalyenin Sağı';

      setKuraKazanan(savedKazanan);
      setKuraTercih(savedTercih);
      setSahaTarafi(savedSaha);

      const headUmpireFormat = categoryFormats[match.Kategori];
      setSkorFormati(headUmpireFormat || match.Skor_Formati || '3 Normal Set');

      const headUmpireNoAd = categoryNoAdSettings ? categoryNoAdSettings[match.Kategori] : undefined;
      setIsNoAd(headUmpireNoAd !== undefined ? headUmpireNoAd : !!match.isNoAd);

      setSecilenKort(match.Kort || 'Secilmedi');

      // İlk servis atan takım/oyuncu
      const initialServer = (match.ilkServisOyuncusu === 1 || match.ilkServisOyuncusu === 2)
        ? match.ilkServisOyuncusu
        : (match.detailedState?.firstServerOfMatch || 1);
      setFirstServingTeam(initialServer);

      // Sol sahadaki takım/oyuncu
      const initialLeft = (match.ilkSolTakim === 1 || match.ilkSolTakim === 2)
        ? match.ilkSolTakim
        : 1;
      setLeftTeam(initialLeft);

      // Çiftler ayarları
      setT1ServerIdx(match.ilkT1ServisOyuncusu ?? 0);
      setT2ServerIdx(match.ilkT2ServisOyuncusu ?? 0);
      setT1RecIdx(match.ilkT1KarsilayanOyuncusu ?? 0);
      setT2RecIdx(match.ilkT2KarsilayanOyuncusu ?? 0);

      const defaultTb = (tournamentInfo?.tbType as 'standard' | 'coman') || 'standard';
      setTbType(match.tbKurali || defaultTb);

      if (match.Baslangic_Saati && match.Baslangic_Saati !== 'Secilmedi') {
        setBaslangicSaati(match.Baslangic_Saati);
      } else {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setBaslangicSaati(`${hh}:${mm}`);
      }
      setBitisSaati(match.Bitis_Saati || '');
      
      setRotation(0);
      setIsFlipping(false);
      setHasTossed(false);
    }
  }, [match, isOpen, categoryFormats, categoryNoAdSettings, tournamentInfo]);

  if (!isOpen || !match) return null;

  // Kura kurallarını uygulayıp servis ve sol sahayı otomatik güncelleme
  const applyTossRules = (winner: string, choice: string, side: string) => {
    if (winner === 'Secilmedi') return;
    const isWinnerP1 = winner === p1Name;
    const winnerTeam: 1 | 2 = isWinnerP1 ? 1 : 2;
    const opponentTeam: 1 | 2 = isWinnerP1 ? 2 : 1;

    // Servis seçimi
    if (choice === 'Servis') {
      setFirstServingTeam(winnerTeam);
    } else if (choice === 'Karşılama') {
      setFirstServingTeam(opponentTeam);
    } else if (choice === 'Saha Seçimi') {
      setFirstServingTeam(opponentTeam); // Saha seçtiyse ilk servis rakibe geçer
    }

    // Saha tercihi (Sandalyenin Solu / Sağı)
    const wantsLeft = (side || '').toLowerCase().includes('sol');
    if (wantsLeft) {
      setLeftTeam(winnerTeam);
    } else {
      setLeftTeam(opponentTeam);
    }
  };

  const handleSelectTossWinner = (winner: string) => {
    setKuraKazanan(winner);
    applyTossRules(winner, kuraTercih, sahaTarafi);
  };

  const handleSelectTossChoice = (choice: string) => {
    setKuraTercih(choice);
    applyTossRules(kuraKazanan, choice, sahaTarafi);
  };

  const handleSelectSideChoice = (side: string) => {
    setSahaTarafi(side);
    applyTossRules(kuraKazanan, kuraTercih, side);
  };

  const handleSwapSides = () => {
    setLeftTeam(prev => prev === 1 ? 2 : 1);
  };

  const handleSwapServers = () => {
    setFirstServingTeam(prev => prev === 1 ? 2 : 1);
  };

  const handleSetTimeNow = (field: 'start' | 'end') => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    if (field === 'start') setBaslangicSaati(timeStr);
    else setBitisSaati(timeStr);
  };

  const handleAdjustTime = (field: 'start' | 'end', deltaMinutes: number) => {
    const currentStr = field === 'start' ? baslangicSaati : bitisSaati;
    let [h, m] = (currentStr || '10:00').split(':').map(Number);
    if (isNaN(h) || isNaN(m)) {
      const now = new Date();
      h = now.getHours();
      m = now.getMinutes();
    }
    const date = new Date();
    date.setHours(h, m + deltaMinutes, 0, 0);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const newStr = `${hh}:${mm}`;
    if (field === 'start') setBaslangicSaati(newStr);
    else setBitisSaati(newStr);
  };

  const executeCoinTossFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setHasTossed(true);

    const isP1 = Math.random() > 0.5;
    const winner = isP1 ? p1Name : p2Name;
    
    const baseRotation = Math.floor(rotation / 360) * 360;
    const spins = 5 * 360; 
    
    let finalRotation;
    if (isP1) {
      finalRotation = baseRotation + spins; 
    } else {
      finalRotation = baseRotation + spins + 180; 
    }
    
    setRotation(finalRotation);

    setTimeout(() => {
      setIsFlipping(false);
      handleSelectTossWinner(winner);
    }, 1200); 
  };

  const buildPayload = (newStatus: MatchItem['Durum'], isStartingNow: boolean) => {
    const sideName = leftTeam === 1 ? 'Sandalyenin Solu' : 'Sandalyenin Sağı';
    const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return {
      durum: newStatus,
      kuraKazanan,
      kuraTercih,
      sahaTarafi: sideName,
      baslangicSaati: isStartingNow ? (baslangicSaati || nowStr) : (match.Baslangic_Saati || 'Secilmedi'),
      bitisSaati,
      skorFormati,
      isNoAd, 
      yeniKort: secilenKort !== match.Kort ? secilenKort : undefined,
      ilkServisOyuncusu: firstServingTeam,
      ilkSolTakim: leftTeam,
      t1ServerIdx,
      t2ServerIdx,
      t1RecIdx,
      t2RecIdx,
      tbType,
      chairSetups: {
        1: {
          setupSetNum: 1,
          firstServingTeam,
          leftTeam,
          tbType,
          t1ServerIdx,
          t2ServerIdx,
          t1DeuceReceiverIdx: t1RecIdx,
          t2DeuceReceiverIdx: t2RecIdx
        }
      }
    };
  };

  const handleJustSave = () => {
    saveMatchSetup(match.id, buildPayload(match.Durum, false));
    onClose();
  };

  const handleSaveAndStart = () => {
    saveMatchSetup(match.id, buildPayload('Oynaniyor', true));
    onClose();
    onStartMatch(match.id);
  };

  // Kort Önizlemesi Hesaplamaları
  const rightTeam = leftTeam === 1 ? 2 : 1;
  const leftTeamName = leftTeam === 1 ? p1Name : p2Name;
  const rightTeamName = rightTeam === 1 ? p1Name : p2Name;

  const leftIsServer = firstServingTeam === leftTeam;
  const rightIsServer = firstServingTeam === rightTeam;

  // Çiftler için sol ve sağ saha oyuncuları
  const leftT1Players = leftTeam === 1 ? t1Players : t2Players;
  const rightT2Players = rightTeam === 1 ? t1Players : t2Players;

  const leftActiveServerIdx = leftTeam === 1 ? t1ServerIdx : t2ServerIdx;
  const rightActiveServerIdx = rightTeam === 1 ? t1ServerIdx : t2ServerIdx;

  const leftActiveRecIdx = leftTeam === 1 ? t1RecIdx : t2RecIdx;
  const rightActiveRecIdx = rightTeam === 1 ? t1RecIdx : t2RecIdx;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in overflow-y-auto">

      {/* --- ANA KURULUM PENCERESİ --- */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Maç Öncesi Kura & Saha Kurulumu
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full font-extrabold bg-slate-800 text-amber-400 border border-amber-500/30">
                  {isDoubles ? 'Çiftler Maçı' : 'Tekler Maçı'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {match.Kort} • {match.Kategori}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Oyuncu/Takım Eşleşmesi Kartı */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
          <div className="flex-1 min-w-0 pr-2">
            <div className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">1. Takım / Oyuncu</div>
            <div className="font-black text-xs sm:text-sm text-white truncate mt-0.5" title={p1Name}>{p1Name}</div>
          </div>
          <div className="px-3 text-xs font-black text-slate-500 bg-slate-900 py-1 rounded-lg border border-slate-800 shrink-0">VS</div>
          <div className="flex-1 min-w-0 text-right pl-2">
            <div className="text-[10px] text-blue-400 font-black uppercase tracking-wider">2. Takım / Oyuncu</div>
            <div className="font-black text-xs sm:text-sm text-white truncate mt-0.5" title={p2Name}>{p2Name}</div>
          </div>
        </div>

        {/* Kura Atışı Başlatma Bölümü (İnline 3D Kura) */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🪙 Kura Atışı (Para Çevirme)</span>
            </span>
            {kuraKazanan !== 'Secilmedi' && (
              <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                Kura Kazananı: <strong className="text-white">{kuraKazanan}</strong>
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
            {/* 3D Dönen Para */}
            <div className="relative w-24 h-24 [perspective:1000px] shrink-0 flex items-center justify-center">
              <div
                className="w-full h-full rounded-full transition-transform duration-[1200ms] cubic-bezier(0.2, 0.85, 0.3, 1) [transform-style:preserve-3d] shadow-xl relative"
                style={{
                  transform: `rotateY(${rotation}deg)`,
                }}
              >
                {/* 1. Takım Yüzü */}
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 flex flex-col items-center justify-center p-2 text-center text-white [backface-visibility:hidden] shadow-inner">
                  <span className="text-2xl mb-0.5">🎾</span>
                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-emerald-200">1. Takım</span>
                  <span className="font-black text-[10px] truncate w-full px-1">{p1Name.split('/')[0]}</span>
                </div>

                {/* 2. Takım Yüzü */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-blue-400 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex flex-col items-center justify-center p-2 text-center text-white shadow-inner [backface-visibility:hidden]"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  <span className="text-2xl mb-0.5">🛡️</span>
                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-blue-200">2. Takım</span>
                  <span className="font-black text-[10px] truncate w-full px-1">{p2Name.split('/')[0]}</span>
                </div>
              </div>
            </div>

            {/* Kura Butonu ve Hızlı Manuel Seçim */}
            <div className="flex-1 w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={executeCoinTossFlip}
                disabled={isFlipping}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 disabled:opacity-50"
              >
                <Disc className={`w-4 h-4 ${isFlipping ? 'animate-spin' : ''}`} />
                <span>{isFlipping ? 'Kura Dönüyor...' : hasTossed ? 'Yeniden Kura At' : 'Parayı Çevir (Kura At)'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTossWinner(p1Name)}
                  className={`py-2 px-2.5 rounded-lg border text-left transition flex items-center justify-between text-xs font-bold ${
                    kuraKazanan === p1Name ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className="truncate"><span className="text-[10px] text-emerald-400 font-black">1.T: </span>{p1Name.split('/')[0]}</div>
                  {kuraKazanan === p1Name && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectTossWinner(p2Name)}
                  className={`py-2 px-2.5 rounded-lg border text-left transition flex items-center justify-between text-xs font-bold ${
                    kuraKazanan === p2Name ? 'bg-blue-950/60 border-blue-500 text-white ring-1 ring-blue-400' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className="truncate"><span className="text-[10px] text-blue-400 font-black">2.T: </span>{p2Name.split('/')[0]}</div>
                  {kuraKazanan === p2Name && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </button>
              </div>
            </div>
          </div>

          {/* Kura Tercihleri */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Kura Tercihi</label>
              <select
                value={kuraTercih}
                onChange={(e) => handleSelectTossChoice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-bold focus:border-amber-400"
              >
                <option value="Servis">🎾 Servis Atacak</option>
                <option value="Karşılama">🛡️ Karşılayacak</option>
                <option value="Saha Seçimi">🏟️ Saha Tercih Etti</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Saha Tarafı (Kura Kazananı)</label>
              <select
                value={sahaTarafi}
                onChange={(e) => handleSelectSideChoice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-bold focus:border-amber-400"
              >
                <option value="Sandalyenin Solu">🪑 Sandalyenin Solu (Sol Saha)</option>
                <option value="Sandalyenin Sağı">🪑 Sandalyenin Sağı (Sağ Saha)</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- DİREKT VE NET KONTROLLER (İLK SERVİS & SAHA DAĞILIMI) --- */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯 Maç Başlangıç Ayarları</span>
              <span className="text-[10px] font-normal text-slate-400 lowercase">(doğrudan değiştirebilirsiniz)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* İlk Servisi Atacak Takım */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">🎾 İlk Servisi Kim Atacak?</span>
                <button
                  type="button"
                  onClick={handleSwapServers}
                  className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-3 h-3" /> Değiştir
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFirstServingTeam(1)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-black transition border truncate ${
                    firstServingTeam === 1
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-1 ring-emerald-300'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  1. Takım
                </button>
                <button
                  type="button"
                  onClick={() => setFirstServingTeam(2)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-black transition border truncate ${
                    firstServingTeam === 2
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-1 ring-blue-300'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  2. Takım
                </button>
              </div>
            </div>

            {/* Hakem Sandalyesine Göre Sol Sahadaki Takım */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">🪑 Sol Sahada Kim Başlayacak?</span>
                <button
                  type="button"
                  onClick={handleSwapSides}
                  className="text-[10px] text-cyan-400 font-bold hover:underline flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-3 h-3" /> Sahaları Değiş
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLeftTeam(1)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-black transition border truncate ${
                    leftTeam === 1
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-1 ring-emerald-300'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  1. Takım (Solda)
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTeam(2)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-black transition border truncate ${
                    leftTeam === 2
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-1 ring-blue-300'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  2. Takım (Solda)
                </button>
              </div>
            </div>
          </div>

          {/* ÇİFTLER (DOUBLES) ÖZEL AYARLARI */}
          {isDoubles && (
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 animate-in fade-in">
              <div className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Çiftler Oyuncu Rolleri (Servisçi ve Deuce Karşılayıcı)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Takım Oyuncu Seçimi */}
                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2">
                  <div className="text-[11px] font-black text-emerald-300 uppercase">1. Takım ({p1Name})</div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">İlk Servisçi:</label>
                    <div className="flex gap-1.5">
                      {t1Players.map((player, idx) => (
                        <button
                          key={`t1-serv-${idx}`}
                          type="button"
                          onClick={() => setT1ServerIdx(idx as 0 | 1)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition border truncate ${
                            t1ServerIdx === idx ? 'bg-emerald-600 text-white border-emerald-400 shadow' : 'bg-slate-950 text-slate-300 border-slate-800'
                          }`}
                        >
                          {player.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Sağda (Deuce) Karşılayan:</label>
                    <div className="flex gap-1.5">
                      {t1Players.map((player, idx) => (
                        <button
                          key={`t1-rec-${idx}`}
                          type="button"
                          onClick={() => setT1RecIdx(idx as 0 | 1)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition border truncate ${
                            t1RecIdx === idx ? 'bg-emerald-600 text-white border-emerald-400 shadow' : 'bg-slate-950 text-slate-300 border-slate-800'
                          }`}
                        >
                          {player.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Takım Oyuncu Seçimi */}
                <div className="p-3 rounded-xl bg-slate-900 border border-blue-500/30 space-y-2">
                  <div className="text-[11px] font-black text-blue-300 uppercase">2. Takım ({p2Name})</div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">İlk Servisçi:</label>
                    <div className="flex gap-1.5">
                      {t2Players.map((player, idx) => (
                        <button
                          key={`t2-serv-${idx}`}
                          type="button"
                          onClick={() => setT2ServerIdx(idx as 0 | 1)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition border truncate ${
                            t2ServerIdx === idx ? 'bg-blue-600 text-white border-blue-400 shadow' : 'bg-slate-950 text-slate-300 border-slate-800'
                          }`}
                        >
                          {player.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Sağda (Deuce) Karşılayan:</label>
                    <div className="flex gap-1.5">
                      {t2Players.map((player, idx) => (
                        <button
                          key={`t2-rec-${idx}`}
                          type="button"
                          onClick={() => setT2RecIdx(idx as 0 | 1)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition border truncate ${
                            t2RecIdx === idx ? 'bg-blue-600 text-white border-blue-400 shadow' : 'bg-slate-950 text-slate-300 border-slate-800'
                          }`}
                        >
                          {player.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- GÖRSEL KORT ÖNİZLEMESİ (MINI COURT) --- */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-2 shadow-inner">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span>🏟️ Canlı Kort Dağılımı Önizlemesi</span>
            </span>
            <button
              type="button"
              onClick={handleSwapSides}
              className="text-[10px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1"
            >
              <ArrowLeftRight className="w-3 h-3 text-cyan-400" /> Sahaları Değiş
            </button>
          </div>

          {/* Mini Kort Tasarımı */}
          <div className="relative rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 p-3 overflow-hidden shadow-xl">
            {/* Ortadaki File ve Hakem Sandalyesi */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 border-r border-dashed border-white/40 flex flex-col items-center justify-center">
              <div className="bg-amber-500 text-slate-950 p-1 rounded-full text-[10px] font-black shadow-md z-10" title="Hakem Sandalyesi">
                🪑
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-0">
              {/* Sol Saha */}
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] font-black uppercase text-cyan-400">SOL SAHA</span>
                  {leftIsServer && (
                    <span className="animate-bounce text-xs font-black text-amber-400" title="İlk Servis Bu Taraftan">
                      🎾 SERVİS
                    </span>
                  )}
                </div>
                <div className={`font-black text-xs sm:text-sm truncate w-full ${leftTeam === 1 ? 'text-emerald-300' : 'text-blue-300'}`}>
                  {leftTeamName}
                </div>
                {isDoubles && (
                  <div className="text-[10px] text-slate-400 font-bold mt-1">
                    {leftIsServer 
                      ? `Servis: ${leftT1Players[leftActiveServerIdx]?.split(' ')[0] || ''}` 
                      : `Deuce Karşılama: ${leftT1Players[leftActiveRecIdx]?.split(' ')[0] || ''}`}
                  </div>
                )}
              </div>

              {/* Sağ Saha */}
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">SAĞ SAHA</span>
                  {rightIsServer && (
                    <span className="animate-bounce text-xs font-black text-amber-400" title="İlk Servis Bu Taraftan">
                      🎾 SERVİS
                    </span>
                  )}
                </div>
                <div className={`font-black text-xs sm:text-sm truncate w-full ${rightTeam === 1 ? 'text-emerald-300' : 'text-blue-300'}`}>
                  {rightTeamName}
                </div>
                {isDoubles && (
                  <div className="text-[10px] text-slate-400 font-bold mt-1">
                    {rightIsServer 
                      ? `Servis: ${rightT2Players[rightActiveServerIdx]?.split(' ')[0] || ''}` 
                      : `Deuce Karşılama: ${rightT2Players[rightActiveRecIdx]?.split(' ')[0] || ''}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Format, Saat ve Kort Değiştirme */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-300 block">Maç Formatı</label>
            <select
              value={skorFormati}
              onChange={(e) => setSkorFormati(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-[11px] text-white font-bold"
            >
              {SCORE_FORMAT_OPTIONS.map((fmt) => (
                <option key={fmt} value={fmt} className="text-slate-300">{fmt}</option>
              ))}
            </select>
            
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <label className="text-[10px] font-bold text-slate-400">Karar Puanı (No-Ad)</label>
              <input 
                type="checkbox" 
                checked={isNoAd} 
                onChange={(e) => setIsNoAd(e.target.checked)} 
                className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-400 bg-slate-900 cursor-pointer" 
              />
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-300 block">Tie-Break Kuralı</label>
            <select
              value={tbType}
              onChange={(e) => setTbType(e.target.value as 'standard' | 'coman')}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-[11px] text-white font-bold"
            >
              <option value="standard">Standart (6 puanda bir değişim)</option>
              <option value="coman">Coman (1-5-9 puanda değişim)</option>
            </select>
            <div className="text-[9px] text-slate-500 pt-1">Set sonu tie-break saha değişim kuralı</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
            <label className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider">Kort Değişimi</label>
            <select
              value={secilenKort}
              onChange={(e) => setSecilenKort(e.target.value)}
              className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-2 py-1.5 text-[11px] text-amber-300 font-bold focus:border-amber-400"
            >
              {distinctKortlar.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <div className="text-[9px] text-slate-500 pt-1">Farklı korta taşımak isterseniz seçin</div>
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleSaveAndStart}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl transition active:scale-95"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Maçı Başlat & Canlı Skora Geç</span>
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleJustSave}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-1.5 shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Sadece Ayarları Kaydet</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 font-bold text-xs transition border border-transparent hover:border-rose-500/30"
            >
              İptal
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
