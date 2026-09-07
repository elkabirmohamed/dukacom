import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserDoc {
  uid: string;
  email: string;
  nom: string;
  name?: string; // alias utilisé sur certains documents admin
  role: "visiteur" | "vendeur" | "admin";
  isAdmin?: boolean; // legacy — préférer role === "admin"
}

export interface EntrepriseDoc {
  id_entreprise?: string;
  uid_proprietaire: string;
  nom_entreprise: string;
  description: string;
  logo_url: string;
  whatsapp_num: string;
  ville: string;
  adresse?: string;
  date_inscription: Timestamp;
  date_expiration_abonnement: Timestamp;
  statut_abonnement: "actif" | "suspendu";
  categorie?: string;
  email_contact?: string;
}

export interface ProduitDoc {
  id_produit?: string;
  id_entreprise_fk: string;
  titre: string;
  description: string;
  prix_kmf: number;
  image_url: string;
  categorie?: string;
  date_creation: Timestamp;
}

export interface TransactionDoc {
  id_transaction?: string;
  id_entreprise_fk: string;
  reference_mvola: string;
  recu_file_url: string;
  date_soumission: Timestamp;
  statut_validation: "en_attente" | "valide" | "refuse";
}

export interface ConfigDoc {
  mvola_number: string;
  abonnement_mensuel_kmf: number;
  duree_essai_jours: number;
  duree_abonnement_jours: number;
}

function toTimestamp(value: unknown, fallback: Timestamp): Timestamp {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return Timestamp.fromMillis(value.toMillis());
  }

  return fallback;
}

/**
 * Les entreprises créées avec le formulaire actuel utilisent les champs
 * anglais (name, telephone, userId, ...), tandis que les écrans historiques
 * utilisent les champs français. On normalise la lecture pour supporter les
 * deux formats sans devoir migrer les documents existants.
 */
