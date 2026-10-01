import Image from "next/image";

/** Exibe o ícone do Warcraft Logs quando o relatório fornece um identificador válido. */
export function AbilityIcon({ icon }: { icon?: string }) {
  if (!icon) return null;

  return (
    <Image
      alt=""
      aria-hidden="true"
      className="ability-icon"
      height={24}
      src={`https://assets.rpglogs.com/img/warcraft/abilities/${icon}`}
      unoptimized
      width={24}
    />
  );
}
