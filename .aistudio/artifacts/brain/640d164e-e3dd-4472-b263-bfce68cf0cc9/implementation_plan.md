# Kura ve Kurulum Seçimlerinin Skor Ekranına Yansıtılması

Kura ve Maç Kurulumu (`MatchSetupModal`) ekranında yapılan seçimlerin (Kura Kazananı, Kura Tercihi, Saha Tarafı ve İlk Servisçi) hem kort kartı hızlı skor girişine hem de Kule Hakemi canlı skor ekranına anında ve eksiksiz yansıması, oyuncuların doğru kort taraflarına (Sol/Sağ) yerleşmesi ve ekranda belirgin bir Kura Bilgi Rozeti ile gösterilmesi sağlanacaktır.

---

## 1. Tespit Edilen Kök Nedenler

```
┌─────────────────────────────────┐
│       MatchSetupModal.tsx       │
│  Kura Kazanan / Tercih / Saha   │
└────────────────┬────────────────┘
                 │ (1. Eksiklik: 'ilkSolTakim' doğrudan hesaplanıp saveMatchSetup'a gönderilmiyordu)
                 ▼
┌─────────────────────────────────┐
│     TennisDataContext.tsx       │
│   saveMatchSetup / MatchItem    │
└────────────────┬────────────────┘
                 │ (2. Kritik Hata: CourtCard içindeki 'setupsBySet' senkronizasyonunda
                 │  { ...match.chairSetups, ...prev } yazımı nedeniyle 'prev' state'i
                 │  güncellenen kura/saha verisini eziyordu)
                 ▼
┌─────────────────────────────────┐
│          CourtCard.tsx          │
│   Kort Kartı & Kule Hakemi Modu │
└─────────────────────────────────┘
  (3. Görsel Eksiklik: Kura kazananı, tercihi ve sahası skor ekranında hakeme gösterilmiyordu)
```

1. **`MatchSetupModal.tsx` içerisinde eksik `ilkSolTakim` parametresi**:
   Modal kaydedilirken `finalFirstServer` hesaplanıyor ancak `finalLeftTeam` hesaplanıp `saveMatchSetup` çağrısına iletilmiyordu. Saha seçimi kura kazananına göre ("Sandalyenin Solu" / "Sandalyenin Sağı") doğrudan `ilkSolTakim: 1 | 2` olarak hesaplanacak ve veriye yazılacaktır.
2. **`CourtCard.tsx` State Ezilme Hatası (`setSetupsBySet`)**:
   `setSetupsBySet(prev => ({ ...match.chairSetups, ...prev }))` ifadesinde `...prev` sona yazıldığı için eski yerel state güncellenen `match.chairSetups[1]` verisini eziyordu. `{ ...prev, ...match.chairSetups }` olarak düzeltilecek ve maç başında kura değiştiğinde Set 1 kurulumu anında güncellenecektir.
3. **Skor ve Kule Ekranında Görsel Kura Bilgi Rozeti Eksikliği**:
   Hakemin kura sonucunu, oyuncunun tercihini (Servis/Karşılama/Saha) ve başlangıç sahasını (Sol/Sağ) hem normal kort görünümünde hem de tam ekran Kule Hakemi modunda net olarak görebileceği şık bir "Kura & Kurulum Özeti" rozeti eklenecektir.

---

## 2. Kullanıcı Deneyimi ve Görsel Tasarım

- **Kule Hakemi Canlı Ekranı**:
  - Skor tablosunun üst veya alt paneline zarif bir kura kartı eklenecektir:
    `🪙 Kura: [Kazanan] • Tercih: [Servis / Karşılama / Saha] • Sol Saha: [Oyuncu/Takım Adı]`
  - Sol ve Sağ saha kutularında ilk servisçinin yanında tenis topu (`🎾 Servis`) ve doğru oyuncu adı görünecektir.
- **Kort Kartı (Dış Görünüm)**:
  - Skor tablosunun hemen üzerinde veya hakem rozetinin yanında kura tercihi ve saha dağılımını belirten kompakt rozet yer alacaktır.
- **Kura Animasyonu ve Kurallar**:
  - Mevcut para atma animasyonu (`DİĞER GÜNCEL ÖZELLİKLERİ EKLE VEYA KORU AMA KURA ANİMASYONUNU DEĞİŞTİRME`) kesinlikle korunacaktır.

---

## 3. Teknik Mimari ve Uygulama Adımları

### Adım 1: `MatchSetupModal.tsx` Düzenlemesi
- `handleJustSave` ve `handleSaveAndStart` fonksiyonlarında `finalLeftTeam` hesaplanması:
  - Kura Kazananı 1. Oyuncu ve `sahaTarafi === 'Sandalyenin Solu'` -> `finalLeftTeam = 1`
  - Kura Kazananı 1. Oyuncu ve `sahaTarafi === 'Sandalyenin Sağı'` -> `finalLeftTeam = 2`
  - Kura Kazananı 2. Oyuncu ve `sahaTarafi === 'Sandalyenin Solu'` -> `finalLeftTeam = 2`
  - Kura Kazananı 2. Oyuncu ve `sahaTarafi === 'Sandalyenin Sağı'` -> `finalLeftTeam = 1`
  - Kura seçilmemişse -> Sol ise 1, Sağ ise 2.
- `saveMatchSetup` çağrısına `ilkSolTakim: finalLeftTeam` parametresinin eksiksiz gönderilmesi.
- Saha seçimi etiketinin kullanıcı açısından daha açık hale getirilmesi ("Kura Kazananın / 1. Oyuncunun Sahası").

### Adım 2: `TennisDataContext.tsx` Düzenlemesi
- `saveMatchSetup` içinde `ilkSolTakim` ve `ilkServisOyuncusu` değerlerinin `chairSetups[1]` ve `detailedState` ile senkronizasyonunun garanti altına alınması.

### Adım 3: `CourtCard.tsx` Düzenlemesi
- `setSetupsBySet` güncellemesinde öncelik sırasının düzeltilmesi (`{ ...prev, ...match.chairSetups }`).
- `initialTossServer` ve `initialTossLeft` değişiminde `setupsBySet[1]`'in anında reaktif olarak güncellenmesi.
- Hem Kort Kartı üzerinde hem de Kule Hakemi modunda kura sonucu, oyuncunun tercihi ve sol/sağ saha bilgisini gösteren şık kura bilgi rozetinin eklenmesi.

### Adım 4: Doğrulama ve Derleme
- `compile_applet` ile sıfır hata doğrulaması yapılması.
