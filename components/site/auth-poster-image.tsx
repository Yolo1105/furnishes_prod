import Image from "next/image";

/**
 * Full-bleed poster for auth split layouts. Uses `next/image` for optimized
 * formats (AVIF/WebP) and sizing vs a raw CSS background.
 */
export function AuthPosterImage({
  src,
  alt,
  priority = false,
}: {
  /** Public path under `/images/` (see `content/site/auth-posters.ts`). */
  src: string;
  alt: string;
  /** First-paint hero — set on /login and /signup */
  priority?: boolean;
}) {
  return (
    <div className="absolute inset-x-0 -top-px bottom-0 min-h-[calc(100%+2px)] overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(min-width: 768px) 55vw, 0px"
        className="object-cover object-top"
      />
    </div>
  );
}
