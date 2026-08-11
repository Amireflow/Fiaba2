const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Rend le logo Fiaba (wordmark + icône) depuis les PNG fournis dans /public/logo.
 * - `light=false` (fond clair)  → logo-clair.png
 * - `light=true`  (fond sombre) → logo-sombre.png
 */
export function LogoImage({
  light = false,
  className = "h-9 w-auto",
  alt = "Fiaba",
}: {
  light?: boolean;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={`${basePath}/logo/${light ? "logo-sombre.png" : "logo-clair.png"}`}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}
