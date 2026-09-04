import {  
  doc, getDoc, setDoc, updateDoc, onSnapshot,  
  collection, getDocs, writeBatch, deleteDoc,  
  DocumentSnapshot, QuerySnapshot, DocumentData,  
  FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchItem, RefereeUser } from '../types/tennis';  

const tDoc  = (tid: string) => doc(db, 'tournaments', tid);
const mCol  = (tid: string) => collection(db, 'tournaments', tid, 'matches');
const mDoc  = (tid: string, mid: string) => doc(db, 'tournaments', tid, 'matches', mid);
const superAdminDoc = () => doc(db, 'superAdmin', 'config');  

const localWriteLocks: Record<string, number> = {};

export interface CloudTournamentMetadata {  
  referees?: RefereeUser[];  
  categoryFormats?: Record<string, string>;  
  categoryNoAdSettings?: Record<string, boolean>; 
  deskPin?: string;  
  lastUpdated?: string;  
  updatedBy?: string;  
  tournamentVersion?: number;  
  matches?: MatchItem[];
  tournamentInfo?: { ad: string; yer: string; tarih: string; not: string }; // YENİ: Bulut Hafızası
}  

export interface TournamentListItem {  
  id: string;  
  ad: string;  
  yer: string;  
  tarih: string;  
  not: string;  
  aktif: boolean;  
  olusturulma: string;
}  

export interface SuperAdminConfig {  
  bashakem_listesi: { id: string; ad: string; sifre: string; tournamentId: string }[];  
  superAdminSifre: string;
}  

let isApplyingRemoteChange = false;
export const getIsApplyingRemoteChange = () => isApplyingRemoteChange;  

export const fetchTournamentList = async (): Promise<TournamentListItem[]> => {  
  try {    
    const snap = await getDocs(collection(db, 'tournaments'));    
    return snap.docs      
      .filter(d => d.id !== '__placeholder__')      
      .map(d => {        
        const data = d.data();        
        return {          
          id: d.id,          
          ad: data.ad || data.tournamentInfo?.ad || '',          
          yer: data.yer || data.tournamentInfo?.yer || '',          
          tarih: data.tarih || data.tournamentInfo?.tarih || '',          
          not: data.not || data.tournamentInfo?.not || '',          
          aktif: data.aktif !== false,          
          olusturulma: data.olusturulma || '',        
        };      })      
      .filter(t => t.ad);  
  } catch (e) {    
    console.error('fetchTournamentList hata:', e);    
    return [];  
  }
};  

export const subscribeTournamentList = (  
  onUpdate: (list: TournamentListItem[]) => void
): (() => void) => {  
  return onSnapshot(collection(db, 'tournaments'), (snap) => {    
    const list = snap.docs      
      .filter(d => d.id !== '__placeholder__')      
      .map(d => {        
        const data = d.data();        
        return {          
          id: d.id,          
          ad: data.ad || data.tournamentInfo?.ad || '',          
          yer: data.yer || data.tournamentInfo?.yer || '',          
          tarih: data.tarih || data.tournamentInfo?.tarih || '',          
          not: data.not || data.tournamentInfo?.not || '',          
          aktif: data.aktif !== false,          
          olusturulma: data.olusturulma || '',        
        };      })      
      .filter(t => t.ad);    
    onUpdate(list);  
  });
};  

export const createTournament = async (info: {  
  ad: string; yer: string; tarih: string; not: string;
}): Promise<string | null> => {  
  try {    
    const id = `t_${Date.now()}`;    
    await setDoc(doc(db, 'tournaments', id), {      
      ...info, 
      tournamentInfo: info, // YENİ     
      aktif: true,      
      olusturulma: new Date().toISOString(),      
      version: 1,      
      deskPin: '9999',      
      referees: [],      
      categoryFormats: {},  
      categoryNoAdSettings: {}, 
    });    
    return id;  
  } catch (e) {    
    console.error('createTournament hata:', e);    
    return null;  
  }
};  

export const deleteTournamentFromCloud = async (tid: string): Promise<boolean> => {  
  try {    
    const snap = await getDocs(mCol(tid));    
    const CHUNK = 400;    
    for (let i = 0; i < snap.docs.length; i += CHUNK) {      
      const batch = writeBatch(db);      
      snap.docs.slice(i, i + CHUNK).forEach(d => batch.delete(d.ref));      
      await batch.commit();    
    }    
    await deleteDoc(tDoc(tid));    
    return true;  
  } catch (e) {    
    console.error('deleteTournamentFromCloud hata:', e);    
    return false;  
  }
};  

const DEFAULT_SUPER_ADMIN_CONFIG: SuperAdminConfig = {  
  superAdminSifre: 'admin2025',  
  bashakem_listesi: [],
};  

