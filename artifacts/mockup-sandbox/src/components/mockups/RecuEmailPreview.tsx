export function RecuEmailPreview() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] px-4 py-8 font-sans text-[#1a1a1a]">
      <div className="mx-auto max-w-[560px] overflow-hidden rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        <header className="bg-[#1B3A6B] px-8 py-7 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#25D366] shadow-inner" />
            <span className="text-[22px] font-bold tracking-[0.3px] text-white">
              DukaCom
            </span>
          </div>
          <p className="mt-2.5 text-[13px] uppercase tracking-[0.5px] text-[#cfe0ff]">
            Reçu Officiel de Paiement d&apos;Abonnement
          </p>
        </header>

        <main className="px-8 py-8">
          <p className="mb-4 text-base">
            Bonjour <strong>Marché de Moroni</strong>,
          </p>
          <p className="mb-6 text-sm leading-[1.6] text-[#444]">
            Nous vous confirmons la bonne réception de votre paiement par MVola
            pour le renouvellement de votre abonnement sur la plateforme{" "}
            <strong>DukaCom</strong>.
          </p>

          <div className="mb-6 overflow-hidden rounded-[10px] border border-[#e3e8ef]">
            <Row label="Montant payé" value="5 000 KMF" shaded valueClassName="font-bold text-[#1B3A6B]" />
            <div className="flex items-center justify-between border-b border-[#e3e8ef] px-[18px] py-3.5 text-sm">
              <span className="text-[13px] text-[#667]">Statut</span>
              <span className="rounded-full bg-[#e7f8ee] px-2.5 py-1 text-xs font-bold text-[#1a9d52]">
                Payé / Validé
              </span>
            </div>
            <Row label="Date de validation" value="24 août 2026" shaded />
            <Row label="Prochaine date d'expiration" value="23 septembre 2026" />
          </div>

          <p className="mb-1 text-sm leading-[1.6] text-[#444]">
            Merci pour votre confiance et votre partenariat.
          </p>
          <p className="mt-5 text-sm leading-[1.5]">
            Cordialement,
            <br />
            <strong>MOHAMED EL-KABIR</strong>
            <br />
            <span className="text-[13px] text-[#667]">
              Directeur de projet &amp; Créateur de DukaCom
            </span>
          </p>
        </main>

        <footer className="border-t border-[#e3e8ef] bg-[#f7f9fc] px-8 py-[18px] text-center">
          <p className="m-0 text-[11px] text-[#98a2b3]">
            © 2026 DukaCom — Annuaire des produits &amp; services professionnels
            aux Comores
          </p>
        </footer>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  shaded = false,
  valueClassName = "",
}: {
  label: string;
  value: string;
  shaded?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b border-[#e3e8ef] px-[18px] py-3.5 text-sm ${
        shaded ? "bg-[#f7f9fc]" : ""
      }`}
    >
      <span className="text-[13px] text-[#667]">{label}</span>
      <span className={`text-right text-sm ${valueClassName}`}>{value}</span>
    </div>
  );
}