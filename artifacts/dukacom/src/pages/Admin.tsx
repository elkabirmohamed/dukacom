import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllUsers,
  getAllEntreprises,
  getPendingTransactions,
  getConfig,
  updateConfig,
  validateTransaction,
  refuseTransaction,
  UserDoc,
  EntrepriseDoc,
  TransactionDoc,
  ConfigDoc,
  Timestamp,
  daysUntilExpiration
} from "@/lib/firestore-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Store, Activity, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { sendRecuPaiementEmail } from "@/lib/email";

export default function Admin() {
  const { userDoc, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserDoc[]>([]);
  const [entreprises, setEntreprises] = useState<EntrepriseDoc[]>([]);
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [config, setConfig] = useState<ConfigDoc | null>(null);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Config form state
  const [mvolaNumber, setMvolaNumber] = useState("");
  const [abonnementPrix, setAbonnementPrix] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!userDoc || (userDoc.role !== "admin" && !userDoc.isAdmin)) {
        setLocation("/");
        return;
      }
      
      try {
        const [u, e, t, c] = await Promise.all([
          getAllUsers(),
          getAllEntreprises(),
          getPendingTransactions(),
          getConfig()
        ]);
        
        setUsers(u);
        setEntreprises(e);
        setTransactions(t);
        setConfig(c);
        
        setMvolaNumber(c.mvola_number);
        setAbonnementPrix(c.abonnement_mensuel_kmf.toString());
      } catch (err) {
        console.error(err);
        toast({ title: "Erreur", description: "Impossible de charger les données administrateur.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    }
    
    if (!loading) loadData();
  }, [userDoc, loading, setLocation, toast]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await updateConfig({
        mvola_number: mvolaNumber,
        abonnement_mensuel_kmf: parseInt(abonnementPrix, 10)
      });
      toast({ title: "Succès", description: "Configuration mise à jour." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Échec de la mise à jour.", variant: "destructive" });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleValidateTx = async (txId: string, entId: string) => {
    if (!confirm("Valider cette transaction et activer l'entreprise pour 30 jours ?")) return;
    try {
      await validateTransaction(txId, entId);

      const now = new Date();
      const expiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      setTransactions(prev => prev.filter(t => t.id_transaction !== txId));
      
      // Update local entreprises state
      setEntreprises(prev => prev.map(e => {
        if (e.id_entreprise === entId) {
          return {
            ...e,
            statut_abonnement: "actif",
            date_expiration_abonnement: Timestamp.fromMillis(expiration.getTime())
          };
        }
        return e;
      }));
      
      toast({ title: "Validé", description: "Abonnement activé avec succès." });

      // Envoi du reçu officiel par e-mail au commerçant (non bloquant)
      const ent = entreprises.find(e => e.id_entreprise === entId);
      if (ent?.email_contact) {
        sendRecuPaiementEmail({
          toEmail: ent.email_contact,
          nomEntreprise: ent.nom_entreprise,
          montantKmf: config?.abonnement_mensuel_kmf ?? 5000,
          dateValidation: now,
          dateExpiration: expiration,
        }).then(sent => {
          if (sent) {
            toast({ title: "Reçu envoyé", description: `Un e-mail de confirmation a été envoyé à ${ent.email_contact}.` });
          } else {
            toast({ title: "Reçu non envoyé", description: `L'abonnement est actif, mais l'e-mail de confirmation n'a pas pu être envoyé à ${ent.email_contact}.`, variant: "destructive" });
          }
        });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Échec de la validation.", variant: "destructive" });
    }
  };

  const handleRefuseTx = async (txId: string) => {
    if (!confirm("Refuser définitivement cette transaction ?")) return;
    try {
      await refuseTransaction(txId);
      setTransactions(transactions.filter(t => t.id_transaction !== txId));
      toast({ title: "Refusé", description: "Transaction refusée." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Échec de l'opération.", variant: "destructive" });
    }
  };

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeEnt = entreprises.filter(e => e.statut_abonnement === "actif").length;
  const suspendedEnt = entreprises.length - activeEnt;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
          <Activity className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="text-muted-foreground">Espace de gestion DukaCom</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Users className="w-10 h-10 text-blue-500 opacity-80" />
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Utilisateurs</p>
              <h2 className="text-3xl font-bold">{users.length}</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Store className="w-10 h-10 text-green-500 opacity-80" />
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Entreprises</p>
              <h2 className="text-3xl font-bold">{entreprises.length}</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Activity className="w-10 h-10 text-orange-500 opacity-80" />
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Statuts</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-green-600 bg-green-50">{activeEnt} Actives</Badge>
                <Badge variant="outline" className="text-red-600 bg-red-50">{suspendedEnt} Suspendues</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full bg-white rounded-xl shadow-sm border p-1">
        <TabsList className="w-full flex justify-start p-1 bg-muted/50 overflow-x-auto h-auto">
          <TabsTrigger value="transactions" className="py-2 px-4 data-[state=active]:bg-background">
            Transactions ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="entreprises" className="py-2 px-4 data-[state=active]:bg-background">
            Entreprises
          </TabsTrigger>
          <TabsTrigger value="config" className="py-2 px-4 data-[state=active]:bg-background">
            Configuration
          </TabsTrigger>
          <TabsTrigger value="messagerie" className="py-2 px-4 data-[state=active]:bg-background">
            Messagerie
          </TabsTrigger>
        </TabsList>
        
        <div className="p-6">
          <TabsContent value="transactions" className="m-0 space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Validation des paiements MVola</h3>
            </div>
            
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg bg-gray-50/50">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                <p>Aucune transaction en attente.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Réf MVola</TableHead>
                      <TableHead>Reçu</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => {
                      const ent = entreprises.find(e => e.id_entreprise === tx.id_entreprise_fk);
                      const date = tx.date_soumission?.toDate().toLocaleDateString('fr-FR');
                      
                      return (
                        <TableRow key={tx.id_transaction}>
                          <TableCell className="font-medium whitespace-nowrap">{date}</TableCell>
                          <TableCell>{ent?.nom_entreprise || 'Inconnue'}</TableCell>
                          <TableCell className="font-mono">{tx.reference_mvola}</TableCell>
                          <TableCell>
                            <a href={tx.recu_file_url} target="_blank" rel="noreferrer" className="flex items-center text-primary hover:underline text-sm font-medium">
                              Voir le reçu <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleValidateTx(tx.id_transaction!, tx.id_entreprise_fk)}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Valider
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRefuseTx(tx.id_transaction!)}>
                                <XCircle className="w-4 h-4 mr-1" /> Refuser
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="entreprises" className="m-0 space-y-4 animate-in fade-in">
            <h3 className="text-lg font-semibold">Liste des entreprises</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expiration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entreprises.map(e => {
                    const isExp = e.statut_abonnement === "suspendu";
                    const expDate = e.date_expiration_abonnement?.toDate();
                    const daysLeft = daysUntilExpiration(e.date_expiration_abonnement);
                    
                    return (
                      <TableRow key={e.id_entreprise}>
                        <TableCell className="font-medium">{e.nom_entreprise}</TableCell>
                        <TableCell>{e.ville}</TableCell>
                        <TableCell className="text-sm">{e.email_contact || e.whatsapp_num}</TableCell>
                        <TableCell>
                          <Badge variant={isExp ? "destructive" : "default"} className={!isExp ? "bg-green-500" : ""}>
                            {e.statut_abonnement}
                          </Badge>
                        </TableCell>
                        <TableCell className={daysLeft < 5 && !isExp ? "text-orange-600 font-bold" : ""}>
                          {expDate?.toLocaleDateString('fr-FR')} 
                          {!isExp && <span className="text-xs ml-2 opacity-70">({daysLeft}j)</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="config" className="m-0 animate-in fade-in">
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Paramètres Globaux</CardTitle>
                <CardDescription>Configuration du service de paiement et facturation</CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveConfig}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mvola">Numéro MVola de réception</Label>
                    <Input id="mvola" required value={mvolaNumber} onChange={e => setMvolaNumber(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Sera affiché aux entreprises lors du renouvellement.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prix">Prix abonnement mensuel (KMF)</Label>
                    <Input id="prix" type="number" required value={abonnementPrix} onChange={e => setAbonnementPrix(e.target.value)} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isSavingConfig}>
                    {isSavingConfig && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enregistrer les modifications
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="messagerie" className="m-0 animate-in fade-in">
            <h3 className="text-lg font-semibold mb-4">Emails des entreprises</h3>
            <div className="flex flex-wrap gap-2">
              {entreprises.filter(e => e.email_contact).map(e => (
                <Button key={e.id_entreprise} variant="outline" asChild size="sm">
                  <a href={`mailto:${e.email_contact}`}>
                    {e.nom_entreprise} ({e.email_contact})
                  </a>
                </Button>
              ))}
            </div>
            
            <h3 className="text-lg font-semibold mt-8 mb-4">Emails de tous les utilisateurs</h3>
            <div className="flex flex-wrap gap-2">
              {users.map(u => (
                <Button key={u.uid} variant="secondary" asChild size="sm">
                  <a href={`mailto:${u.email}`}>
                    {u.nom}
                  </a>
                </Button>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