function normalizeEntreprise(data: DocumentData, id: string): EntrepriseDoc {
  const now = Timestamp.now();
  const dateInscription = toTimestamp(
    data.date_inscription ?? data.trialStartDate,
    now,
  );
  const dateExpiration = toTimestamp(
    data.date_expiration_abonnement ?? data.trialEndDate,
    Timestamp.fromMillis(now.toMillis() + 60 * 24 * 60 * 60 * 1000),
  );
  const isActive =
    data.statut_abonnement === "actif" ||
    (data.statut_abonnement == null &&
      data.status === "active" &&
      data.isActive !== false);

  return {
    ...data,
    id_entreprise: id,
    uid_proprietaire: data.uid_proprietaire ?? data.userId ?? "",
    nom_entreprise: data.nom_entreprise ?? data.name ?? "Entreprise",
    description: data.description ?? "",
    logo_url: data.logo_url ?? data.logo ?? "",
    whatsapp_num: data.whatsapp_num ?? data.telephone ?? "",
    ville: data.ville ?? "",
    adresse: data.adresse ?? data.localisation ?? "",
    date_inscription: dateInscription,
    date_expiration_abonnement: dateExpiration,
    statut_abonnement: isActive ? "actif" : "suspendu",
    categorie: data.categorie ?? "",
    email_contact: data.email_contact ?? data.email ?? "",
  } as EntrepriseDoc;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function createUserDoc(
  uid: string,
  data: Omit<UserDoc, "uid">
): Promise<void> {
  await setDoc(doc(db, "users", uid), { uid, ...data });
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function updateUserRole(uid: string, role: "visiteur" | "vendeur"): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

export async function getAllUsers(): Promise<UserDoc[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as UserDoc);
}

// ─── Entreprises ─────────────────────────────────────────────────────────────

export async function createEntreprise(data: Omit<EntrepriseDoc, "id_entreprise">): Promise<string> {
  const ref = await addDoc(collection(db, "entreprises"), data);
  await updateDoc(ref, { id_entreprise: ref.id });
  return ref.id;
}

export async function getEntreprise(id: string): Promise<EntrepriseDoc | null> {
  const snap = await getDoc(doc(db, "entreprises", id));
  if (!snap.exists()) return null;
  return normalizeEntreprise(snap.data(), snap.id);
}

export async function getEntrepriseByOwner(uid: string): Promise<EntrepriseDoc | null> {
  // Le formulaire actuel écrit userId. Le second champ conserve la compatibilité
  // avec les entreprises créées avant la mise à jour du schéma.
  for (const field of ["userId", "uid_proprietaire"]) {
    try {
      const q = query(collection(db, "entreprises"), where(field, "==", uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return normalizeEntreprise(d.data(), d.id);
      }
    } catch (error) {
      // Certaines anciennes règles ne permettaient pas encore de requêter
      // userId. Dans ce cas, tenter le format historique avant de remonter
      // l'erreur réelle au dashboard.
      if (field !== "userId" || (error as { code?: string })?.code !== "permission-denied") {
        throw error;
      }
    }
  }
  return null;
}

export async function updateEntreprise(id: string, data: Partial<EntrepriseDoc>): Promise<void> {
  await updateDoc(doc(db, "entreprises", id), data as DocumentData);
}

export async function getAllEntreprises(): Promise<EntrepriseDoc[]> {
  const snap = await getDocs(collection(db, "entreprises"));
  return snap.docs.map((d) => normalizeEntreprise(d.data(), d.id));
}

export async function checkAndSuspendExpired(): Promise<void> {
  const now = Timestamp.now();
  const q = query(
    collection(db, "entreprises"),
    where("statut_abonnement", "==", "actif"),
    where("date_expiration_abonnement", "<", now)
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await updateDoc(d.ref, { statut_abonnement: "suspendu" });
  }
}

// ─── Produits ─────────────────────────────────────────────────────────────────

export async function createProduit(data: Omit<ProduitDoc, "id_produit">): Promise<string> {
  const ref = await addDoc(collection(db, "produits"), data);
  await updateDoc(ref, { id_produit: ref.id });
  return ref.id;
}

export async function updateProduit(id: string, data: Partial<ProduitDoc>): Promise<void> {
  await updateDoc(doc(db, "produits", id), data as DocumentData);
}

export async function deleteProduit(id: string): Promise<void> {
  await deleteDoc(doc(db, "produits", id));
}

export async function getProduitsForEntreprise(id_entreprise: string): Promise<ProduitDoc[]> {
  // Le couple where + orderBy sur deux champs nécessite un index composite.
  // Le tri côté client évite de bloquer le dashboard lorsqu'il n'est pas
  // encore créé dans Firebase Console.
  const q = query(collection(db, "produits"), where("id_entreprise_fk", "==", id_entreprise));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...d.data(), id_produit: d.id } as ProduitDoc))
    .sort((a, b) => {
      const aMs = a.date_creation?.toMillis?.() ?? 0;
      const bMs = b.date_creation?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
}

export async function getActiveProducts(constraints: QueryConstraint[] = []): Promise<ProduitDoc[]> {
  const q = query(collection(db, "produits"), ...constraints, orderBy("date_creation", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id_produit: d.id } as ProduitDoc));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(data: Omit<TransactionDoc, "id_transaction">): Promise<string> {
  const ref = await addDoc(collection(db, "transactions"), data);
  await updateDoc(ref, { id_transaction: ref.id });
  return ref.id;
}

export async function getPendingTransactions(): Promise<TransactionDoc[]> {
  // Tri côté client pour éviter d'exiger un index composite Firestore
  const q = query(
    collection(db, "transactions"),
    where("statut_validation", "==", "en_attente")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...d.data(), id_transaction: d.id } as TransactionDoc))
    .sort((a, b) => {
      const aMs = a.date_soumission?.toMillis?.() ?? 0;
      const bMs = b.date_soumission?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
}

export async function validateTransaction(
  transactionId: string,
  entrepriseId: string
): Promise<void> {
  const now = Timestamp.now();
  const expiration = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);

  await updateDoc(doc(db, "transactions", transactionId), {
    statut_validation: "valide",
  });

  await updateDoc(doc(db, "entreprises", entrepriseId), {
    statut_abonnement: "actif",
    date_expiration_abonnement: expiration,
  });
}

export async function refuseTransaction(transactionId: string): Promise<void> {
  await updateDoc(doc(db, "transactions", transactionId), {
    statut_validation: "refuse",
  });
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<ConfigDoc> {
  const snap = await getDoc(doc(db, "config", "global"));
  if (snap.exists()) return snap.data() as ConfigDoc;
  // Default config
  return {
    mvola_number: import.meta.env.VITE_MVOLA_NUMBER || "492 13 77",
    abonnement_mensuel_kmf: 5000,
    duree_essai_jours: 60,
    duree_abonnement_jours: 30,
  };
}

export async function updateConfig(data: Partial<ConfigDoc>): Promise<void> {
  await setDoc(doc(db, "config", "global"), data, { merge: true });
}

// ─── Utils ────────────────────────────────────────────────────────────────────

export function daysUntilExpiration(expiration: Timestamp): number {
  const now = Date.now();
  const exp = expiration.toMillis();
  const diff = exp - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export { serverTimestamp, Timestamp };
