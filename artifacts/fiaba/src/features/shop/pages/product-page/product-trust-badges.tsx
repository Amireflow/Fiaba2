import { ShieldKeyIcon, DeliveryTruck01Icon, Wallet01Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';

export function ProductTrustBadges({ isDigital }: { isDigital: boolean }) {
  return (
    <div className="mt-5 grid grid-cols-3 gap-2">
      <Badge icon={ShieldKeyIcon} bg="bg-[#e7faf2]" color="text-[#278e69]" label="Paiement sécurisé" />
      <Badge icon={isDigital ? SparklesIcon : DeliveryTruck01Icon} bg="bg-[#efedff]" color="text-[#5b49e8]" label={isDigital ? 'Instantané' : 'Livraison rapide'} />
      <Badge icon={Wallet01Icon} bg="bg-[#fff4de]" color="text-[#ac741e]" label="Wave & Orange" />
    </div>
  );
}

function Badge({ icon, bg, color, label }: { icon: any; bg: string; color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3.5 text-center">
      <span className={`grid h-8 w-8 place-items-center rounded-xl ${bg} ${color}`}>
        <Icon glyph={icon} size={16} />
      </span>
      <p className="text-[10px] font-bold text-[#292541]">{label}</p>
    </div>
  );
}
