import React, { useState } from 'react';
import { useTennisData } from '../../context/TennisDataContext';
import {
  QrCode,
  Smartphone,
  Share2,
  Copy,
  Check,
  ExternalLink,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  Users,
  Info,
} from 'lucide-react';

interface ShareRefereeLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareRefereeLinkModal: React.FC<ShareRefereeLinkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { referees } = useTennisData();
  const [selectedReferee, setSelectedReferee] = useState<string>('ALL');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // In AI Studio, window.location.origin is the exact running URL
  const getPublicBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const publicBaseUrl = getPublicBaseUrl();

  // Construct final URL based on selected referee
  let finalUrl = `${publicBaseUrl}/?role=supervisor`;
  if (selectedReferee !== 'ALL') {
    finalUrl = `${publicBaseUrl}/?hakem=${encodeURIComponent(selectedReferee)}`;
  }

  // High-res QR code image URL
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&color=051224&bgcolor=ffffff&data=${encodeURIComponent(
    finalUrl
  )}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(finalUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleWhatsAppShare = () => {
    const text =
      selectedReferee === 'ALL'
        ? `🎾 CourtOnline Hakem Skor Giriş Bağlantısı:\n${finalUrl}\n\n(Herhangi bir hesap veya şifre gerekmez, doğrudan tıklayıp skor girebilirsiniz)`
        : `🎾 Sayın ${selectedReferee},\nCourtOnline Hakem Skor Giriş Bağlantınız:\n${finalUrl}\n\n(Herhangi bir hesap veya şifre gerekmez, doğrudan tıklayıp skor girebilirsiniz)`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-7 w-full max-w-lg shadow-2xl space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-lime-400/20 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg">
                Hakem Telefon Giriş Bağlantısı & Karekod
              </h3>
              <p className="text-xs text-lime-400 font-semibold">
                ✨ Hesap açma veya Google girişi gerekmez (Doğrudan Açılır)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Important Info Card */}
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-start gap-3 text-xs text-emerald-200">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white">
              Hakemler telefonlarından bu linki açtığında doğrudan skor girebilir:
            </p>
            <p className="text-emerald-300/90 leading-relaxed text-[11px]">
              Kullanıcı adı, e-posta veya Google hesabı gerekmez. Karekodu telefon kamerasıyla okutmaları veya WhatsApp bağlantısına tıklamaları yeterlidir.
            </p>
          </div>
        </div>

        {/* Google Sign-in Resolution Guide */}
        <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">
              ⚠️ Hakemlerin telefonunda "Google ile Giriş Yap" çıkıyorsa:
            </p>
            <p className="text-amber-200/90 text-[11px] leading-relaxed">
              Google AI Studio ekranının sağ üst köşesindeki <strong>"Share" (Paylaş)</strong> butonuna tıklayın ve erişim ayarını <strong>"Anyone with the link" (Bağlantısı olan herkes)</strong> olarak kaydedin. Bu ayar yapıldığında hakemlere hiçbir Google hesabı sorulmaz.
            </p>
          </div>
        </div>

        {/* Referee Selection Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-lime-400" />
              <span>Kimin İçin Bağlantı Üretilecek?</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              İsme özel veya genel
            </span>
          </label>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedReferee('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedReferee === 'ALL'
                  ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-md shadow-lime-400/20 font-black'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              🌟 Genel (Tüm Hakemler)
            </button>
            {referees.map((ref) => (
              <button
                key={ref.name}
                type="button"
                onClick={() => setSelectedReferee(ref.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  selectedReferee === ref.name
                    ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-md shadow-lime-400/20 font-black'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                👤 {ref.name}
              </button>
            ))}
          </div>
        </div>

        {/* QR Code Card & Link Display */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
          {/* QR Code Container */}
          <div className="bg-white p-3 rounded-2xl shadow-xl shrink-0 flex items-center justify-center">
            <img
              src={qrCodeImageUrl}
              alt="Hakem Giriş Karekodu"
              className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-lg"
            />
          </div>

          {/* Actions & URL */}
          <div className="flex-1 space-y-3 w-full text-center sm:text-left">
            <div>
              <span className="text-[11px] uppercase font-black text-lime-400 tracking-wider">
                {selectedReferee === 'ALL'
                  ? 'Genel Hakem Bağlantısı'
                  : `${selectedReferee} İçin Doğrudan Link`}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Kameranızı karekoda tutun veya aşağıdaki linki kopyalayıp gönderin:
              </p>
            </div>

            {/* Readonly URL Box */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 truncate select-all">
              {finalUrl}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border ${
                  copied
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kopyalandı!' : 'Linki Kopyala'}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp İle Gönder</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-lime-400 shrink-0" />
            <span>Telefonda girilen skorlar anında başhakem masasına yansır.</span>
          </div>
          <button
            type="button"
            onClick={() => window.open(finalUrl, '_blank')}
            className="text-[11px] text-lime-400 hover:text-lime-300 font-bold flex items-center gap-1 shrink-0"
          >
            <span>Tarayıcıda Aç</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
