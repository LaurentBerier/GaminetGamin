import type { GarmentId } from "@/types/product";

interface GarmentMockupProps {
  alt: string;
  color: string;
  designImage: string;
  garment: GarmentId;
  priority?: boolean;
}

export function GarmentMockup({
  alt,
  color,
  designImage,
  garment,
  priority = false,
}: GarmentMockupProps) {
  return (
    <div
      className={`garment-mockup garment-mockup--${garment}`}
      style={{ "--garment-color": color } as React.CSSProperties}
      data-garment={garment}
    >
      <div className="garment-mockup__shadow" aria-hidden="true" />
      {garment === "hoodie" && (
        <span className="garment-mockup__hood" aria-hidden="true" />
      )}
      <div className="garment-mockup__shape" aria-hidden="true">
        <span className="garment-mockup__neck" />
        {garment === "hoodie" && <span className="garment-mockup__pocket" />}
      </div>
      <img
        src={designImage}
        alt={alt}
        className="garment-mockup__art"
        width="734"
        height="1100"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </div>
  );
}
