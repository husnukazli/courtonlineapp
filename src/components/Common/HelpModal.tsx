import React from 'react';
import { X, ShieldAlert, Smartphone, Tv, Sparkles, Award, RotateCcw } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <h3 className="font-bold text-base text-white">CourtOnline Kullanım & Challenge Rehberi</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs text-slate-300">
          {/* Saha Gözlemcisi */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-lime-400 text-sm">
              <Smartphone className="w-4 h-4" />
              <span>Saha Gözlemcisi (Roving Court Supervisor) Modu</span>
            </div>
            <p>
              Kortlar arasında gezen ve aynı anda birden fazla maçı izleyen saha gözlemcileri için özel olarak tasarlanmıştır.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>
                <strong>Oyun Bazlı Skorlama:</strong> 15-30-40 gibi mikro puanlarla uğraşmadan doğrudan oyunları (6-1, 6-2, 4-2 vb.) girin.
              </li>
              <li>
                <strong>Çoklu Kort İzleme:</strong> Tek ekranda tüm kortları veya seçtiğiniz kortları yan yana izleyebilir, tek dokunuşla +1 Oyun ekleyebilirsiniz.
              </li>
              <li>
                <strong>Hızlı Hazır Ayarlar:</strong> 4-1, 4-2, 6-2, 6-3, 6-4 gibi sık karşılaşılan skorları tek dokunuşla sete uygulayın.
              </li>
              <li>
                <strong>Maçı Bitir & Sonucu Bildir:</strong> Maç bittiğinde kazananı ve son skoru onaylayıp doğrudan turnuva masasına raporlayın.
              </li>
            </ul>
          </div>

          {/* Turnuva Masası */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-cyan-400 text-sm">
              <Tv className="w-4 h-4" />
              <span>Turnuva Masası & Başhakem Paneli</span>
            </div>
            <p>
              Saha gözlemcilerinin girdiği canlı oyun skorları ve biten maç raporları anlık olarak bu ekrana yansır.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>Tüm kortların canlı oyun durumlarını matris halinde izleme</li>
              <li>WhatsApp / SMS / Pano için tek tıkla turnuva bülteni ve sonuç raporu kopyalama</li>
              <li>Kategori yaş formatları (3 Normal Set, 3 Kısa Set, Maç Tie-Break) yönetimi</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-bold rounded-xl transition"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
};
