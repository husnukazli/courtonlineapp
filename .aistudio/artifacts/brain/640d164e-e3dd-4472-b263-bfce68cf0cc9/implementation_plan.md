# Hakem Girişinde O Günkü Kortları Seçme ve Filtreleme Sistemi

Hakemlerin sisteme PIN şifreleriyle giriş yaptıktan hemen sonra karşılarına gelen açılır pencereden o günkü aktif kortları çoklu olarak seçmelerini ve ekranlarında yalnızca sorumlu oldukları kortları görüntülemelerini sağlayan akıllı kort odaklama mimarisi.

## Kullanıcı İncelemesi & Kritik Kararlar

> [!IMPORTANT]
> Kullanıcının belirttiği akış birebir uygulanacaktır: Hakem şifresini girdikten sonra otomatik olarak o günkü kort listesinin yer aldığı bir ara açılır ekran (modal) açılacak; hakem buradan bir veya birden fazla kortu seçip devam ettiğinde diğer kortlar ekrandan gizlenecektir.

- **Onaylanan Akış**: Giriş PIN şifresi onaylandıktan sonra doğrudan ana ekrana geçilmez; araya 2. adım olarak "Sorumlu Olduğunuz Kortları Seçin" adımı gelir.
- **Çoklu Seçim Desteği**: Hakem aynı anda 1 kort, 2 kort veya "Tüm Kortlar" seçeneğini seçebilir.
- **Hızlı Güncelleme**: Gün içerisinde hakemin kortu değişirse, ekranı terk etmeden üst bardaki "🎯 Kortlarım: KORT 1, KORT 2 [Değiştir]" butonundan anında seçimini güncelleyebilir.
- **Baş Hakem Esnekliği**: Baş hakem (Masa/Tesk) varsayılan olarak her zaman tüm kortları görebilir veya dilerse filtreleyebilir.

---

## 1. Genel Bakış ve Temel Konsept

- **Ne Yapıyor**: Hakem giriş yaptığında turnuva programındaki ve sistemdeki kortlar (örn. KORT 1, KORT 2, KORT 3...) taranarak listelenir. Hakem görevli olduğu kortları işaretler ve "Seçili Kortlarla Devam Et" butonuna basar. Ekranda sadece bu kortlar ve bu kortlara ait maçlar gösterilir.
- **Hedef Kitle**: Sahadaki kort hakemleri ve gözlemciler. Küçük telefon veya tablet ekranlarında gereksiz kortları kaydırmak zorunda kalmadan yalnızca kendi kortlarına odaklanırlar.
- **Temel Değer**: Ekran kalabalığını ve karışıklığı sıfıra indirir; hakemin yanlış korta skor girmesini engeller; turnuva operasyonunu hızlandırır.

---

## 2. Kullanıcı Deneyimi ve Görsel Tasarım

