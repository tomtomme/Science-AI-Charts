import {
  getFirestore,
  Firestore,
  doc,
  onSnapshot,
  runTransaction,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { firebaseApp, firebaseAuth } from './googleAuthService';
import type { ManualRowMapping } from '../types/integrityMonitor';

export type MonitorKey = 'gdpx' | 'vals' | 'simplebench' | 'integrity' | 'aa';

export interface MonitorPreferencesState {
  ignoredIds: string[];
  manualMappings: Record<string, ManualRowMapping>;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = firebaseAuth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

let hasTestedConnection = false;
async function testConnection(): Promise<void> {
  if (hasTestedConnection) return;
  hasTestedConnection = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function toMonitorKey(label: string): MonitorKey {
  const norm = label.trim().toLowerCase();
  if (norm === 'gdpx') return 'gdpx';
  if (norm === 'vals' || norm === 'vals index') return 'vals';
  if (norm === 'simplebench') return 'simplebench';
  if (norm === 'integrity' || norm === 'integrity-bench') return 'integrity';
  if (norm === 'aa' || norm === 'artificial analysis') return 'aa';
  throw new Error(`Unsupported monitor label: ${label}`);
}

export function sanitizeIgnoredIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const clean = String(item || '').trim();
    if (clean && clean.length <= 160 && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
      if (out.length >= 500) break;
    }
  }
  return out;
}

export function sanitizeManualMappings(raw: unknown): Record<string, ManualRowMapping> {
  const out: Record<string, ManualRowMapping> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [rawKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(rawKey || '').trim();
    if (!key) continue;
    if (value && typeof value === 'object') {
      const rec = value as Partial<ManualRowMapping>;
      if (
        typeof rec.sheetRowNumber === 'number' &&
        Number.isInteger(rec.sheetRowNumber) &&
        rec.sheetRowNumber >= 2
      ) {
        out[key] = {
          sheetRowNumber: rec.sheetRowNumber,
          ...(typeof rec.matchedModelId === 'string' && rec.matchedModelId
            ? { matchedModelId: rec.matchedModelId }
            : {}),
          ...(typeof rec.matchedDisplayName === 'string' && rec.matchedDisplayName
            ? { matchedDisplayName: rec.matchedDisplayName }
            : {}),
        };
        if (Object.keys(out).length >= 500) break;
      }
    }
  }
  return out;
}

export function sanitizeMonitorPreferences(
  prefs: Partial<MonitorPreferencesState> | null | undefined
): MonitorPreferencesState {
  const ignoredIds = sanitizeIgnoredIds(prefs?.ignoredIds);
  const ignoredSet = new Set(ignoredIds);
  const manualMappings = sanitizeManualMappings(prefs?.manualMappings);
  for (const id of ignoredSet) {
    delete manualMappings[id];
  }
  return { ignoredIds, manualMappings };
}

export function prefsSignature(prefs: MonitorPreferencesState): string {
  const clean = sanitizeMonitorPreferences(prefs);
  const sortedIgnored = [...clean.ignoredIds].sort();
  const sortedMappings = Object.keys(clean.manualMappings)
    .sort()
    .map((id) => {
      const m = clean.manualMappings[id];
      return [id, m.sheetRowNumber, m.matchedModelId || '', m.matchedDisplayName || ''];
    });
  return JSON.stringify({ i: sortedIgnored, m: sortedMappings });
}

const LOCAL_UID_KEY = 'science_iq_monitor_prefs_uid';
const LOCAL_IGNORED_PREFIX = 'science_iq_ignored_ids_';
const LOCAL_MAPPINGS_PREFIX = 'science_iq_manual_mappings_';

export function loadLocalMonitorPreferences(
  monitorKey: MonitorKey,
  legacyLabel: string,
  currentUid?: string | null
): MonitorPreferencesState {
  try {
    const storedUid = localStorage.getItem(LOCAL_UID_KEY);
    if (currentUid && storedUid && storedUid !== currentUid) {
      return { ignoredIds: [], manualMappings: {} };
    }

    const ignoredRaw = localStorage.getItem(`${LOCAL_IGNORED_PREFIX}${monitorKey}`);
    const ignoredIds = ignoredRaw ? sanitizeIgnoredIds(JSON.parse(ignoredRaw)) : [];

    const keyMappingsRaw = localStorage.getItem(`${LOCAL_MAPPINGS_PREFIX}${monitorKey}`);
    const legacyMappingsRaw =
      legacyLabel && legacyLabel !== monitorKey
        ? localStorage.getItem(`${LOCAL_MAPPINGS_PREFIX}${legacyLabel}`)
        : null;

    const legacyMappings = legacyMappingsRaw
      ? sanitizeManualMappings(JSON.parse(legacyMappingsRaw))
      : {};
    const keyMappings = keyMappingsRaw
      ? sanitizeManualMappings(JSON.parse(keyMappingsRaw))
      : {};

    return sanitizeMonitorPreferences({
      ignoredIds,
      manualMappings: { ...legacyMappings, ...keyMappings },
    });
  } catch {
    return { ignoredIds: [], manualMappings: {} };
  }
}

export function saveLocalMonitorPreferences(
  monitorKey: MonitorKey,
  legacyLabel: string,
  prefs: MonitorPreferencesState,
  currentUid?: string | null
): void {
  const clean = sanitizeMonitorPreferences(prefs);
  try {
    if (currentUid) {
      localStorage.setItem(LOCAL_UID_KEY, currentUid);
    }

    if (clean.ignoredIds.length === 0) {
      localStorage.removeItem(`${LOCAL_IGNORED_PREFIX}${monitorKey}`);
    } else {
      localStorage.setItem(
        `${LOCAL_IGNORED_PREFIX}${monitorKey}`,
        JSON.stringify(clean.ignoredIds)
      );
    }

    if (Object.keys(clean.manualMappings).length === 0) {
      localStorage.removeItem(`${LOCAL_MAPPINGS_PREFIX}${monitorKey}`);
      if (legacyLabel && legacyLabel !== monitorKey) {
        localStorage.removeItem(`${LOCAL_MAPPINGS_PREFIX}${legacyLabel}`);
      }
    } else {
      const serialized = JSON.stringify(clean.manualMappings);
      localStorage.setItem(`${LOCAL_MAPPINGS_PREFIX}${monitorKey}`, serialized);
      if (legacyLabel && legacyLabel !== monitorKey) {
        localStorage.setItem(`${LOCAL_MAPPINGS_PREFIX}${legacyLabel}`, serialized);
      }
    }
  } catch {
    // ignore storage quota / privacy mode errors
  }
}

function getPrefsDocPath(uid: string, monitorKey: MonitorKey): string {
  return `users/${uid}/monitorPreferences/${monitorKey}`;
}

export function subscribeMonitorPreferences(
  uid: string,
  monitorKey: MonitorKey,
  callbacks: {
    onSnapshotData: (result: { exists: boolean; prefs: MonitorPreferencesState }) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const docPath = getPrefsDocPath(uid, monitorKey);
  const docRef = doc(db, 'users', uid, 'monitorPreferences', monitorKey);

  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callbacks.onSnapshotData({
          exists: false,
          prefs: { ignoredIds: [], manualMappings: {} },
        });
        return;
      }
      const data = snap.data();
      callbacks.onSnapshotData({
        exists: true,
        prefs: sanitizeMonitorPreferences({
          ignoredIds: data?.ignoredIds,
          manualMappings: data?.manualMappings,
        }),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, docPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveMonitorPreferencesToFirestore(
  uid: string,
  monitorKey: MonitorKey,
  prefs: MonitorPreferencesState
): Promise<void> {
  const clean = sanitizeMonitorPreferences(prefs);
  const docPath = getPrefsDocPath(uid, monitorKey);
  const docRef = doc(db, 'users', uid, 'monitorPreferences', monitorKey);
  let opType: OperationType = OperationType.WRITE;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      if (snap.exists()) {
        opType = OperationType.UPDATE;
        tx.update(docRef, {
          ignoredIds: clean.ignoredIds,
          manualMappings: clean.manualMappings,
          updatedAt: serverTimestamp(),
        });
      } else {
        opType = OperationType.CREATE;
        tx.set(docRef, {
          userId: uid,
          monitorKey,
          ignoredIds: clean.ignoredIds,
          manualMappings: clean.manualMappings,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, opType, docPath);
  }
}

export async function seedMonitorPreferencesIfMissing(
  uid: string,
  monitorKey: MonitorKey,
  seedPrefs: MonitorPreferencesState
): Promise<boolean> {
  const clean = sanitizeMonitorPreferences(seedPrefs);
  const docPath = getPrefsDocPath(uid, monitorKey);
  const docRef = doc(db, 'users', uid, 'monitorPreferences', monitorKey);
  let seeded = false;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      if (snap.exists()) {
        return;
      }
      tx.set(docRef, {
        userId: uid,
        monitorKey,
        ignoredIds: clean.ignoredIds,
        manualMappings: clean.manualMappings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      seeded = true;
    });
    return seeded;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}