export const fetchSuperAdminConfig = async (): Promise<SuperAdminConfig | null> => {  
  try {    
    const snap = await getDoc(superAdminDoc());    
    if (!snap.exists()) {      
      await setDoc(superAdminDoc(), DEFAULT_SUPER_ADMIN_CONFIG);      
      console.log('superAdmin/config ilk kez oluşturuldu.');      
      return DEFAULT_SUPER_ADMIN_CONFIG;    
    }    
    return snap.data() as SuperAdminConfig;  
  } catch (e) {    
    console.error('fetchSuperAdminConfig hata:', e);    
    return null;  
  }
};  

export const verifySuperAdmin = async (sifre: string): Promise<boolean> => {  
  try {    
    const cfg = await fetchSuperAdminConfig();    
    if (!cfg) return false;    
    return cfg.superAdminSifre === sifre;  
  } catch { 
    return false; 
  }
};  

export const saveSuperAdminConfig = async (cfg: SuperAdminConfig): Promise<boolean> => {  
  try {    
    await setDoc(superAdminDoc(), cfg, { merge: true });    
    return true;  
  } catch (e) {    
    console.error('saveSuperAdminConfig hata:', e);    
    return false;  
  }
};  

export const subscribeToCloudTournament = (  
  tournamentId: string,  
  onMatchesUpdate: (matches: MatchItem[]) => void,  
  onMetaUpdate: (meta: CloudTournamentMetadata) => void,  
  onError?: (err: Error) => void
): (() => void) => {  
  const unsubMeta = onSnapshot(    
    tDoc(tournamentId),    
    (snap: DocumentSnapshot<DocumentData>) => {      
      if (!snap.exists()) return;      
      const d = snap.data();      
      onMetaUpdate({        
        referees: d.referees,        
        categoryFormats: d.categoryFormats,     
        categoryNoAdSettings: d.categoryNoAdSettings,   
        deskPin: d.deskPin,        
        lastUpdated: d.lastUpdated,        
        updatedBy: d.updatedBy,        
        tournamentVersion: d.version, 
        tournamentInfo: { // YENİ: Buluttan çekerken bilgi güncelle
          ad: d.ad || d.tournamentInfo?.ad || '',
          yer: d.yer || d.tournamentInfo?.yer || '',
          tarih: d.tarih || d.tournamentInfo?.tarih || '',
          not: d.not || d.tournamentInfo?.not || ''
        }     
      });    
    },    
    (err: FirestoreError) => { if (onError) onError(err); }  
  );  

  const unsubMatches = onSnapshot(    
    mCol(tournamentId),    
    { includeMetadataChanges: false }, 
    (snap: QuerySnapshot<DocumentData>) => {      
      isApplyingRemoteChange = true;      
      const fullList: MatchItem[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchItem));
      onMatchesUpdate(fullList);
      setTimeout(() => { isApplyingRemoteChange = false; }, 150);    },    
    (err: FirestoreError) => { if (onError) onError(err); }  
  );  

  return () => { unsubMeta(); unsubMatches(); };
};  

export const pushSingleMatchToCloud = async (  
  match: MatchItem,  
  author = 'Saha Gözlemcisi',  
  _allMatchesList?: MatchItem[],  
  tournamentId = 'main'
): Promise<boolean> => {  
  if (!match || !match.id) return false;  
  try {    
    localWriteLocks[match.id] = Date.now();
    await setDoc(mDoc(tournamentId, match.id), { ...match, Son_Guncelleme: new Date().toISOString() }, { merge: true });    
    updateDoc(tDoc(tournamentId), { lastUpdated: new Date().toISOString(), updatedBy: author }).catch(() => {});    
    return true;  
  } catch (e) { 
    console.error('pushSingleMatchToCloud hata:', e); 
    return false; 
  }
};  

export const pushAllMatchesToCloud = async (  
  matches: MatchItem[], author = 'Saha Gözlemcisi', tournamentId = 'main'
): Promise<boolean> => {  
  if (!Array.isArray(matches)) return false;  
  try {    
    const CHUNK = 400;    
    for (let i = 0; i < matches.length; i += CHUNK) {      
      const batch = writeBatch(db);      
      matches.slice(i, i + CHUNK).forEach(m => {        
        if (!m.id) return;        
        localWriteLocks[m.id] = Date.now();
        batch.set(mDoc(tournamentId, m.id), { ...m, Son_Guncelleme: new Date().toISOString() }, { merge: true });      
      });      
      await batch.commit();    
    }    
    updateDoc(tDoc(tournamentId), { lastUpdated: new Date().toISOString(), updatedBy: author }).catch(() => {});    
    return true;  
  } catch (e) { 
    console.error('pushAllMatchesToCloud hata:', e); 
    return false; 
  }
};  

export const replaceAllMatchesInCloud = pushAllMatchesToCloud;  

export const pushRefereesToCloud = async (referees: RefereeUser[], tournamentId = 'main'): Promise<boolean> => {  
  try { 
    await setDoc(tDoc(tournamentId), { referees }, { merge: true }); 
    return true; 
  } catch (e) { 
    console.error('pushRefereesToCloud:', e); 
    return false; 
  }
};  