```
┌────────────────────────────────────────────────────────┐
│                   HAKEM GİRİŞİ                         │
│  [ Hakem Seçimi: Hasan Yılmaz ]                        │
│  [ PIN: • • • • ]  ──> [ Giriş Yap Butonu ]            │
└───────────────────────────┬────────────────────────────┘
                            │ (Şifre Doğrulandı)
                            ▼
┌────────────────────────────────────────────────────────┐
│        🎯 GÖREVLİ OLDUĞUNUZ KORTLARI SEÇİN            │
│  "Hoş geldiniz Hasan Yılmaz, bugün hangi kortlardasınız?"│
│                                                        │
│  [ ✓ Tüm Kortlar (Seç/Kaldır) ]                        │
│                                                        │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ ☑ KORT 1         │  │ ☐ KORT 2         │            │
│  │ 4 Maç • 1 Canlı  │  │ 3 Maç            │            │
│  └──────────────────┘  └──────────────────┘            │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ ☑ KORT 3         │  │ ☐ KORT 4         │            │
│  │ 5 Maç • 1 Canlı  │  │ 2 Maç            │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                        │
│  [ 🚀 2 Kort ile Göreve Başla → ]                      │
└───────────────────────────┬────────────────────────────┘
                            │ (Devam Et)
                            ▼
┌────────────────────────────────────────────────────────┐
│  CourtOnline Hakem Paneli                              │
│  Filtre: [ 🎯 Kortlarım: KORT 1, KORT 3 ✎ (Değiştir) ] │
│                                                        │
│  ┌────────────────────────┐  ┌───────────────────────┐ │
│  │ KORT 1                 │  │ KORT 3                │ │
│  │ [CANLI] Ali v Veli     │  │ [BEKLİYOR] Can v Mert │ │
│  └────────────────────────┘  └───────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Adım Adım Kullanıcı Akışı:
1. **Adım 1 (Giriş & Doğrulama)**:
   - Hakem `RefereeLoginModal` üzerinde adını seçer ve PIN kodunu girer.
   - PIN doğru girildiğinde modal kapanmaz; otomatik ve akıcı bir animasyonla **Adım 2: Kort Seçim Ekranı**'na geçer.
2. **Adım 2 (Kort Seçim Ekranı)**:
   - O günkü maçlarda yer alan tüm kortlar + Başhakemin eklediği özel kortlar dinamik olarak listelenir.
   - Her kort butonunda kort adı ve o korttaki maç sayısı yer alır (örn. `KORT 1 • 4 Maç`).
   - Seçilen kortlar parlak neon yeşili (`border-lime-400 bg-lime-400/15`) ve onay işareti (`CheckCircle2`) ile belirginleşir.
   - "Hepsini Seç" ve "Seçimi Temizle" hızlı aksiyonları mevcuttur.
3. **Adım 3 (Göreve Başlama & Filtrelenmiş Ekran)**:
   - Hakem "2 Kort ile Devam Et" butonuna tıklar.
   - Sistem `assignedCourts` veya `activeCourtFilter` durumunu günceller ve tarayıcı oturumuna kaydeder.
   - `CourtSupervisorView` ekranında sadece seçilen kortlar (örn. KORT 1 ve KORT 3) listelenir; diğer kortlar filtrelenir.
4. **Adım 4 (Dinamik Değiştirme)**:
   - Hakem ekranının üstünde kompakt bir bilgi hapı (pill) bulunur:
     `🎯 Aktif Kortlar: KORT 1, KORT 3 • [Değiştir]`
   - Hakem istediğinde tek tıkla bu modalı açıp kort ekleyip çıkarabilir veya "Tüm Kortları Göster"e dönebilir.

---

## 3. Ürün Kararları ve Mimari Tercihler

- **Karar 1: Şifre sonrası ara modal (2 Aşamalı Giriş Akışı)**:
  - *Neden*: Hakemin şifreyi girdikten sonra ayrıca başka bir menüye gidip filtre aramasına gerek kalmaz; akış doğal, kesintisiz ve hatasız olur.
- **Karar 2: Yerel Oturum & Hafıza (State + LocalStorage)**:
  - *Neden*: Hakem sayfası yenilense bile seçtiği kortlar kaybolmaz. Başka bir cihazdan giren başka bir hakem ise kendi kortlarını bağımsız olarak seçer; birbirlerinin ekranını etkilemezler.
- **Karar 3: Boş Seçim Durumu Koruması**:
  - *Neden*: Eğer hakem hiçbir kort seçmezse veya yanlışlıkla hepsini kaldırırsa, sistem otomatik olarak "Tüm Kortlar" moduna döner veya uyarı verir; böylece boş beyaz ekran riski önlenir.

---

## 4. Teknik Mimari ve Durum Yönetimi

### Veri ve Durum Akışı:

```
┌────────────────────────────────────────────────────────┐
│                TennisDataContext                       │
│                                                        │
│  - currentReferee: RefereeUser | null                  │
│  - refereeCourtFilters: Record<string, string[]>       │
│  - activeCourtFilter: string[] | null (null = Tümü)    │
│  - setActiveCourtFilter: (courts: string[]) => void    │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            ▼                                ▼
┌────────────────────────┐      ┌────────────────────────┐
│  RefereeLoginModal     │      │  CourtSupervisorView   │
│  (Step 1: PIN doğrulama│      │  - Filtrelenmiş kortlar│
│   Step 2: Kort seçimi) │      │  - Hızlı kort değiştir │
└────────────────────────┘      └────────────────────────┘
```

1. **Context Seviyesi (`TennisDataContext.tsx`)**:
   - `activeCourtFilter: string[] | null`: Aktif hakemin ekranda görmek istediği kortların dizisi (`null` ise hepsi gösterilir).
   - `setActiveCourtFilter(courts: string[])`: Kort filtresini güncelleyen ve localStorage'a kaydeden fonksiyon.
2. **Giriş Modalı (`RefereeLoginModal.tsx`)**:
   - `step: 'credentials' | 'court_select'` durum kontrolü eklenir.
   - PIN onaylandığında `step = 'court_select'` olur.
   - O günkü tekil kortlar `uniqueCourts` listesinden çekilir.
   - Seçim tamamlanıp "Devam Et" butonuna basıldığında oturum tamamlanır ve modal kapanır.
3. **Gözlemci / Hakem Ekranı (`CourtSupervisorView.tsx`)**:
   - `filteredCourts = uniqueCourts.filter(c => !activeCourtFilter || activeCourtFilter.length === 0 || activeCourtFilter.includes(c))`
   - Ekranın üst kısmına seçili kortları gösteren ve tek tıkla değiştirmeyi sağlayan şık bir filtre başlığı entegre edilir.
