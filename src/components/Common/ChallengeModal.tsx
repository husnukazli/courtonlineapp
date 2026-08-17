import React, { useState } from 'react';
import { AlertTriangle, Check, X, ShieldAlert, RotateCcw, Award } from 'lucide-react';
import { MatchItem } from '../../types/tennis';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchItem;
  onResolveChallenge: (
    player: 1 | 2,
    outcome: 'UPHELD' | 'OVERTURNED',
    reason: 'LINE_CALL' | 'OVERRULE' | 'SERVICE_FAULT' | 'TOUCH_NET' | 'LET_POINT',
    notes: string,
    actionType: 'REPLAY_POINT' | 'AWARD_POINT' | 'KEEP_DECISION'
  ) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  onClose,
  match,
  onResolveChallenge,
}) => {
  const p1Name = match['Oyuncu 1'];
  const p2Name = match['Oyuncu 2'];
  const state = match.detailedState;

  const [selectedPlayer, setSelectedPlayer] = useState<1 | 2>(1);
  const [reason, setReason] = useState<
    'LINE_CALL' | 'OVERRULE' | 'SERVICE_FAULT' | 'TOUCH_NET' | 'LET_POINT'
  >('LINE_CALL');
  const [outcome, setOutcome] = useState<'UPHELD' | 'OVERTURNED'>('OVERTURNED');
  const [actionType, setActionType] = useState<
    'REPLAY_POINT' | 'AWARD_POINT' | 'KEEP_DECISION'
  >('AWARD_POINT');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const p1Challenges = state?.p1ChallengesLeft ?? 3;
  const p2Challenges = state?.p2ChallengesLeft ?? 3;

  const handleConfirm = () => {
    const defaultNote = `${selectedPlayer === 1 ? p1Name : p2Name} İtirazı: ${
      reason === 'LINE_CALL'
        ? 'Çizgi Kontrolü (Top İzi)'
        : reason === 'OVERRULE'
        ? 'Kule Hakemi Karar Değişikliği (Overrule)'
        : reason === 'TOUCH_NET'
        ? 'File Teması / Kural İhlali'
        : reason === 'SERVICE_FAULT'
        ? 'Ayak Hatası / Servis İhlali'
        : 'Sayı Tekrarı (Let)'
    } -> ${
      outcome === 'OVERTURNED'
        ? 'Haklı Bulundu (' +
          (actionType === 'AWARD_POINT'
            ? 'Sayı ' + (selectedPlayer === 1 ? p1Name : p2Name) + "'e verildi"
            : 'Sayı Tekrar Oynatılacak') +
          ')'
        : 'Haksız Bulundu (Karar Korundu, 1 Hak Düştü)'
    }`;

    onResolveChallenge(
      selectedPlayer,
      outcome,
      reason,
      notes.trim() || defaultNote,
      outcome === 'OVERTURNED' ? actionType : 'KEEP_DECISION'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Challenge & Hakem Karar Düzeltme</h3>
              <p className="text-xs text-amber-300/80">İtiraz ve overrule yönetimi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 1. İtiraz Eden Oyuncu */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              1. İtiraz Eden / Kararın İlgili Olduğu Taraf
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlayer(1)}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  selectedPlayer === 1
                    ? 'border-emerald-500 bg-emerald-950/40 text-white ring-2 ring-emerald-500/30'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Oyuncu 1</div>
                  <div className="text-sm font-bold truncate">{p1Name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Kalan Challenge: <span className="font-bold text-emerald-400">{p1Challenges}</span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlayer(2)}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  selectedPlayer === 2
                    ? 'border-cyan-500 bg-cyan-950/40 text-white ring-2 ring-cyan-500/30'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="text-[10px] uppercase font-bold text-cyan-400">Oyuncu 2</div>
                  <div className="text-sm font-bold truncate">{p2Name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Kalan Challenge: <span className="font-bold text-cyan-400">{p2Challenges}</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. İtiraz Konusu / Sebebi */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              2. İtiraz / Düzeltme Sebebi
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'LINE_CALL', label: '🎾 Çizgi / Top İzi (In / Out)' },
                { id: 'OVERRULE', label: '👑 Hakem Müdahalesi (Overrule)' },
                { id: 'TOUCH_NET', label: '🕸️ File / Oyuncu Teması' },
                { id: 'SERVICE_FAULT', label: '🦶 Ayak / Servis Hatası' },
                { id: 'LET_POINT', label: '🔄 Sayı Tekrarı (Let)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setReason(item.id as any)}
                  className={`p-2.5 rounded-xl border font-semibold text-left transition ${
                    reason === item.id
                      ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. İtiraz Sonucu */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              3. Hakem / Kontrol Kararı
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOutcome('OVERTURNED')}
                className={`p-3.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  outcome === 'OVERTURNED'
                    ? 'border-emerald-400 bg-emerald-950/50 text-emerald-300 ring-2 ring-emerald-400/30'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Check className="w-6 h-6 text-emerald-400" />
                <span className="font-bold text-sm text-white">İTİRAZ HAKLI</span>
                <span className="text-[11px] text-emerald-400/90 font-medium">
                  Karar Değişiyor (Challenge Başarılı)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOutcome('OVERTURNED' === outcome ? 'UPHELD' : 'UPHELD')}
                className={`p-3.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  outcome === 'UPHELD'
                    ? 'border-rose-400 bg-rose-950/50 text-rose-300 ring-2 ring-rose-400/30'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <X className="w-6 h-6 text-rose-400" />
                <span className="font-bold text-sm text-white">İTİRAZ HAKSIZ</span>
                <span className="text-[11px] text-rose-400/90 font-medium">
                  Karar Korunuyor (-1 Challenge)
                </span>
              </button>
            </div>
          </div>

          {/* 4. Karar Uygulama Aksiyonu (Eğer Karar Değiştiyse) */}
          {outcome === 'OVERTURNED' && (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
              <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                4. Puanın Uygulanış Şekli
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType('AWARD_POINT')}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left transition flex items-center gap-2 ${
                    actionType === 'AWARD_POINT'
                      ? 'border-lime-400 bg-lime-400/20 text-lime-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <Award className="w-4 h-4 text-lime-400 flex-shrink-0" />
                  <span>Sayıyı {selectedPlayer === 1 ? p1Name : p2Name}'e Ver</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('REPLAY_POINT')}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left transition flex items-center gap-2 ${
                    actionType === 'REPLAY_POINT'
                      ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>Sayıyı Tekrar Oynat (Let)</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Hakem Notu (Opsiyonel) */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Hakem Açıklama Notu (Opsiyonel)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Top arka çizginin 2 cm içine düştü, sayı düzeltildi..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-xs sm:text-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Kararı Kaydet ve Skoru Güncelle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