export const pushCategoryFormatsToCloud = async (categoryFormats: Record<string, string>, tournamentId = 'main'): Promise<boolean> => {  
  try { 
    await setDoc(tDoc(tournamentId), { categoryFormats }, { merge: true }); 
    return true; 
  } catch (e) { 
    console.error('pushCategoryFormatsToCloud:', e); 
    return false; 
  }
};  

export const pushCategoryNoAdSettingsToCloud = async (categoryNoAdSettings: Record<string, boolean>, tournamentId = 'main'): Promise<boolean> => {  
  try { 
    await setDoc(tDoc(tournamentId), { categoryNoAdSettings }, { merge: true }); 
    return true; 
  } catch (e) { 
    console.error('pushCategoryNoAdSettingsToCloud:', e); 
    return false; 
  }
};  

export const pushDeskPinToCloud = async (deskPin: string, tournamentId = 'main'): Promise<boolean> => {  
  try { 
    await setDoc(tDoc(tournamentId), { deskPin }, { merge: true }); 
    return true; 
  } catch (e) { 
    console.error('pushDeskPinToCloud:', e); 
    return false; 
  }
};  

// YENİ EKLENDİ: Turnuva bilgisini Firebase'e gönderir
export const pushTournamentInfoToCloud = async (info: { ad: string; yer: string; tarih: string; not: string }, tournamentId = 'main'): Promise<boolean> => {  
  try { 
    await setDoc(tDoc(tournamentId), { tournamentInfo: info }, { merge: true }); 
    return true; 
  } catch (e) { 
    console.error('pushTournamentInfoToCloud:', e); 
    return false; 
  }
};  

export const pushFullTournamentToCloud = async (  
  matches: MatchItem[], referees: RefereeUser[],  
  categoryFormats: Record<string, string>, deskPin = '9999', tournamentId = 'main',
  categoryNoAdSettings: Record<string, boolean> = {}
): Promise<void> => {  
  try {    
    await setDoc(tDoc(tournamentId), {      
      referees, categoryFormats, categoryNoAdSettings, deskPin, version: 1,      
      lastUpdated: new Date().toISOString(), updatedBy: 'Sistem Senkronizasyonu',    
    }, { merge: true });    
    await pushAllMatchesToCloud(matches, 'Sistem Senkronizasyonu', tournamentId);  
  } catch (e) { 
    console.error('pushFullTournamentToCloud:', e); 
  }
};  

export const fetchTournamentFromCloud = async (tournamentId = 'main'): Promise<{  
  matches: MatchItem[];  
  referees?: RefereeUser[];  
  categoryFormats?: Record<string, string>;  
  categoryNoAdSettings?: Record<string, boolean>; 
  deskPin?: string;  
  tournamentVersion?: number;
  tournamentInfo?: { ad: string; yer: string; tarih: string; not: string }; // YENİ
} | null> => {  
  try {    
    const [metaSnap, matchSnap] = await Promise.all([      
      getDoc(tDoc(tournamentId)),      
      getDocs(mCol(tournamentId)),    
    ]);    
    const meta = metaSnap.exists() ? metaSnap.data() : {};    
    const matches: MatchItem[] = matchSnap.docs.map(d => ({ id: d.id, ...d.data() } as MatchItem));    
    return { 
      matches, 
      referees: meta.referees, 
      categoryFormats: meta.categoryFormats, 
      categoryNoAdSettings: meta.categoryNoAdSettings, 
      deskPin: meta.deskPin, 
      tournamentVersion: meta.version,
      tournamentInfo: { // YENİ
        ad: meta.ad || meta.tournamentInfo?.ad || '',
        yer: meta.yer || meta.tournamentInfo?.yer || '',
        tarih: meta.tarih || meta.tournamentInfo?.tarih || '',
        not: meta.not || meta.tournamentInfo?.not || ''
      }
    };  
  } catch (e) { 
    console.error('fetchTournamentFromCloud hata:', e); 
    return null; 
  }
};  

export const deleteAllMatchesFromCloud = async (tournamentId = 'main'): Promise<boolean> => {  
  try {    
    const snap = await getDocs(mCol(tournamentId));    
    if (snap.empty) return true;
    
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));    
    console.log(`[${tournamentId}] Tüm maçlar başarıyla silindi (Nükleer)!`);
    return true;  
  } catch (e) { 
    console.error('deleteAllMatchesFromCloud hata:', e); 
    return false; 
  }
};  

export const purgeOrphanMatchesFromCloud = async (  
  activeMatchIds: string[],  
  tournamentId = 'main'
): Promise<number> => {  
  try {    
    const snap = await getDocs(mCol(tournamentId));    
    const activeSet = new Set(activeMatchIds);    
    const orphans = snap.docs.filter(d => !activeSet.has(d.id));  

    if (orphans.length === 0) return 0;  

    await Promise.all(orphans.map(d => deleteDoc(d.ref)));    

    console.log(`purgeOrphanMatchesFromCloud: ${orphans.length} hayalet döküman silindi (${tournamentId})`);    
    return orphans.length;  
  } catch (e) {    
    console.error('purgeOrphanMatchesFromCloud hata:', e);    
    return 0;  
  }
};
